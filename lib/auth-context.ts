import { createClient } from "@/lib/supabase/server";

export async function getAuthContext() {
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
}
