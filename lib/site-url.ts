/**
 * Safe origin for redirects and metadata. Handles empty env strings, missing protocol,
 * and falls back to Vercel's VERCEL_URL when NEXT_PUBLIC_SITE_URL is unset.
 */
function tryOrigin(candidate: string | undefined): string | null {
  const raw = candidate?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

/** Use on the server (Server Actions, Route Handlers). Pass `request` when available for callback URLs. */
export function getSiteOrigin(request?: Request): string {
  const fromEnv =
    tryOrigin(process.env["NEXT_PUBLIC_SITE_URL"]) ??
    (() => {
      const vu = process.env["VERCEL_URL"]?.trim();
      return vu ? tryOrigin(`https://${vu}`) : null;
    })();

  if (fromEnv) return fromEnv;

  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* noop */
    }
  }

  return "http://localhost:3000";
}

export function getMetadataBase(): URL {
  try {
    return new URL(getSiteOrigin());
  } catch {
    return new URL("http://localhost:3000");
  }
}
