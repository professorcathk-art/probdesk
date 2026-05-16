-- Self-described gender for profiles (shown only after mutual acceptance; optional until publish gates).
alter table public.profiles
  add column if not exists gender text;

alter table public.profiles drop constraint if exists profiles_gender_chk;

alter table public.profiles
  add constraint profiles_gender_chk check (
    gender is null
    or gender in ('woman', 'man', 'non_binary', 'prefer_not_say', 'other')
  );

comment on column public.profiles.gender is 'woman | man | non_binary | prefer_not_say | other — optional in DB; required by app before first publish / explore visibility.';
