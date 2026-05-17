import { sanitizeInternalRedirect } from "@/lib/sanitize-redirect";

/** Optional post-login path (e.g. /messages) set from /login?after=… before OAuth. */

export const REDIRECT_AFTER_COOKIE = "vn_after";

export function setRedirectAfterCookieClient(rawPath: string | undefined | null) {
  if (typeof document === "undefined" || !rawPath) return;
  const safe = sanitizeInternalRedirect(rawPath);
  if (!safe) return;
  document.cookie = `${REDIRECT_AFTER_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${60 * 30}; SameSite=Lax`;
}

export function parseRedirectAfterCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    return sanitizeInternalRedirect(decodeURIComponent(raw));
  } catch {
    return null;
  }
}
