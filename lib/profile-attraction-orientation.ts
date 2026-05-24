/**
 * Optional profile field — simplified sexual/relationship orientation (Phase 25.1).
 * English slugs in DB and API; labels live in i18n (`profilePage.attractionOrientations`).
 * UI default is empty (stored as NULL) so business-only users are not pushed to disclose.
 */
export const PROFILE_ATTRACTION_ORIENTATION_SLUGS = [
  "heterosexual",
  "gay",
  "lesbian",
  "bisexual",
  "other",
] as const;

export type ProfileAttractionOrientationSlug = (typeof PROFILE_ATTRACTION_ORIENTATION_SLUGS)[number];

const ALLOWED = new Set<string>(PROFILE_ATTRACTION_ORIENTATION_SLUGS);

export function parseProfileAttractionOrientation(raw: string | null | undefined): ProfileAttractionOrientationSlug | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  return ALLOWED.has(t) ? (t as ProfileAttractionOrientationSlug) : null;
}

/** When set (and not straight), do not apply opposite-sex “family default” inference. */
export function attractionOrientationSuppressesHeteroDefaultInference(slug: string | null | undefined): boolean {
  if (slug == null) return false;
  const t = slug.trim();
  if (!t || t === "heterosexual") return false;
  return true;
}

/** Short English fragment for supply embedding (only when member selected a disclosed value). */
export function attractionOrientationEmbeddingNote(slug: ProfileAttractionOrientationSlug | null): string | null {
  if (!slug) return null;
  const map: Record<ProfileAttractionOrientationSlug, string> = {
    heterosexual: "heterosexual (optional self-report)",
    gay: "gay (optional self-report)",
    lesbian: "lesbian (optional self-report)",
    bisexual: "bisexual (optional self-report)",
    other: "other orientation (optional self-report)",
  };
  return map[slug] ?? null;
}
