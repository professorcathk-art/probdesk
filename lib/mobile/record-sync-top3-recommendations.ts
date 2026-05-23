import type { SupabaseClient } from "@supabase/supabase-js";

export type ImmediateTop3Input = {
  owner_user_id: string;
  match_score: number;
  compatibility_reason: string;
};

/**
 * Mirrors `recordImmediateHybridRecommendations` but uses an explicit Supabase client (Bearer JWT),
 * since the server-action helper always uses cookie-based `createClient()`.
 */
export async function recordSyncTop3RecommendationsWithClient(
  supabase: SupabaseClient,
  actorUserId: string,
  intentId: string,
  suggestions: ImmediateTop3Input[],
): Promise<void> {
  const top = suggestions.slice(0, 3);
  if (top.length === 0) return;

  for (const card of top) {
    if (!card.owner_user_id || card.owner_user_id === actorUserId) continue;

    const payload = {
      intent_id: intentId,
      candidate_profile_id: card.owner_user_id,
      score: Math.min(100, Math.max(0, Math.round(card.match_score))),
      reason: card.compatibility_reason ?? null,
      email_sent: false,
      source: "sync_top3" as const,
      dismissed_at: null as string | null,
    };

    const { error: insErr } = await supabase.from("ai_recommendations").insert(payload);
    if (insErr?.code === "23505") {
      await supabase
        .from("ai_recommendations")
        .update({
          score: payload.score,
          reason: payload.reason,
          source: payload.source,
        })
        .eq("intent_id", intentId)
        .eq("candidate_profile_id", card.owner_user_id);
    }
  }
}
