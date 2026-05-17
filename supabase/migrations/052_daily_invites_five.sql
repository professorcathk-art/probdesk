-- Raise daily outbound invite quota from 3 to 5 (UTC midnight reset).

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
    set daily_credits = 5, last_credit_reset = now(), updated_at = now()
    where user_id = p_user_id;
    v_credits := 5;
  end if;

  return jsonb_build_object('ok', true, 'credits_remaining', v_credits);
end;
$$;

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
    set daily_credits = 5, last_credit_reset = now(), updated_at = now()
    where user_id = p_user_id;
    v_credits := 5;
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
  set daily_credits = least(5, daily_credits + 1), updated_at = now()
  where user_id = p_user_id;
end;
$$;

alter table public.profiles alter column daily_credits set default 5;

comment on column public.profiles.daily_credits is 'Remaining outbound invites for the current UTC day (reset to 5 at UTC midnight).';
