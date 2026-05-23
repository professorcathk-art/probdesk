import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBearerClient } from "@/lib/supabase/mobile-bearer-client";

export function bearerTokenFromRequest(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw?.trim()) return null;
  const m = /^Bearer\s+([\s\S]+)$/i.exec(raw.trim());
  const token = m?.[1]?.trim();
  return token || null;
}

export type MobileAuthedSupabase = { supabase: SupabaseClient; user: User };

/** Validates JWT via Supabase; returns null if missing/invalid/expired. */
export async function getMobileAuthorizedClient(
  request: Request,
): Promise<MobileAuthedSupabase | null> {
  const token = bearerTokenFromRequest(request);
  if (!token) return null;
  try {
    const supabase = createSupabaseBearerClient(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
}
