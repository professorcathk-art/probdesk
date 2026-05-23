"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { embeddingVectorForRpc } from "@/lib/vector-literal";

export type MarketplaceListing = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
  is_demo_listing?: boolean;
  must_haves?: string | null;
  /**
   * Explore: ✨ when viewer **supply_embedding** vs listing **demand** cosine similarity > 0.75 (Phase 22).
   * Signed-out viewers have no embedding — chronological fallback within RPC.
   */
  recommended?: boolean;
  /** Profile field — shown on Explore / home cards */
  gender: string | null;
  /** `skills_tags` ∪ `languages` from profile, deduped */
  interest_keywords: string[];
};

type ListingRow = Omit<MarketplaceListing, "gender" | "interest_keywords">;

type BlendedExploreRpcRow = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
  is_demo_listing: boolean | null;
  must_haves: string | null;
  is_recommended: boolean;
};

function tryPgvectorForRpc(raw: unknown): string | null {
  if (raw == null) return null;
  try {
    return embeddingVectorForRpc(raw);
  } catch {
    return null;
  }
}

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

export type ListMarketplaceResult =
  | { listings: MarketplaceListing[]; moreAvailable: boolean }
  | { error: string };

/**
 * @param guestPreview When true (Explore/Square for signed-out users), fetch at most 20 listings but probe +1 row to show “sign in for more”.
 */
export async function listMarketplaceListings(options?: { guestPreview?: boolean }): Promise<ListMarketplaceResult> {
  try {
    const supabase = await createClient();
    const guestPreview = Boolean(options?.guestPreview);
    const fetchLimit = guestPreview ? 21 : 60;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let p_supply_embedding: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("supply_embedding")
        .eq("user_id", user.id)
        .maybeSingle();
      p_supply_embedding = tryPgvectorForRpc(profile?.supply_embedding);
    }

    const { data: blended, error } = await supabase.rpc("get_blended_explore_intents", {
      p_supply_embedding,
      p_limit: fetchLimit,
    });

    if (error) return { error: error.message };
    let raw: ListingRow[] = ((blended ?? []) as BlendedExploreRpcRow[]).map((r) => ({
      id: r.id,
      natural_language_input: r.natural_language_input,
      location_filter: r.location_filter,
      extracted_persona: r.extracted_persona,
      user_id: r.user_id,
      is_demo_listing: r.is_demo_listing ?? undefined,
      must_haves: r.must_haves ?? undefined,
      recommended: Boolean(r.is_recommended),
    }));
    let moreAvailable = false;
    if (guestPreview && raw.length > 20) {
      moreAvailable = true;
      raw = raw.slice(0, 20);
    }
    const listings = await attachExplorePublicIdentityRows(raw);
    return { listings, moreAvailable };
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
