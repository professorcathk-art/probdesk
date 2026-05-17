import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Postgres unique_violation — row already exists from trigger or prior heal. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Ensures `public.users` and `public.profiles` exist for the signed-in auth user.
 * The DB trigger normally creates these on signup; this heals legacy/orphan sessions where
 * `auth.users` exists without mirror rows (otherwise `profiles` FK fails).
 */
export async function ensurePublicUserRowsForSession(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: uErr } = await supabase.from("users").insert({
    id: user.id,
    email: user.email ?? null,
    onboarding_status: "pending",
  });
  if (uErr && uErr.code !== PG_UNIQUE_VIOLATION) {
    return { ok: false, message: uErr.message };
  }

  const { error: pErr } = await supabase.from("profiles").insert({ user_id: user.id });
  if (pErr && pErr.code !== PG_UNIQUE_VIOLATION) {
    return { ok: false, message: pErr.message };
  }

  return { ok: true };
}
