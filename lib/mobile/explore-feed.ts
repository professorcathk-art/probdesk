import { createServiceRoleClient } from "@/lib/supabase/admin";
import { embeddingVectorForRpc } from "@/lib/vector-literal";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplaceListingMobile = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
  is_demo_listing?: boolean;
  must_haves?: string | null;
  recommended?: boolean;
  gender: string | null;
  interest_keywords: string[];
};

type ListingRow = Omit<MarketplaceListingMobile, "gender" | "interest_keywords">;

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

async function attachExplorePublicIdentityRows(rows: ListingRow[]): Promise<MarketplaceListingMobile[]> {
  if (rows.length === 0) return [];
  let svc;
  try {
    svc = createServiceRoleClient();
  } catch {
    return rows.map((r) => ({ ...r, gender: null, interest_keywords: [] }));
  }
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data, error } = await svc
    .from("profiles")
    .select("user_id, gender, skills_tags, languages")
    .in("user_id", ids);
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

/** Explore blended feed via `get_blended_explore_intents`; mirrors `listMarketplaceListings` without cookie auth. */
export async function fetchBlendedExploreFeedForMobile(
  supabase: SupabaseClient,
  userId: string,
  options?: { guestPreview?: boolean },
): Promise<{ listings: MarketplaceListingMobile[]; moreAvailable: boolean } | { error: string }> {
  try {
    const guestPreview = Boolean(options?.guestPreview);
    const fetchLimit = guestPreview ? 21 : 60;

    let p_supply_embedding: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("supply_embedding")
      .eq("user_id", userId)
      .maybeSingle();
    p_supply_embedding = tryPgvectorForRpc(profile?.supply_embedding);

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
