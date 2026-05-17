-- Phase 8 — Profile enrichment for hybrid matching + optional sender disclosure on pending invites.
-- Run in Supabase SQL Editor or via CLI migrations.

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists skills_tags text[] not null default '{}'::text[],
  add column if not exists current_status text,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists social_link text;

comment on column public.profiles.skills_tags is 'Skill / hobby / trait tags for matching enrichment.';
comment on column public.profiles.current_status is 'Readiness: exploring | ready_to_build | fully_committed (app-enforced).';
comment on column public.profiles.languages is 'Spoken languages tags.';
comment on column public.profiles.social_link is 'Optional LinkedIn/Twitter/site — shown only after mutual acceptance.';

-- -----------------------------------------------------------------------------
-- matches
-- -----------------------------------------------------------------------------
alter table public.matches
  add column if not exists sender_discloses_profile boolean not null default false;

comment on column public.matches.sender_discloses_profile is 'If true, receiver may read sender profile row while status is Pending.';

-- -----------------------------------------------------------------------------
-- RLS: receiver can see sender profile on Pending invite when disclosure opted in
-- -----------------------------------------------------------------------------
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
