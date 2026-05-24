-- Optional self-reported attraction orientation for smarter romantic-context matching (never required for publish).
alter table public.profiles
  add column if not exists attraction_orientation text;

alter table public.profiles drop constraint if exists profiles_attraction_orientation_chk;

alter table public.profiles
  add constraint profiles_attraction_orientation_chk check (
    attraction_orientation is null
    or attraction_orientation in (
      'heterosexual',
      'gay_man',
      'lesbian',
      'bisexual',
      'pansexual',
      'asexual',
      'queer',
      'questioning',
      'other',
      'prefer_not_say'
    )
  );

comment on column public.profiles.attraction_orientation is
  'Optional: self-reported romantic/attraction orientation for AI matching guardrails; null = not provided.';
