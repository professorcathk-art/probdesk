/**
 * Optional profile field: who the member is typically attracted to romantically.
 * English slugs in DB; UI labels live in i18n.
 */
export const PROFILE_ATTRACTION_ORIENTATION_SLUGS = [
  "heterosexual",
  "gay_man",
  "lesbian",
  "bisexual",
  "pansexual",
  "asexual",
  "queer",
  "questioning",
  "other",
  "prefer_not_say",
] as const;

export type ProfileAttractionOrientationSlug = (typeof PROFILE_ATTRACTION_ORIENTATION_SLUGS)[number];

const ALLOWED = new Set<string>(PROFILE_ATTRACTION_ORIENTATION_SLUGS);

export function parseProfileAttractionOrientation(raw: string | null | undefined): ProfileAttractionOrientationSlug | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  return ALLOWED.has(t) ? (t as ProfileAttractionOrientationSlug) : null;
}

/** When set, do not apply opposite-sex "family default" inference (unknown / LGBTQ+ / withhold). */
export function attractionOrientationSuppressesHeteroDefaultInference(
  slug: string | null | undefined,
): boolean {
  if (slug == null) return false;
  const t = slug.trim();
  if (!t || t === "heterosexual") return false;
  return true;
}

/** Short English fragment for supply embedding (only when user opted in). */
export function attractionOrientationEmbeddingNote(slug: ProfileAttractionOrientationSlug | null): string | null {
  if (!slug) return null;
  const map: Record<ProfileAttractionOrientationSlug, string> = {
    heterosexual: "heterosexual (self-reported, optional)",
    gay_man: "gay man (self-reported, optional)",
    lesbian: "lesbian (self-reported, optional)",
    bisexual: "bisexual (self-reported, optional)",
    pansexual: "pansexual (self-reported, optional)",
    asexual: "asexual (self-reported, optional)",
    queer: "queer (self-reported, optional)",
    questioning: "questioning (self-reported, optional)",
    other: "other orientation (self-reported, optional)",
    prefer_not_say: "prefers not to say orientation (optional field)",
  };
  return map[slug] ?? null;
}
