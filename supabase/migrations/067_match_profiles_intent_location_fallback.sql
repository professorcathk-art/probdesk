-- Discovery: candidates missing profiles.location but having an active intent location_filter
-- were invisible to match_profiles. Fall back to latest active intent's location_filter for
-- eligibility + display; location equality still uses case-insensitive trim.

drop function if exists public.match_profiles(vector(1536), text, float, int, uuid, boolean);

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
    and coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) is not null
    and length(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) > 0
    and u.onboarding_status = 'complete'
    and (
      not coalesce(p_require_location_match, true)
      or lower(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) = lower(trim(p_location))
    )
    and (p_exclude_user_id is null or pr.user_id <> p_exclude_user_id)
    and (pr.supply_embedding <=> target_embedding) <= p_threshold
  order by pr.supply_embedding <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.match_profiles(vector(1536), text, float, int, uuid, boolean) to authenticated;
