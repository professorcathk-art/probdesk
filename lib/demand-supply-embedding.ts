/**
 * Phase 14 — demand/supply split for cross-vector retrieval:
 * intent_requests.demand_embedding vs profiles.supply_embedding.
 */

/** Text embedded into `intent_requests.demand_embedding`. */
export function buildDemandEmbeddingText(
  intentDescription: string,
  mustHaves: string | null | undefined,
): string {
  const d = intentDescription.trim();
  const m = mustHaves?.trim();
  return `Looking for: ${d}. Must-haves constraints: ${m && m.length > 0 ? m : "(none stated)"}.`;
}

/**
 * Text embedded into `profiles.supply_embedding`.
 * Note: `profiles.intent_level` was removed (migration 064); keywords/interests substitute structured cadence.
 */
export function buildSupplyEmbeddingText(p: {
  industry: string | null;
  bio: string | null;
  superpower: string | null;
  languages: string[];
  skills_tags?: string[];
  /** Active Explore listing — pulls complementary phrases into supply space for demand↔supply retrieval. */
  activeIntentNaturalLanguage?: string | null;
}): string {
  const industryBio =
    [p.industry?.trim(), p.bio?.trim()].filter(Boolean).join(" / ") || "Networking member";
  const superpower = p.superpower?.trim() || "(not stated)";
  const langs = (p.languages ?? []).map((s) => String(s).trim()).filter(Boolean);
  const langStr = langs.length > 0 ? langs.join(", ") : "(none stated)";
  const tags = (p.skills_tags ?? []).map((s) => String(s).trim()).filter(Boolean);
  const tagStr = tags.length > 0 ? tags.join(", ") : "(none stated)";
  const listingRaw = p.activeIntentNaturalLanguage?.trim();
  const listing =
    listingRaw && listingRaw.length > 0
      ? ` Active Explore listing (what I'm seeking right now): ${listingRaw}.`
      : "";
  return `I am a: ${industryBio}. My superpower/offer: ${superpower}. Spoken languages: ${langStr}. Keywords/interests: ${tagStr}.${listing}`;
}
