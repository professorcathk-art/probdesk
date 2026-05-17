"use server";

import { createClient } from "@/lib/supabase/server";

export type MarketplaceListing = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
  is_demo_listing?: boolean;
  must_haves?: string | null;
};

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
    return { listings: (data ?? []) as MarketplaceListing[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server configuration error";
    return { error: msg };
  }
}

const INTENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fetch one marketplace-visible intent; relies on RLS + explicit public/active filters. */
export async function getPublicMarketplaceIntentById(
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
      .eq("is_marketplace_public", true)
      .eq("status", "active")
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: "Not found" };
    return { listing: data as MarketplaceListing };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server configuration error";
    return { error: msg };
  }
}
