-- Phase 20b: Explore personalization —
-- similarity = greatest(
--   supply_vs_listing_demand(p_supply_embedding),
--   viewer_intent_demands_vs_listing_demand(p_viewer_demand_embedding)
-- ) when both exist; continuous sort by similarity; ✨ badge when best > 0.75.

drop function if exists public.get_blended_explore_intents(vector(1536), int);

create or replace function public.get_blended_explore_intents(
  p_supply_embedding vector(1536) default null,
  p_viewer_demand_embedding vector(1536) default null,
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
      end as sim_supply,
      case
        when p_viewer_demand_embedding is not null and b.cand_vec is not null then
          (1::double precision - (b.cand_vec <=> p_viewer_demand_embedding)::double precision)::float
        else null::float
      end as sim_viewer_demands
    from base b
  ),
  blended as (
    select
      s.*,
      case
        when s.sim_supply is not null and s.sim_viewer_demands is not null then
          greatest(s.sim_supply, s.sim_viewer_demands)::float
        when s.sim_supply is not null then s.sim_supply
        when s.sim_viewer_demands is not null then s.sim_viewer_demands
        else null::float
      end as similarity
    from scored s
  )
  select
    b.id,
    b.natural_language_input,
    b.location_filter,
    b.extracted_persona,
    b.user_id,
    b.is_demo_listing,
    b.must_haves,
    (b.similarity is not null and b.similarity > 0.75) as is_recommended
  from blended b
  order by
    case when b.similarity is not null then 0 else 1 end asc,
    b.similarity desc nulls last,
    b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

comment on function public.get_blended_explore_intents(vector(1536), vector(1536), int) is
  'Explore feed: cosine vs viewer supply and vs viewer latest active intent demand; '
  'sort all listings with embeddings by descending best similarity; remainder chronological; ✨ if > 0.75';

grant execute on function public.get_blended_explore_intents(vector(1536), vector(1536), int) to anon, authenticated;
