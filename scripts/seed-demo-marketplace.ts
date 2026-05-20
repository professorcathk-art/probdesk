/**
 * Seeds ~20 curated marketplace intents owned by MARKETPLACE_DEMO_INBOX_USER_ID (typically your admin user).
 * Connection attempts route server-side to the same inbox user via is_demo_listing + MARKETPLACE_DEMO_INBOX_USER_ID.
 *
 * Usage:
 *   MARKETPLACE_DEMO_INBOX_USER_ID='<uuid>' npx tsx scripts/seed-demo-marketplace.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (never ship client-side).
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_SHOWCASE_INTENTS } from "../lib/demo-showcase-intents";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]?.trim();
const serviceRole = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
const owner = process.env["MARKETPLACE_DEMO_INBOX_USER_ID"]?.trim();

async function main() {
  if (!url || !serviceRole || !owner) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MARKETPLACE_DEMO_INBOX_USER_ID",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await supabase
    .from("intent_requests")
    .delete()
    .eq("user_id", owner)
    .eq("is_demo_listing", true);

  if (delErr) {
    console.error("Failed clearing old demo rows:", delErr.message);
    process.exit(1);
  }

  const rows = DEMO_SHOWCASE_INTENTS.map((d) => ({
    user_id: owner,
    natural_language_input: d.natural_language_input,
    location_filter: d.location_filter,
    must_haves: d.must_haves?.trim() || null,
    extracted_persona: {},
    status: "active",
    is_marketplace_public: true,
    is_demo_listing: true,
    embedding: null,
  }));

  const { error: insErr } = await supabase.from("intent_requests").insert(rows);

  if (insErr) {
    console.error("Insert failed:", insErr.message);
    process.exit(1);
  }

  console.log(`Inserted ${rows.length} demo marketplace intents for user ${owner}.`);
}

void main();
