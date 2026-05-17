import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { validateMandatoryProfileCore } from "@/lib/profile-basics";

/**
 * Runs on the Node server (not Edge middleware) so the Supabase session + RLS match normal pages.
 * Redirects logged-in, onboarding-complete users who lack core profile fields (display name, bio,
 * location, industry — bio length ≥ PROFILE_CORE_MIN_BIO_LENGTH) before:
 * `/square`, `/marketplace`, `/console`, `/admin`.
 */
export async function ensureProfileCoreCompleteForAppUse() {
  const { user, onboardingStatus } = await getAuthContext();
  if (!user || onboardingStatus !== "complete") return;

  const supabase = await createClient();
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("display_name, bio, location, industry")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[ensureProfileCoreCompleteForAppUse]", error.message);
    return;
  }

  const gate = validateMandatoryProfileCore(prof ?? {});
  if (!gate.ok) {
    redirect("/profile?required=profile");
  }
}
