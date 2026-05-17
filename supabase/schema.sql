-- Vennode (vennode.com) — Supabase setup: pgvector, tables, RLS, match_intents RPC
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
  intent_level text,
  superpower text,
  languages text[] not null default '{}'::text[],
  social_link text,
  updated_at timestamptz not null default now(),
  daily_credits integer not null default 5,
  last_credit_reset timestamptz not null default now(),
  match_quality_alert_sent boolean not null default false
);

alter table public.profiles drop constraint if exists profiles_gender_chk;
alter table public.profiles
  add constraint profiles_gender_chk check (
    gender is null
    or gender in ('woman', 'man', 'non_binary', 'prefer_not_say', 'other')
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enrichment jsonb default '{}'::jsonb
);

create index if not exists intent_requests_user_id_idx on public.intent_requests (user_id);
create index if not exists intent_requests_status_marketplace_idx
  on public.intent_requests (status, is_marketplace_public)
  where is_marketplace_public = true and status = 'active';

-- IVFFLAT index for cosine similarity (create after you have enough rows for lists parameter tuning)
create index if not exists intent_requests_embedding_ivfflat
  on public.intent_requests using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

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
  sender_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_match_id_idx on public.messages (match_id);

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
-- RPC: semantic match by embedding + exact location + similarity threshold
-- Cosine distance (<=>): lower is more similar. threshold is max distance (e.g. 0.35).
-- -----------------------------------------------------------------------------
create or replace function public.match_intents(
  target_embedding vector(1536),
  p_location text,
  p_threshold float default 0.5,
  p_limit int default 20,
  p_exclude_user_id uuid default null
)
returns table (
  intent_id uuid,
  owner_user_id uuid,
  natural_language_input text,
  extracted_persona jsonb,
  location_filter text,
  distance float,
  similarity float
)
language sql
stable
as $$
  select
    ir.id as intent_id,
    ir.user_id as owner_user_id,
    ir.natural_language_input,
    ir.extracted_persona,
    ir.location_filter,
    (ir.embedding <=> target_embedding)::float as distance,
    (1 - (ir.embedding <=> target_embedding))::float as similarity
  from public.intent_requests ir
  where ir.status = 'active'
    and ir.embedding is not null
    and ir.location_filter is not null
    and lower(trim(ir.location_filter)) = lower(trim(p_location))
    and (p_exclude_user_id is null or ir.user_id <> p_exclude_user_id)
    and (ir.embedding <=> target_embedding) <= p_threshold
  order by ir.embedding <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.intent_requests enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

-- users: own row
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select using (auth.uid() = id);
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update using (auth.uid() = id);

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
  auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

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
grant execute on function public.match_intents(vector, text, float, int, uuid) to authenticated;

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
