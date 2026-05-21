import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Deduped per incoming request — layout + pages often call this together; avoids repeated
 * Supabase auth + DB round-trips within the same RSC payload.
 */
export const getAuthContext = cache(async function getAuthContext() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, onboardingStatus: null as string | null };
    }

    const { data } = await supabase.from("users").select("onboarding_status").eq("id", user.id).single();

    return {
      user,
      onboardingStatus: data?.onboarding_status ?? "pending",
    };
  } catch {
    return { user: null, onboardingStatus: null as string | null };
  }
});
