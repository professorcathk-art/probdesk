const ALLOWED_PATHS = new Set([
  "/console",
  "/square",
  "/marketplace",
  "/messages",
  "/profile",
  "/create",
  "/onboarding",
  "/portal/one-to-one",
  "/portal/groups",
  "/portal/settings",
]);

/**
 * Allows internal navigations only (pathname must be allow-listed). Preserves query string.
 */
export function sanitizeInternalRedirect(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  const q = s.indexOf("?");
  const path = q === -1 ? s : s.slice(0, q);
  if (!ALLOWED_PATHS.has(path)) return null;
  if (s.length > 512) return null;
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) return null;
  return s;
}
