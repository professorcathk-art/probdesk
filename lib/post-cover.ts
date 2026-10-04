/** Public post photos live in the existing avatars bucket: `{userId}/post-covers/{file}`. */

export function coverUrlFromEnrichment(enrichment: unknown): string | null {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return null;
  const value = (enrichment as Record<string, unknown>).cover_url;
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

export function enrichmentWithCover(enrichment: unknown, coverUrl: string | null): Record<string, unknown> {
  const base =
    enrichment && typeof enrichment === "object" && !Array.isArray(enrichment)
      ? { ...(enrichment as Record<string, unknown>) }
      : {};
  if (coverUrl) base.cover_url = coverUrl;
  else delete base.cover_url;
  return base;
}

/** Drop the photo URL before it is folded into matching text. */
export function enrichmentWithoutCoverUrl(enrichment: unknown): Record<string, unknown> | undefined {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return undefined;
  const { cover_url: _cover, ...rest } = enrichment as Record<string, unknown>;
  return rest;
}

export function acceptedPostCoverUrl(raw: string | null | undefined, userId: string): string | null {
  const input = raw?.trim() ?? "";
  if (!input) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  let url: URL;
  let origin: URL;
  try {
    url = new URL(input);
    origin = new URL(base);
  } catch {
    return null;
  }
  if (url.origin !== origin.origin) return null;
  const folder = `/storage/v1/object/public/avatars/${userId}/post-covers/`;
  if (!url.pathname.includes(folder) || url.pathname.includes("..")) return null;
  return url.toString();
}
