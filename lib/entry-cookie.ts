/** Short-lived first-party cookie carrying signup intent before OAuth / email sign-in completes. */

export const ENTRY_COOKIE = "vn_entry";

/** Read a cookie from a Request (standard Web API has no `request.cookies`). */
export function getRequestCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const prefix = `${name}=`;
  for (const part of header.split(";")) {
    const p = part.trim();
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  return undefined;
}

export type EntryPayload =
  | { v: 1; kind: "enter" }
  | { v: 1; kind: "start_matching" }
  | { v: 1; kind: "pending_connect"; receiverIntentId: string };

export function parseEntryCookie(raw: string | undefined | null): EntryPayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const j = JSON.parse(decoded) as EntryPayload;
    if (!j || j.v !== 1) return null;
    if (j.kind === "enter" || j.kind === "start_matching") return j;
    if (j.kind === "pending_connect") {
      const id = j.receiverIntentId;
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
      return j;
    }
    return null;
  } catch {
    return null;
  }
}

/** Client-only: call immediately before navigating to Google OAuth or /login. */
export function setEntryCookieClient(payload: EntryPayload) {
  if (typeof document === "undefined") return;
  const body = encodeURIComponent(JSON.stringify(payload));
  document.cookie = `${ENTRY_COOKIE}=${body}; Path=/; Max-Age=${60 * 30}; SameSite=Lax`;
}
