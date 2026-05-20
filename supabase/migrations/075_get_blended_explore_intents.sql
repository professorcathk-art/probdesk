-- Phase 20: blended Explore feed — rank by cosine similarity vs viewer supply_embedding when present,
-- then chronological for the tail. Matches existing convention: similarity = 1 - (demand_vec <=> supply_vec).

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
        when p_supply_embedding is not null and b.cand_vec is not null
          then (
            (1::double precision - (b.cand_vec <=> p_supply_embedding)::double precision)
          )::float
        else null::float
      end as similarity,
      case
        when p_supply_embedding is not null
          and b.cand_vec is not null
          and (
            (1::double precision - (b.cand_vec <=> p_supply_embedding)::double precision)
          )::float > 0.75
        then true
        else false
      end as is_recommended
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
    s.is_recommended
  from scored s
  order by
    case when s.is_recommended then 0 else 1 end asc,
    case when s.is_recommended then s.similarity end desc nulls last,
    s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

comment on function public.get_blended_explore_intents(vector(1536), int) is
  'Explore marketplace listing order: similarity > 0.75 vs p_supply_embedding first (demand/coalesce embedding), '
  'then remainder by created_at desc. Omit or null embedding for pure chronological listing.';

grant execute on function public.get_blended_explore_intents(vector(1536), int) to anon, authenticated;
