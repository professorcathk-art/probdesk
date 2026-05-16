"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export async function signInWithMagicLink(email: string) {
  try {
    const supabase = await createClient();
    const origin = getSiteOrigin();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign-in is temporarily unavailable.";
    return { ok: false as const, message: msg };
  }
}

export async function signInWithGoogle() {
  try {
    const supabase = await createClient();
    const origin = getSiteOrigin();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, url: data.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign-in is temporarily unavailable.";
    return { ok: false as const, message: msg };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore missing client config */
  }
}
