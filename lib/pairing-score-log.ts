"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type PairingScoreLogPayload = {
  source: "hybrid_suggestion" | "invite_vibe" | "admin_system_match";
  actor_user_id?: string | null;
  anchor_intent_id?: string | null;
  candidate_intent_id?: string | null;
  candidate_user_id?: string | null;
  similarity?: number | null;
  rpc_threshold?: number | null;
  rank_after_sort?: number | null;
  selected_top?: boolean | null;
  match_score?: number | null;
  compatibility_reason?: string | null;
  excluded_reason?: string | null;
  meta?: Record<string, unknown>;
};

/** Best-effort audit log for debugging pairing scores (requires service role on server). */
export async function logPairingScoreEvent(payload: PairingScoreLogPayload): Promise<void> {
  try {
    const svc = createServiceRoleClient();
    await svc.from("pairing_score_events").insert({
      source: payload.source,
      actor_user_id: payload.actor_user_id ?? null,
      anchor_intent_id: payload.anchor_intent_id ?? null,
      candidate_intent_id: payload.candidate_intent_id ?? null,
      candidate_user_id: payload.candidate_user_id ?? null,
      similarity: payload.similarity ?? null,
      rpc_threshold: payload.rpc_threshold ?? null,
      rank_after_sort: payload.rank_after_sort ?? null,
      selected_top: payload.selected_top ?? null,
      match_score: payload.match_score ?? null,
      compatibility_reason: payload.compatibility_reason ?? null,
      excluded_reason: payload.excluded_reason ?? null,
      meta: payload.meta ?? {},
    });
  } catch {
    /* non-fatal — missing key or insert failure should not block UX */
  }
}
