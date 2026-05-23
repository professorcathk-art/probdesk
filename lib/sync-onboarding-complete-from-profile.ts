import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProfileBasicsForPublish } from "@/lib/profile-basics";

const PROFILE_PUBLISH_SELECT =
  "display_name, bio, location, industry, superpower, gender, skills_tags, languages";

/**
 * Keeps `users.onboarding_status` aligned with **publishable mandatory profile**.
 * Invite / Explore gates use {@link validateProfileBasicsForPublish} — onboarding is "done" once that passes,
 * regardless of `/onboarding` enrichment or console intent wizard.
 */
export async function syncOnboardingCompleteFromProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_PUBLISH_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (!validateProfileBasicsForPublish(data ?? {}).ok) return;

  await supabase.from("users").update({ onboarding_status: "complete" }).eq("id", userId);
}
