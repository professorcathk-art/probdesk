-- System broadcast when a match becomes Accepted (welcomes both sides to the thread).

alter table public.messages add column if not exists is_system boolean not null default false;

alter table public.messages alter column sender_id drop not null;

comment on column public.messages.is_system is 'Vennode-generated row (e.g. connection notice). Not insertable by clients via RLS.';

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  coalesce(is_system, false) = false
  and auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

create or replace function public.broadcast_match_connected_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'Accepted'
     and old.status is distinct from 'Accepted'
  then
    if not exists (
      select 1
      from public.messages msg
      where msg.match_id = new.id
        and msg.is_system = true
        and msg.content = 'VENNODE_SYSTEM_CONNECTED'
    ) then
      insert into public.messages (match_id, sender_id, content, is_system)
      values (new.id, new.sender_id, 'VENNODE_SYSTEM_CONNECTED', true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_matches_broadcast_connected on public.matches;
create trigger trg_matches_broadcast_connected
  after update on public.matches
  for each row
  execute function public.broadcast_match_connected_message();
