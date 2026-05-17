"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MarketplaceListing = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
  is_demo_listing?: boolean;
  must_haves?: string | null;
  /** Profile field — shown on Explore / home cards */
  gender: string | null;
  /** `skills_tags` ∪ `languages` from profile, deduped */
  interest_keywords: string[];
};

type ListingRow = Omit<MarketplaceListing, "gender" | "interest_keywords">;

function mergeInterestKeywords(skills: unknown, langs: unknown): string[] {
  const s = Array.isArray(skills) ? skills : [];
  const l = Array.isArray(langs) ? langs : [];
  const out = new Set<string>();
  for (const x of [...s, ...l]) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t) out.add(t);
    }
  }
  return [...out];
}

/** Loads gender + tag chips via service role — avoids widening profiles RLS to anonymous clients. */
async function attachExplorePublicIdentityRows(rows: ListingRow[]): Promise<MarketplaceListing[]> {
  if (rows.length === 0) return [];
  let svc;
  try {
    svc = createServiceRoleClient();
  } catch {
    return rows.map((r) => ({ ...r, gender: null, interest_keywords: [] }));
  }
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data, error } = await svc.from("profiles").select("user_id, gender, skills_tags, languages").in("user_id", ids);
  if (error || !data) {
    return rows.map((r) => ({ ...r, gender: null, interest_keywords: [] }));
  }
  const map = new Map(data.map((p) => [p.user_id as string, p]));
  return rows.map((r) => {
    const p = map.get(r.user_id);
    return {
      ...r,
      gender: (p?.gender as string | null) ?? null,
      interest_keywords: mergeInterestKeywords(p?.skills_tags, p?.languages),
    };
  });
}

export async function listMarketplaceListings(): Promise<
  { listings: MarketplaceListing[] } | { error: string }
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("intent_requests")
      .select(
        "id, natural_language_input, location_filter, extracted_persona, user_id, is_demo_listing, must_haves",
      )
      .eq("is_marketplace_public", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) return { error: error.message };
    const raw = (data ?? []) as ListingRow[];
    const listings = await attachExplorePublicIdentityRows(raw);
    return { listings };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server configuration error";
    return { error: msg };
  }
}

const INTENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Explore deep link (/explore/[id]): intent shared from Manage. Readable when active/paused (see RLS intent_share_deep_link_read). */
export async function getExploreIntentForDeepLink(
  intentId: string,
): Promise<{ listing: MarketplaceListing } | { error: string }> {
  const id = intentId.trim();
  if (!INTENT_UUID_RE.test(id)) {
    return { error: "Invalid intent id" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("intent_requests")
      .select(
        "id, natural_language_input, location_filter, extracted_persona, user_id, is_demo_listing, must_haves",
      )
      .eq("id", id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: "Not found" };
    const raw = data as ListingRow;
    const [listing] = await attachExplorePublicIdentityRows([raw]);
    return { listing };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server configuration error";
    return { error: msg };
  }
}

/** @deprecated Use getExploreIntentForDeepLink — kept name for older imports. */
export async function getPublicMarketplaceIntentById(
  intentId: string,
): Promise<{ listing: MarketplaceListing } | { error: string }> {
  return getExploreIntentForDeepLink(intentId);
}
