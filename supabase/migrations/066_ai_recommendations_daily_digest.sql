-- Phase 15: AI recommendations queue + daily digest email logs.
-- candidate_profile_id references profiles.user_id (profiles PK).

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.intent_requests (id) on delete cascade,
  candidate_profile_id uuid not null references public.profiles (user_id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  reason text,
  email_sent boolean not null default false,
  dismissed_at timestamptz,
  source text not null default 'sync_top3'
    check (source in ('sync_top3', 'background_supply')),
  created_at timestamptz not null default now(),
  unique (intent_id, candidate_profile_id)
);

create index if not exists ai_recommendations_intent_id_idx on public.ai_recommendations (intent_id);
create index if not exists ai_recommendations_pending_email_idx
  on public.ai_recommendations (email_sent, dismissed_at)
  where email_sent = false and dismissed_at is null;

create table if not exists public.admin_email_logs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default ((now() at time zone 'utc'))::date,
  total_emails_sent integer not null default 0 check (total_emails_sent >= 0),
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists admin_email_logs_run_date_idx on public.admin_email_logs (run_date desc);

-- Inverse retrieval: supply profile embedding vs others' demand intents (no LLM — embedding score only).
create or replace function public.match_active_intents_for_supply(
  p_supply_user_id uuid,
  p_min_score int default 80,
  p_limit int default 200
)
returns table (
  intent_id uuid,
  intent_owner_id uuid,
  score int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ir.id as intent_id,
    ir.user_id as intent_owner_id,
    greatest(
      0,
      least(
        100,
        round(((1 - (ir.demand_embedding <=> pr.supply_embedding)) * 100)::numeric)::int
      )
    ) as score
  from public.profiles pr
  inner join public.intent_requests ir
    on ir.user_id <> pr.user_id
    and ir.status = 'active'
    and ir.demand_embedding is not null
  where pr.user_id = p_supply_user_id
    and pr.supply_embedding is not null
    and ((1 - (ir.demand_embedding <=> pr.supply_embedding)) * 100) >= p_min_score::float
  order by ir.demand_embedding <=> pr.supply_embedding asc
  limit greatest(1, least(p_limit, 500));
$$;

revoke all on function public.match_active_intents_for_supply(uuid, int, int) from public;
grant execute on function public.match_active_intents_for_supply(uuid, int, int) to service_role;

alter table public.ai_recommendations enable row level security;
alter table public.admin_email_logs enable row level security;

-- Authenticated: intent owners manage their rows.
create policy ai_recommendations_select_own_intent
  on public.ai_recommendations for select
  using (
    exists (
      select 1 from public.intent_requests ir
      where ir.id = ai_recommendations.intent_id
        and ir.user_id = (select auth.uid())
    )
  );

create policy ai_recommendations_insert_own_intent
  on public.ai_recommendations for insert
  with check (
    exists (
      select 1 from public.intent_requests ir
      where ir.id = ai_recommendations.intent_id
        and ir.user_id = (select auth.uid())
    )
    and candidate_profile_id <> (select auth.uid())
  );

create policy ai_recommendations_update_own_intent
  on public.ai_recommendations for update
  using (
    exists (
      select 1 from public.intent_requests ir
      where ir.id = ai_recommendations.intent_id
        and ir.user_id = (select auth.uid())
    )
  );

revoke all on public.admin_email_logs from anon, authenticated;
revoke all on public.ai_recommendations from anon;

grant select, insert, update, delete on public.ai_recommendations to service_role;
grant select, insert, delete on public.admin_email_logs to service_role;

grant select, insert, update on public.ai_recommendations to authenticated;
