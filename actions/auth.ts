"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(email: string) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, url: data.url };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
