"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { embeddingVectorForRpc } from "@/lib/vector-literal";
import { coverUrlFromEnrichment, genderFromEnrichment, publicAuthorFromEnrichment } from "@/lib/post-cover";
import { stampPublicGenderOntoOwnIntents } from "@/lib/stamp-public-gender";

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
  /** Author-uploaded cover. Empty until they add one. */
  cover_url?: string | null;
  /** Set only when the author chose to show their profile on this post. */
  author_name?: string | null;
  author_avatar?: string | null;
  /** Gender copied onto the post so it stays public when the name is hidden. */
  listed_gender?: string | null;
};

type ListingRow = Omit<MarketplaceListing, "gender" | "interest_keywords" | "listed_gender"> & {
  listed_gender?: string | null;
};

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

async function attachCoverUrls(supabase: SupabaseClient, rows: ListingRow[]): Promise<ListingRow[]> {
  if (rows.length === 0) return rows;
  const { data, error } = await supabase.from("intent_requests").select("id, enrichment").in(
    "id",
    rows.map((row) => row.id),
  );
  if (error || !data) return rows;
  const covers = new Map(
    data.map((row) => {
      const author = publicAuthorFromEnrichment(row.enrichment);
      return [
        row.id as string,
        {
          cover_url: coverUrlFromEnrichment(row.enrichment),
          listed_gender: genderFromEnrichment(row.enrichment),
          ...author,
        },
      ] as const;
    }),
  );
  return rows.map((row) => {
    const extra = covers.get(row.id);
    return {
      ...row,
      cover_url: extra?.cover_url ?? null,
      listed_gender: extra?.listed_gender ?? row.listed_gender ?? null,
      author_name: extra?.name ?? null,
      author_avatar: extra?.avatar ?? null,
    };
  });
}

/** Loads gender + tag chips via service role — avoids widening profiles RLS to anonymous clients. */
async function attachExplorePublicIdentityRows(rows: ListingRow[]): Promise<MarketplaceListing[]> {
  if (rows.length === 0) return [];
  const withFallback = (source: ListingRow[]) =>
    source.map((row) => {
      const { listed_gender, ...rest } = row;
      return { ...rest, gender: listed_gender ?? null, interest_keywords: [] as string[] };
    });
  let svc;
  try {
    svc = createServiceRoleClient();
  } catch {
    return withFallback(rows);
  }
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data, error } = await svc.from("profiles").select("user_id, gender, skills_tags, languages").in("user_id", ids);
  if (error || !data) {
    return withFallback(rows);
  }
  const map = new Map(data.map((p) => [p.user_id as string, p]));
  return rows.map((r) => {
    const p = map.get(r.user_id);
    const { listed_gender, ...rest } = r;
    return {
      ...rest,
      gender: (p?.gender as string | null) ?? listed_gender ?? null,
      interest_keywords: mergeInterestKeywords(p?.skills_tags, p?.languages),
    };
  });
}

export type ListMarketplaceResult =
  | { listings: MarketplaceListing[]; moreAvailable: boolean }
  | { error: string };

/** Public home feed. Skips embedding columns, which made the blended RPC take seconds. */
async function loadGuestExploreListings(): Promise<ListMarketplaceResult> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!url || !anon) return { error: "Missing Supabase configuration" };
  const supabase = createAnonClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, location_filter, extracted_persona, user_id, is_demo_listing, must_haves, enrichment")
    .eq("is_marketplace_public", true)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(21);
  if (error) return { error: error.message };
  let raw = ((data ?? []) as Array<ListingRow & { enrichment?: unknown }>).map(({ enrichment, ...row }) => {
    const author = publicAuthorFromEnrichment(enrichment);
    return {
      ...row,
      cover_url: coverUrlFromEnrichment(enrichment),
      listed_gender: genderFromEnrichment(enrichment),
      author_name: author.name,
      author_avatar: author.avatar,
    };
  });
  let moreAvailable = false;
  if (raw.length > 20) {
    moreAvailable = true;
    raw = raw.slice(0, 20);
  }
  const listings = (await attachExplorePublicIdentityRows(raw)).map((row) => ({ ...row, recommended: false }));
  return { listings, moreAvailable };
}

const loadGuestExploreListingsCached = unstable_cache(loadGuestExploreListings, ["guest-explore-listings-v4"], {
  revalidate: 30,
});

export async function listMarketplaceListings(options?: { guestPreview?: boolean }): Promise<ListMarketplaceResult> {
  try {
    const guestPreview = Boolean(options?.guestPreview);
    if (guestPreview) return loadGuestExploreListingsCached();

    const supabase = await createClient();
    const fetchLimit = 60;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let p_supply_embedding: string | null = null;
    if (user) {
      await stampPublicGenderOntoOwnIntents(supabase, user.id);
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
    const listings = await attachExplorePublicIdentityRows(await attachCoverUrls(supabase, raw));
    return { listings, moreAvailable: false };
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
        "id, natural_language_input, location_filter, extracted_persona, user_id, is_demo_listing, must_haves, enrichment",
      )
      .eq("id", id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: "Not found" };
    const row = data as ListingRow & { enrichment?: unknown };
    const { enrichment, ...rest } = row;
    const author = publicAuthorFromEnrichment(enrichment);
    const raw: ListingRow = {
      ...rest,
      cover_url: coverUrlFromEnrichment(enrichment),
      listed_gender: genderFromEnrichment(enrichment),
      author_name: author.name,
      author_avatar: author.avatar,
    };
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
