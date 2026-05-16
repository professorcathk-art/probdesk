import type { SupabaseClient } from "@supabase/supabase-js";

export const BLOCKING_MATCH_STATUSES = ["Pending", "Pending_System", "Accepted"] as const;

export const DUPLICATE_MATCH_MESSAGE = "Users are already connected or pending.";

/** True if any row exists between user A and B in a blocking status (either direction). */
export async function hasBlockingMatchBetween(db: SupabaseClient, userA: string, userB: string): Promise<boolean> {
  const st = [...BLOCKING_MATCH_STATUSES];
  const { data: aToB } = await db
    .from("matches")
    .select("id")
    .eq("sender_id", userA)
    .eq("receiver_id", userB)
    .in("status", st)
    .limit(1)
    .maybeSingle();
  if (aToB) return true;
  const { data: bToA } = await db
    .from("matches")
    .select("id")
    .eq("sender_id", userB)
    .eq("receiver_id", userA)
    .in("status", st)
    .limit(1)
    .maybeSingle();
  return !!bToA;
}
