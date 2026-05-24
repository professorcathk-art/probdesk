-- Phase 25.1: concise orientation labels — reduce allowed slugs + migrate legacy values.
alter table public.profiles drop constraint if exists profiles_attraction_orientation_chk;

update public.profiles
set attraction_orientation = 'gay'
where attraction_orientation = 'gay_man';

update public.profiles
set attraction_orientation = null
where attraction_orientation in ('prefer_not_say', 'questioning');

update public.profiles
set attraction_orientation = 'other'
where attraction_orientation in ('pansexual', 'asexual', 'queer');

-- Drop any unrecognized legacy value so the new constraint can attach cleanly.
update public.profiles
set attraction_orientation = null
where attraction_orientation is not null
  and attraction_orientation not in ('heterosexual', 'gay', 'lesbian', 'bisexual', 'other');

alter table public.profiles
  add constraint profiles_attraction_orientation_chk check (
    attraction_orientation is null
    or attraction_orientation in ('heterosexual', 'gay', 'lesbian', 'bisexual', 'other')
  );

comment on column public.profiles.attraction_orientation is
  'Optional: self-reported sexual/relationship orientation (simplified slug set); null = not disclosed.';
