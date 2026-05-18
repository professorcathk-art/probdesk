-- Remove profiles.intent_level ("matching cadence" / 交流步調); recreate RPCs without intent_level preview columns.

drop function if exists public.match_intents(vector(1536), text, float, int, uuid, boolean);

create or replace function public.match_intents(
  target_embedding vector(1536),
  p_location text,
  p_threshold float default 0.5,
  p_limit int default 20,
  p_exclude_user_id uuid default null,
  p_require_location_match boolean default true
)
returns table (
  intent_id uuid,
  owner_user_id uuid,
  natural_language_input text,
  extracted_persona jsonb,
  location_filter text,
  distance float,
  similarity float,
  peer_display_name text,
  peer_bio text,
  peer_gender text,
  peer_age_group text,
  peer_skills_tags text[],
  peer_languages text[],
  peer_industry text,
  peer_superpower text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ir.id as intent_id,
    ir.user_id as owner_user_id,
    ir.natural_language_input,
    ir.extracted_persona,
    ir.location_filter,
    (ir.embedding <=> target_embedding)::float as distance,
    (1 - (ir.embedding <=> target_embedding))::float as similarity,
    p.display_name as peer_display_name,
    p.bio as peer_bio,
    p.gender as peer_gender,
    p.age_group as peer_age_group,
    p.skills_tags as peer_skills_tags,
    p.languages as peer_languages,
    p.industry as peer_industry,
    p.superpower as peer_superpower
  from public.intent_requests ir
  left join public.profiles p on p.user_id = ir.user_id
  where ir.status = 'active'
    and ir.embedding is not null
    and ir.location_filter is not null
    and (
      not coalesce(p_require_location_match, true)
      or lower(trim(ir.location_filter)) = lower(trim(p_location))
    )
    and (p_exclude_user_id is null or ir.user_id <> p_exclude_user_id)
    and (ir.embedding <=> target_embedding) <= p_threshold
  order by ir.embedding <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

drop function if exists public.match_profiles(vector(1536), text, float, int, uuid, boolean);

create or replace function public.match_profiles(
  target_embedding vector(1536),
  p_location text,
  p_threshold float default 0.5,
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
    pr.location,
    pr.industry,
    pr.superpower,
    (pr.embedding <=> target_embedding)::float as distance,
    (1 - (pr.embedding <=> target_embedding))::float as similarity
  from public.profiles pr
  inner join public.users u on u.id = pr.user_id
  where pr.embedding is not null
    and pr.location is not null
    and length(trim(pr.location)) > 0
    and u.onboarding_status = 'complete'
    and (
      not coalesce(p_require_location_match, true)
      or lower(trim(pr.location)) = lower(trim(p_location))
    )
    and (p_exclude_user_id is null or pr.user_id <> p_exclude_user_id)
    and (pr.embedding <=> target_embedding) <= p_threshold
  order by pr.embedding <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.match_intents(vector(1536), text, float, int, uuid, boolean) to authenticated;
grant execute on function public.match_profiles(vector(1536), text, float, int, uuid, boolean) to authenticated;

alter table public.profiles drop column if exists intent_level;
