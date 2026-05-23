import type { SupabaseClient } from "@supabase/supabase-js";

export async function countActiveIntentsForUser(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("intent_requests")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) return 0;
  return count ?? 0;
}
