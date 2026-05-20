-- Fleet-wide discovery diagnostics (SECURITY DEFINER: pairing code runs as the member, so plain
-- selects under RLS cannot count other users). Used only to enrich pairing_score_events meta when the pool is empty.

create or replace function public.discovery_eligibility_counts(p_exclude_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'users_total_excluding_anchor',
      (select count(*)::int from public.users u where u.id <> p_exclude_user_id),
    'users_onboarding_complete_excluding_anchor',
      (select count(*)::int from public.users u
       where u.onboarding_status = 'complete' and u.id <> p_exclude_user_id),
    'distinct_users_with_active_embedded_intent_excluding_anchor',
      (select count(distinct ir.user_id)::int from public.intent_requests ir
       where ir.status = 'active'
         and ir.user_id <> p_exclude_user_id
         and coalesce(ir.demand_embedding, ir.embedding) is not null),
    'profiles_with_supply_embedding_excluding_anchor',
      (select count(*)::int from public.profiles pr
       where pr.supply_embedding is not null and pr.user_id <> p_exclude_user_id)
  );
$$;

grant execute on function public.discovery_eligibility_counts(uuid) to authenticated;
