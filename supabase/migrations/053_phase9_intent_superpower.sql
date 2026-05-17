-- Phase 9: universal matching fields — intent_level, superpower; drop available_time

alter table public.profiles rename column current_status to intent_level;

update public.profiles
set intent_level = case intent_level
  when 'exploring' then 'casual_open'
  when 'ready_to_build' then 'intentional_seeking'
  when 'fully_committed' then 'focused_commit'
  else intent_level
end
where intent_level in ('exploring', 'ready_to_build', 'fully_committed');

alter table public.profiles drop column if exists available_time;

alter table public.profiles add column if not exists superpower text;

comment on column public.profiles.intent_level is 'Matching cadence: casual_open | intentional_seeking | focused_commit (app-enforced).';
comment on column public.profiles.superpower is 'Short value-offer line for matching (max 150 chars app-enforced).';
