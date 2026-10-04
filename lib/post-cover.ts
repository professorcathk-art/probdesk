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

/** Drop photo and public-profile fields before they are folded into matching text. */
export function enrichmentWithoutCoverUrl(enrichment: unknown): Record<string, unknown> | undefined {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return undefined;
  const {
    cover_url: _cover,
    public_display_name: _name,
    public_avatar_url: _avatar,
    ...rest
  } = enrichment as Record<string, unknown>;
  return rest;
}

export function profilePublicFromEnrichment(enrichment: unknown): boolean {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return false;
  return (enrichment as Record<string, unknown>).profile_public === true;
}

export function publicAuthorFromEnrichment(enrichment: unknown): { name: string | null; avatar: string | null } {
  if (!profilePublicFromEnrichment(enrichment)) return { name: null, avatar: null };
  const record = enrichment as Record<string, unknown>;
  const name = typeof record.public_display_name === "string" ? record.public_display_name.trim() : "";
  const avatar = typeof record.public_avatar_url === "string" ? record.public_avatar_url.trim() : "";
  return { name: name || null, avatar: avatar || null };
}

export function enrichmentWithProfile(
  enrichment: unknown,
  input: { show: boolean; name: string | null; avatar: string | null },
): Record<string, unknown> {
  const base =
    enrichment && typeof enrichment === "object" && !Array.isArray(enrichment)
      ? { ...(enrichment as Record<string, unknown>) }
      : {};
  if (!input.show) {
    delete base.profile_public;
    delete base.public_display_name;
    delete base.public_avatar_url;
    return base;
  }
  base.profile_public = true;
  if (input.name) base.public_display_name = input.name;
  else delete base.public_display_name;
  if (input.avatar) base.public_avatar_url = input.avatar;
  else delete base.public_avatar_url;
  return base;
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
