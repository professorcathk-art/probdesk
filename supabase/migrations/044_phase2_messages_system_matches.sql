-- Phase 2: messages table (rename from match_messages), Pending_System matches, intent visibility for system matches.

-- -----------------------------------------------------------------------------
-- Messaging: rename match_messages -> messages, body -> content
-- -----------------------------------------------------------------------------
drop policy if exists match_messages_select on public.match_messages;
drop policy if exists match_messages_insert on public.match_messages;

do $$
begin
  if to_regclass('public.match_messages') is not null then
    alter table public.match_messages rename to messages;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'body'
  ) then
    alter table public.messages rename column body to content;
  end if;
end $$;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'Accepted'
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);

grant select, insert on public.messages to authenticated;

-- -----------------------------------------------------------------------------
-- Matches: Pending_System + mutual ack + counterparty intent for admin pairing
-- -----------------------------------------------------------------------------
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in ('Pending', 'Pending_System', 'Accepted', 'Rejected'));

alter table public.matches add column if not exists counterparty_intent_id uuid references public.intent_requests (id) on delete set null;
alter table public.matches add column if not exists system_ack_sender boolean not null default false;
alter table public.matches add column if not exists system_ack_receiver boolean not null default false;

create index if not exists matches_status_pending_system_idx on public.matches (status)
  where status = 'Pending_System';

-- Participants may read intent rows tied to a Pending_System match they are in.
drop policy if exists intent_select_via_system_match on public.intent_requests;
create policy intent_select_via_system_match on public.intent_requests for select using (
  exists (
    select 1 from public.matches m
    where m.status = 'Pending_System'
      and (m.intent_request_id = intent_requests.id or m.counterparty_intent_id = intent_requests.id)
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
  )
);
