-- Phase 22: Explore feed — viewer supply_embedding vs listing demand ONLY.
-- Removes parallel-demand trap (viewer demand vs card demand) and drops 3-arg RPC.

drop function if exists public.get_blended_explore_intents(vector(1536), vector(1536), int);

create or replace function public.get_blended_explore_intents(
  p_supply_embedding vector(1536) default null,
  p_limit int default 60
)
returns table (
  id uuid,
  natural_language_input text,
  location_filter text,
  extracted_persona jsonb,
  user_id uuid,
  is_demo_listing boolean,
  must_haves text,
  is_recommended boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      ir.id,
      ir.natural_language_input,
      ir.location_filter,
      ir.extracted_persona,
      ir.user_id,
      ir.is_demo_listing,
      ir.must_haves,
      ir.created_at,
      coalesce(ir.demand_embedding, ir.embedding) as cand_vec
    from public.intent_requests ir
    where ir.is_marketplace_public = true
      and ir.status = 'active'
  ),
  scored as (
    select
      b.*,
      case
        when p_supply_embedding is not null and b.cand_vec is not null then
          (1::double precision - (b.cand_vec <=> p_supply_embedding)::double precision)::float
        else null::float
      end as similarity
    from base b
  )
  select
    s.id,
    s.natural_language_input,
    s.location_filter,
    s.extracted_persona,
    s.user_id,
    s.is_demo_listing,
    s.must_haves,
    (s.similarity is not null and s.similarity > 0.75) as is_recommended
  from scored s
  order by
    case when s.similarity is not null then 0 else 1 end asc,
    s.similarity desc nulls last,
    s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

comment on function public.get_blended_explore_intents(vector(1536), int) is
  'Phase 22: listing demand vs viewer supply_embedding only; ✨ if similarity > 0.75; no viewer-demand branch.';

grant execute on function public.get_blended_explore_intents(vector(1536), int) to anon, authenticated;
