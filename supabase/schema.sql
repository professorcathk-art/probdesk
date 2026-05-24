-- Vennode (vennode.com) — pgvector, split embeddings (demand vs supply), match_profiles RPC
-- Run in Supabase SQL Editor or via migration tooling.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- Mirrors auth.users lifecycle; synced via trigger below.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  onboarding_status text not null default 'pending'
    check (onboarding_status in ('pending', 'in_progress', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  location text,
  industry text,
  display_name text,
  avatar_url text,
  bio text,
  preferred_contact_channel text,
  preferred_contact_detail text,
  gender text,
  skills_tags text[] not null default '{}'::text[],
  superpower text,
  languages text[] not null default '{}'::text[],
  social_link text,
  updated_at timestamptz not null default now(),
  daily_credits integer not null default 5,
  last_credit_reset timestamptz not null default now(),
  match_quality_alert_sent boolean not null default false,
  embedding vector(1536),
  supply_embedding vector(1536)
);

create index if not exists profiles_embedding_ivfflat
  on public.profiles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.profiles add column if not exists embedding vector(1536);

alter table public.profiles drop constraint if exists profiles_gender_chk;
alter table public.profiles
  add constraint profiles_gender_chk check (
    gender is null
    or gender in ('woman', 'man', 'non_binary', 'prefer_not_say', 'other')
  );

alter table public.profiles add column if not exists age_group text;

alter table public.profiles add column if not exists attraction_orientation text;
alter table public.profiles drop constraint if exists profiles_attraction_orientation_chk;
alter table public.profiles
  add constraint profiles_attraction_orientation_chk check (
    attraction_orientation is null
    or attraction_orientation in ('heterosexual', 'gay', 'lesbian', 'bisexual', 'other')
  );

create table if not exists public.intent_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  natural_language_input text not null,
  extracted_persona jsonb default '{}'::jsonb,
  location_filter text,
  status text not null default 'active'
    check (status in ('active', 'paused')),
  is_marketplace_public boolean not null default false,
  is_demo_listing boolean not null default false,
  embedding vector(1536),
  demand_embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enrichment jsonb default '{}'::jsonb,
  must_haves text
);

alter table public.intent_requests add column if not exists matching_signals jsonb;

create index if not exists intent_requests_user_id_idx on public.intent_requests (user_id);
create index if not exists intent_requests_status_marketplace_idx
  on public.intent_requests (status, is_marketplace_public)
  where is_marketplace_public = true and status = 'active';

-- IVFFLAT index for cosine similarity (create after you have enough rows for lists parameter tuning)
-- Increase maintenance_work_mem for ivfflat builds (default 32MB is often too low).
set maintenance_work_mem = '256MB';

create index if not exists intent_requests_embedding_ivfflat
  on public.intent_requests using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.intent_requests add column if not exists demand_embedding vector(1536);

-- No IVFFLAT on demand_embedding by default: tiny cohorts + IVFFLAT can yield false-empty KNN (see migration 069).

alter table public.profiles add column if not exists supply_embedding vector(1536);

-- No IVFFLAT on supply_embedding by default: small membership uses sequential scan (see migration 068).
-- Add HNSW or IVFFLAT after you have enough embedded profiles to justify approximate search.

create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  intent_request_id uuid references public.intent_requests (id) on delete set null,
  match_score numeric(5, 2),
  status text not null default 'Pending'
    check (status in ('Pending', 'Pending_System', 'Accepted', 'Rejected')),
  introductory_context text,
  compatibility_reason text,
  ai_context_sender jsonb,
  counterparty_intent_id uuid references public.intent_requests (id) on delete set null,
  sender_context_intent_id uuid references public.intent_requests (id) on delete set null,
  system_ack_sender boolean not null default false,
  system_ack_receiver boolean not null default false,
  sender_discloses_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_sender_receiver_diff check (sender_id <> receiver_id)
);

create index if not exists matches_receiver_status_idx on public.matches (receiver_id, status);
create index if not exists matches_sender_status_idx on public.matches (sender_id, status);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  is_system boolean not null default false
);

create index if not exists messages_match_id_idx on public.messages (match_id);

create table if not exists public.match_message_reads (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists match_message_reads_user_idx on public.match_message_reads (user_id);

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

-- -----------------------------------------------------------------------------
-- Sync auth.users -> public.users
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, onboarding_status)
  values (new.id, new.email, 'pending')
  on conflict (id) do update set email = excluded.email;
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- RPC: Phase 14 — `target_embedding` is the sender's **demand** vector; ranked against `profiles.supply_embedding` only.
-- Cosine distance (<=>): lower is more similar. p_threshold is MAX distance allowed.
-- similarity = 1 - distance (higher is closer).
-- -----------------------------------------------------------------------------
create or replace function public.match_profiles(
  target_embedding vector(1536),
  p_location text,
  p_threshold float default 0.55,
  p_limit int default 20,
  p_exclude_user_id uuid default null,
  p_require_location_match boolean default true
)
returns table (
  user_id uuid,
  display_name text,
  bio text,
  gender text,
  age_group text,
  skills_tags text[],
  languages text[],
  location text,
  industry text,
  superpower text,
  linked_intent_id uuid,
  linked_natural_language_input text,
  distance float,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.user_id,
    pr.display_name,
    pr.bio,
    pr.gender,
    pr.age_group,
    pr.skills_tags,
    pr.languages,
    coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) as location,
    pr.industry,
    pr.superpower,
    li.id as linked_intent_id,
    li.natural_language_input as linked_natural_language_input,
    (pr.supply_embedding <=> target_embedding)::float as distance,
    (1 - (pr.supply_embedding <=> target_embedding))::float as similarity
  from public.profiles pr
  inner join public.users u on u.id = pr.user_id
  left join lateral (
    select ir.id, ir.natural_language_input, ir.location_filter
    from public.intent_requests ir
    where ir.user_id = pr.user_id
      and ir.status = 'active'
    order by ir.updated_at desc nulls last, ir.created_at desc
    limit 1
  ) li on true
  where pr.supply_embedding is not null
    and (
      not coalesce(p_require_location_match, true)
      or (
        coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) is not null
        and length(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) > 0
        and lower(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) =
          lower(trim(p_location))
      )
    )
    and (p_exclude_user_id is null or pr.user_id <> p_exclude_user_id)
    and (pr.supply_embedding <=> target_embedding) <= p_threshold
  order by pr.supply_embedding <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

-- -----------------------------------------------------------------------------
-- RPC: Fallback — anchor demand vs each peer's latest active intent demand (pre–Phase 14 semantics).
-- -----------------------------------------------------------------------------
create or replace function public.match_intents_cross_demand(
  target_embedding vector(1536),
  p_location text,
  p_threshold float default 0.55,
  p_limit int default 20,
  p_exclude_user_id uuid default null,
  p_require_location_match boolean default true
)
returns table (
  user_id uuid,
  display_name text,
  bio text,
  gender text,
  age_group text,
  skills_tags text[],
  languages text[],
  location text,
  industry text,
  superpower text,
  linked_intent_id uuid,
  linked_natural_language_input text,
  distance float,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.user_id,
    pr.display_name,
    pr.bio,
    pr.gender,
    pr.age_group,
    pr.skills_tags,
    pr.languages,
    coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) as location,
    pr.industry,
    pr.superpower,
    li.id as linked_intent_id,
    li.natural_language_input as linked_natural_language_input,
    (li.cand_vec <=> target_embedding)::float as distance,
    (1 - (li.cand_vec <=> target_embedding))::float as similarity
  from public.profiles pr
  inner join public.users u on u.id = pr.user_id
  inner join lateral (
    select
      ir.id,
      ir.natural_language_input,
      ir.location_filter,
      coalesce(ir.demand_embedding, ir.embedding) as cand_vec
    from public.intent_requests ir
    where ir.user_id = pr.user_id
      and ir.status = 'active'
      and coalesce(ir.demand_embedding, ir.embedding) is not null
    order by ir.updated_at desc nulls last, ir.created_at desc
    limit 1
  ) li on true
  where (
      not coalesce(p_require_location_match, true)
      or (
        coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) is not null
        and length(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) > 0
        and lower(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) =
          lower(trim(p_location))
      )
    )
    and (p_exclude_user_id is null or pr.user_id <> p_exclude_user_id)
    and (li.cand_vec <=> target_embedding) <= p_threshold
  order by li.cand_vec <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

-- -----------------------------------------------------------------------------
-- Discovery diagnostics (see migrations 071–073; match_profiles onboarding gate removed in 074).
-- -----------------------------------------------------------------------------
create or replace function public.discovery_eligibility_counts(p_exclude_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'users_total_excluding_anchor',
      (select count(*)::int from public.users u where u.id <> p_exclude_user_id),
    'users_onboarding_complete_excluding_anchor',
      (select count(*)::int from public.users u
       where u.onboarding_status = 'complete' and u.id <> p_exclude_user_id),
    'users_discoverable_onboarding_excluding_anchor',
      (select count(*)::int from public.users u
       where u.id <> p_exclude_user_id
         and (
           u.onboarding_status in ('complete', 'in_progress')
           or exists (
             select 1 from public.intent_requests irx
             where irx.user_id = u.id
               and irx.status = 'active'
               and coalesce(irx.demand_embedding, irx.embedding) is not null
           )
         )),
    'users_pending_with_embedded_intent_excluding_anchor',
      (select count(distinct ir.user_id)::int from public.intent_requests ir
       inner join public.users u on u.id = ir.user_id
       where ir.user_id <> p_exclude_user_id
         and ir.status = 'active'
         and coalesce(ir.demand_embedding, ir.embedding) is not null
         and u.onboarding_status = 'pending'),
    'distinct_users_with_active_embedded_intent_excluding_anchor',
      (select count(distinct ir.user_id)::int from public.intent_requests ir
       where ir.status = 'active'
         and ir.user_id <> p_exclude_user_id
         and coalesce(ir.demand_embedding, ir.embedding) is not null),
    'profiles_with_supply_embedding_excluding_anchor',
      (select count(*)::int from public.profiles pr
       where pr.supply_embedding is not null and pr.user_id <> p_exclude_user_id)
  );
$$;

-- -----------------------------------------------------------------------------
-- Explore marketplace: blended feed (Phase 22) — viewer supply_embedding vs listing demand only.
-- Avoids viewer demand-vs-listing demand (parallel-demands trap). ✨ when sim > 0.75 for supply-vs-demand only.
-- -----------------------------------------------------------------------------
drop function if exists public.get_blended_explore_intents(vector(1536), vector(1536), int);
drop function if exists public.get_blended_explore_intents(vector(1536), int);

create or replace function public.get_blended_explore_intents(
  p_supply_embedding vector(1536) default null,
  p_limit int default 60
)
returns table (
  id uuid,
  natural_language_input text,
  location_filter text,
  extracted_persona jsonb,
  user_id uuid,
  is_demo_listing boolean,
  must_haves text,
  is_recommended boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      ir.id,
      ir.natural_language_input,
      ir.location_filter,
      ir.extracted_persona,
      ir.user_id,
      ir.is_demo_listing,
      ir.must_haves,
      ir.created_at,
      coalesce(ir.demand_embedding, ir.embedding) as cand_vec
    from public.intent_requests ir
    where ir.is_marketplace_public = true
      and ir.status = 'active'
  ),
  scored as (
    select
      b.*,
      case
        when p_supply_embedding is not null and b.cand_vec is not null then
          (1::double precision - (b.cand_vec <=> p_supply_embedding)::double precision)::float
        else null::float
      end as similarity
    from base b
  )
  select
    s.id,
    s.natural_language_input,
    s.location_filter,
    s.extracted_persona,
    s.user_id,
    s.is_demo_listing,
    s.must_haves,
    (s.similarity is not null and s.similarity > 0.75) as is_recommended
  from scored s
  order by
    case when s.similarity is not null then 0 else 1 end asc,
    s.similarity desc nulls last,
    s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.intent_requests enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.match_message_reads enable row level security;

-- users: own row
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select using (auth.uid() = id);
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update using (auth.uid() = id);
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert with check (auth.uid() = id);

-- profiles: own row; peer profiles only after mutual acceptance
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = user_id);

-- Profiles mutually visible after acceptance (double-blind: Pending uses ai_context_sender only)
drop policy if exists profiles_select_accepted_peer on public.profiles;
create policy profiles_select_accepted_peer on public.profiles for select using (
  exists (
    select 1 from public.matches m
    where m.status = 'Accepted'
      and (
        (m.sender_id = auth.uid() and m.receiver_id = profiles.user_id)
        or (m.receiver_id = auth.uid() and m.sender_id = profiles.user_id)
      )
  )
);

drop policy if exists profiles_select_pending_sender_disclosure on public.profiles;
create policy profiles_select_pending_sender_disclosure on public.profiles for select using (
  exists (
    select 1 from public.matches m
    where m.status = 'Pending'
      and coalesce(m.sender_discloses_profile, false) = true
      and m.sender_id = profiles.user_id
      and m.receiver_id = auth.uid()
  )
);

-- intent_requests: owner CRUD
drop policy if exists intent_owner_select on public.intent_requests;
create policy intent_owner_select on public.intent_requests for select using (auth.uid() = user_id);
drop policy if exists intent_owner_insert on public.intent_requests;
create policy intent_owner_insert on public.intent_requests for insert with check (auth.uid() = user_id);
drop policy if exists intent_owner_update on public.intent_requests;
create policy intent_owner_update on public.intent_requests for update using (auth.uid() = user_id);
drop policy if exists intent_owner_delete on public.intent_requests;
create policy intent_owner_delete on public.intent_requests for delete using (auth.uid() = user_id);

-- Participants may read intents linked to a Pending_System match
drop policy if exists intent_select_via_system_match on public.intent_requests;
create policy intent_select_via_system_match on public.intent_requests for select using (
  exists (
    select 1 from public.matches m
    where m.status = 'Pending_System'
      and (m.intent_request_id = intent_requests.id or m.counterparty_intent_id = intent_requests.id)
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

-- Public marketplace: readable intents (anon + authenticated)
drop policy if exists intent_marketplace_read on public.intent_requests;
create policy intent_marketplace_read on public.intent_requests for select using (
  is_marketplace_public = true and status = 'active'
);

-- Deep-link shares (/explore/[id]): owner-shared URLs work without marketplace toggle.
drop policy if exists intent_share_deep_link_read on public.intent_requests;
create policy intent_share_deep_link_read on public.intent_requests for select using (
  status in ('active', 'paused')
);

-- matches: participants only
drop policy if exists matches_select_participant on public.matches;
create policy matches_select_participant on public.matches for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
drop policy if exists matches_insert_sender on public.matches;
create policy matches_insert_sender on public.matches for insert with check (auth.uid() = sender_id);
drop policy if exists matches_update_participant on public.matches;
create policy matches_update_participant on public.matches for update using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);

-- Auto-insert a system welcome line when a match first becomes Accepted.
create or replace function public.broadcast_match_connected_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'Accepted'
     and old.status is distinct from 'Accepted'
  then
    if not exists (
      select 1
      from public.messages msg
      where msg.match_id = new.id
        and msg.is_system = true
        and msg.content = 'VENNODE_SYSTEM_CONNECTED'
    ) then
      insert into public.messages (match_id, sender_id, content, is_system)
      values (new.id, new.sender_id, 'VENNODE_SYSTEM_CONNECTED', true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_matches_broadcast_connected on public.matches;
create trigger trg_matches_broadcast_connected
  after update on public.matches
  for each row
  execute function public.broadcast_match_connected_message();

-- Messages only when match is Accepted
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  coalesce(is_system, false) = false
  and auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

drop policy if exists match_message_reads_select_own on public.match_message_reads;
create policy match_message_reads_select_own on public.match_message_reads for select using (auth.uid() = user_id);

drop policy if exists match_message_reads_insert_own on public.match_message_reads;
create policy match_message_reads_insert_own on public.match_message_reads for insert with check (auth.uid() = user_id);

drop policy if exists match_message_reads_update_own on public.match_message_reads;
create policy match_message_reads_update_own on public.match_message_reads for update using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Grants (authenticated + anon for marketplace read via RLS)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.intent_requests to authenticated;
grant select on public.intent_requests to anon;
grant select, insert, update on public.matches to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update on public.match_message_reads to authenticated;
grant execute on function public.match_profiles(vector(1536), text, float, int, uuid, boolean) to authenticated;
grant execute on function public.match_intents_cross_demand(vector(1536), text, float, int, uuid, boolean)
  to authenticated;
grant execute on function public.discovery_eligibility_counts(uuid) to authenticated;
grant execute on function public.get_blended_explore_intents(vector(1536), int)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage (avatars) — see migrations/045_phase3_avatars_storage.sql for policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
