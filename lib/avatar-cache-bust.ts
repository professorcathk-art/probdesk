/**
 * Supabase Storage public URLs are stable for a fixed object path (`{userId}/avatar`).
 * After overwrite (upsert), browsers and CDNs often keep serving the old bytes unless the URL changes.
 */
export function withAvatarCacheBust(publicUrl: string): string {
  const u = publicUrl.trim();
  if (!u) return u;
  const q = u.indexOf("?");
  const base = q >= 0 ? u.slice(0, q) : u;
  return `${base}?v=${Date.now()}`;
}
