-- Allow /explore/[id] deep links for any active/paused intent (share button), not only marketplace-public rows.
drop policy if exists intent_share_deep_link_read on public.intent_requests;
create policy intent_share_deep_link_read on public.intent_requests for select using (
  status in ('active', 'paused')
);

-- Debug log for pairing / vibe scores (service_role only).
create table if not exists public.pairing_score_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  actor_user_id uuid references public.users (id) on delete set null,
  anchor_intent_id uuid references public.intent_requests (id) on delete set null,
  candidate_intent_id uuid references public.intent_requests (id) on delete set null,
  candidate_user_id uuid references public.users (id) on delete set null,
  similarity numeric,
  rpc_threshold numeric,
  rank_after_sort int,
  selected_top boolean,
  match_score numeric,
  compatibility_reason text,
  excluded_reason text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists pairing_score_events_created_at_idx on public.pairing_score_events (created_at desc);
create index if not exists pairing_score_events_anchor_idx on public.pairing_score_events (anchor_intent_id);

alter table public.pairing_score_events enable row level security;

grant select, insert, update, delete on public.pairing_score_events to service_role;
