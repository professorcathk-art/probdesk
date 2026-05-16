import { createClient } from "@supabase/supabase-js";

/** Server-only: bypasses RLS for admin tooling. Requires SUPABASE_SERVICE_ROLE_KEY. */
export function createServiceRoleClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
