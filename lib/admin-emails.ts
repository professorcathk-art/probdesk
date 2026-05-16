/**
 * Admin access for `/admin`. Replace the fallback string or set PROBDESK_ADMIN_EMAIL in env.
 * Comma-separated list is supported, e.g. `PROBDESK_ADMIN_EMAIL=a@x.com,b@y.com`
 */
const ADMIN_EMAIL_FALLBACK = "REPLACE_ME_ADMIN_EMAIL@yourdomain.com";

export function listAdminEmails(): string[] {
  const raw = process.env["PROBDESK_ADMIN_EMAIL"] ?? ADMIN_EMAIL_FALLBACK;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return listAdminEmails().includes(e);
}
