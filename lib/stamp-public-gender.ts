import type { SupabaseClient } from "@supabase/supabase-js";
import { parseProfileGender } from "@/lib/profile-basics";
import { enrichmentWithPublicGender, genderFromEnrichment } from "@/lib/post-cover";

/** Copies the author's gender onto their posts so it stays visible when the name is hidden. */
export async function stampPublicGenderOntoOwnIntents(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("gender").eq("user_id", userId).maybeSingle();
  const gender = parseProfileGender(profile?.gender ?? null);
  if (!gender) return;
  const { data: rows } = await supabase.from("intent_requests").select("id, enrichment").eq("user_id", userId);
  for (const row of rows ?? []) {
    if (genderFromEnrichment(row.enrichment) === gender) continue;
    await supabase
      .from("intent_requests")
      .update({ enrichment: enrichmentWithPublicGender(row.enrichment, gender) })
      .eq("id", row.id)
      .eq("user_id", userId);
  }
}
