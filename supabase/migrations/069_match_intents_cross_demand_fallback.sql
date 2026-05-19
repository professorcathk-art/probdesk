-- When Phase 14 supply_embedding rows are missing or retrieval returns nothing, fall back to
-- demand↔demand matching (anchor intent vs each peer's latest active intent), matching pre-split behavior.

drop index if exists public.intent_requests_demand_embedding_ivfflat;

drop function if exists public.match_intents_cross_demand(vector(1536), text, float, int, uuid, boolean);

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
  where u.onboarding_status = 'complete'
    and coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')) is not null
    and length(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) > 0
    and (
      not coalesce(p_require_location_match, true)
      or lower(trim(coalesce(nullif(trim(pr.location), ''), nullif(trim(li.location_filter), '')))) =
        lower(trim(p_location))
    )
    and (p_exclude_user_id is null or pr.user_id <> p_exclude_user_id)
    and (li.cand_vec <=> target_embedding) <= p_threshold
  order by li.cand_vec <=> target_embedding asc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.match_intents_cross_demand(vector(1536), text, float, int, uuid, boolean)
  to authenticated;
