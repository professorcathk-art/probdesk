-- Loosen discovery when the corpus is small: optional skip of exact location match (still requires candidate location set).
drop function if exists public.match_intents(vector(1536), text, float, int, uuid);

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
  similarity float
)
language sql
stable
as $$
  select
    ir.id as intent_id,
    ir.user_id as owner_user_id,
    ir.natural_language_input,
    ir.extracted_persona,
    ir.location_filter,
    (ir.embedding <=> target_embedding)::float as distance,
    (1 - (ir.embedding <=> target_embedding))::float as similarity
  from public.intent_requests ir
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

grant execute on function public.match_intents(vector(1536), text, float, int, uuid, boolean) to authenticated;
