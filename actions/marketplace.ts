"use server";

import { createClient } from "@/lib/supabase/server";

export type MarketplaceListing = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  extracted_persona: Record<string, unknown> | null;
  user_id: string;
};

export async function listMarketplaceListings(): Promise<
  { listings: MarketplaceListing[] } | { error: string }
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, location_filter, extracted_persona, user_id")
    .eq("is_marketplace_public", true)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return { error: error.message };
  return { listings: (data ?? []) as MarketplaceListing[] };
}
