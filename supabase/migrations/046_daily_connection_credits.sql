-- Phase 6: daily outbound connection credits (UTC calendar day).
-- Run in Supabase SQL Editor or via migration tooling.

alter table public.profiles
  add column if not exists daily_credits integer not null default 3
    check (daily_credits >= 0 and daily_credits <= 100),
  add column if not exists last_credit_reset timestamptz not null default now();

comment on column public.profiles.daily_credits is 'Remaining outbound invites for the current UTC day.';
comment on column public.profiles.last_credit_reset is 'Anchor for UTC midnight reset of daily_credits.';

-- -----------------------------------------------------------------------------
-- Credit helpers (SECURITY DEFINER: bypass RLS; auth.uid() must match p_user_id)
-- -----------------------------------------------------------------------------

create or replace function public.get_connection_credits_remaining(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits int;
  v_last timestamptz;
  v_today_utc date := (timezone('UTC', now()))::date;
  v_last_utc date;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  select daily_credits, last_credit_reset into v_credits, v_last
  from profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND');
  end if;

  v_last_utc := (timezone('UTC', v_last))::date;

  if v_last_utc < v_today_utc then
    update profiles
    set daily_credits = 3, last_credit_reset = now(), updated_at = now()
    where user_id = p_user_id;
    v_credits := 3;
  end if;

  return jsonb_build_object('ok', true, 'credits_remaining', v_credits);
end;
$$;

revoke all on function public.get_connection_credits_remaining(uuid) from public;
grant execute on function public.get_connection_credits_remaining(uuid) to authenticated;

create or replace function public.consume_connection_credit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits int;
  v_last timestamptz;
  v_today_utc date := (timezone('UTC', now()))::date;
  v_last_utc date;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  select daily_credits, last_credit_reset into v_credits, v_last
  from profiles
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND');
  end if;

  v_last_utc := (timezone('UTC', v_last))::date;

  if v_last_utc < v_today_utc then
    update profiles
    set daily_credits = 3, last_credit_reset = now(), updated_at = now()
    where user_id = p_user_id;
    v_credits := 3;
  end if;

  if v_credits <= 0 then
    return jsonb_build_object('ok', false, 'error', 'OUT_OF_CREDITS');
  end if;

  update profiles
  set daily_credits = v_credits - 1, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('ok', true, 'credits_remaining', v_credits - 1);
end;
$$;

revoke all on function public.consume_connection_credit(uuid) from public;
grant execute on function public.consume_connection_credit(uuid) to authenticated;

create or replace function public.refund_connection_credit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  update profiles
  set daily_credits = least(3, daily_credits + 1), updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.refund_connection_credit(uuid) from public;
grant execute on function public.refund_connection_credit(uuid) to authenticated;
