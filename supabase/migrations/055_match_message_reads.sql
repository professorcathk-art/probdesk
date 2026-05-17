-- Per-user read cursor per match thread (for messenger unread badges)

create table if not exists public.match_message_reads (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists match_message_reads_user_idx on public.match_message_reads (user_id);

comment on table public.match_message_reads is 'Tracks when each participant last read a match thread (for unread indicators).';

alter table public.match_message_reads enable row level security;

drop policy if exists match_message_reads_select_own on public.match_message_reads;
create policy match_message_reads_select_own on public.match_message_reads for select using (auth.uid() = user_id);

drop policy if exists match_message_reads_insert_own on public.match_message_reads;
create policy match_message_reads_insert_own on public.match_message_reads for insert with check (auth.uid() = user_id);

drop policy if exists match_message_reads_update_own on public.match_message_reads;
create policy match_message_reads_update_own on public.match_message_reads for update using (auth.uid() = user_id);

grant select, insert, update on public.match_message_reads to authenticated;
