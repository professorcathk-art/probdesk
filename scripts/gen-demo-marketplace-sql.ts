import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_SHOWCASE_INTENTS } from "../lib/demo-showcase-intents";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function dollarQuote(body: string, tag: string): string {
  const open = `$${tag}$`;
  if (body.includes(open)) {
    throw new Error(`Text contains delimiter ${open}; bump tag scheme.`);
  }
  return `${open}${body}${open}`;
}

const valueRows = DEMO_SHOWCASE_INTENTS.map((row, i) => {
  const tag = `demo_nl_${i}`;
  const nl = dollarQuote(row.natural_language_input, tag);
  const loc =
    row.location_filter === null
      ? "null::text"
      : `'${String(row.location_filter).replace(/'/g, "''")}'::text`;
  const mhRaw = row.must_haves?.trim();
  const mh =
    mhRaw && mhRaw.length > 0 ? dollarQuote(mhRaw, `${tag}_mh`) : "null::text";
  return `    (${nl}, ${loc}, ${mh})`;
});

const sql = `-- AUTO-GENERATED from lib/demo-showcase-intents.ts — do not hand-edit listing rows here.
-- Regenerate: npm run gen:demo-marketplace-sql
--
-- 若你看到舊標題（羽毛球教練、裝修師傅），請從磁碟重新載入。正確內容含「羽毛球球友」「石澳龍脊」。
--
-- Replace YOUR_USER_UUID with an existing profiles.user_id (e.g. admin), then run in Supabase SQL Editor.
-- Requires is_demo_listing (migration 049) and must_haves (migration 054). Deletes prior demo intents for that user, then inserts ${DEMO_SHOWCASE_INTENTS.length} rows.
--
-- After wiping auth.users / all users:
-- 1) Authentication → Add user (email/password or magic link) for your admin.
-- 2) Confirm email if required; sign in once so public.users / profiles rows exist (trigger handle_new_auth_user),
--    or insert matching public.users + profiles manually if triggers did not run.
-- 3) Dashboard → SQL → select id from auth.users where email = 'your-admin@...'; copy UUID into demo_owner below.
-- 4) Embeddings are NULL — re-save intents in the app or run your embedding backfill for hybrid matching.

do $$
declare
  demo_owner uuid := 'YOUR_USER_UUID'::uuid;
begin
  delete from public.intent_requests
  where user_id = demo_owner
    and coalesce(is_demo_listing, false) = true;

  insert into public.intent_requests (
    user_id,
    natural_language_input,
    location_filter,
    must_haves,
    extracted_persona,
    status,
    is_marketplace_public,
    is_demo_listing,
    embedding
  )
  select
    demo_owner,
    v.natural_language_input,
    v.location_filter,
    v.must_haves,
    '{}'::jsonb,
    'active',
    true,
    true,
    null
  from (values
${valueRows.join(",\n")}
  ) as v(natural_language_input, location_filter, must_haves);
end $$;
`;

writeFileSync(join(root, "supabase/seed_demo_marketplace_manual.sql"), sql, "utf8");
console.log("Wrote supabase/seed_demo_marketplace_manual.sql");
