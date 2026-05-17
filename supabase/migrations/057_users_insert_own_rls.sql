-- Let authenticated users insert their own public.users row when mirroring rows are missing
-- (e.g. legacy auth users created before the trigger, or manual DB edits). Required so
-- profiles.* inserts/upserts satisfy profiles_user_id_fkey → public.users(id).

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert with check (auth.uid() = id);
