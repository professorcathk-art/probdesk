-- Finer age bands: replace 25–34, 35–44, 45–54 with five-year brackets.
-- Anyone who still had the old combined slugs must pick a new band in Profile (we clear those rows).

update public.profiles
set age_group = null
where age_group in ('25_34', '35_44', '45_54');

alter table public.profiles drop constraint if exists profiles_age_group_chk;

alter table public.profiles
  add constraint profiles_age_group_chk check (
    age_group is null
    or age_group in (
      '18_24',
      '25_29',
      '30_34',
      '35_39',
      '40_44',
      '45_49',
      '50_54',
      '55_64',
      '65_plus'
    )
  );

comment on column public.profiles.age_group is 'Self-selected age band for discovery context (not exact DOB).';
