/**
 * Clears saved AI suggestion + withdraws overlapping Pending outbound invite from Manage discovery.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

async function idsOfPendingOutboundToWithdraw(params: {
  supabase: SupabaseClient;
  actorUserId: string;
  anchorIntentId: string;
  candidateProfileId: string;
}): Promise<string[]> {
  const { supabase, actorUserId, anchorIntentId, candidateProfileId } = params;
  const demoInbox = process.env["MARKETPLACE_DEMO_INBOX_USER_ID"]?.trim();

  const { data: candidates, error } = await supabase
    .from("matches")
    .select("id, receiver_id, intent_request_id")
    .eq("sender_id", actorUserId)
    .eq("sender_context_intent_id", anchorIntentId)
    .eq("status", "Pending")
    .is("counterparty_intent_id", null);

  if (error || !candidates?.length) return [];

  const out: string[] = [];
  for (const row of candidates) {
    if (row.receiver_id === candidateProfileId) {
      out.push(row.id);
      continue;
    }
    if (demoInbox && row.receiver_id === demoInbox && row.intent_request_id) {
      const { data: listing } = await supabase
        .from("intent_requests")
        .select("user_id")
        .eq("id", row.intent_request_id)
        .maybeSingle();
      if (listing?.user_id === candidateProfileId) out.push(row.id);
    }
  }
  return [...new Set(out)];
}

export type DismissAiRecommendationFlowResult =
  | { ok: true; withdrawn_match_ids: string[] }
  | { ok: false; message: string };

/**
 * Dismisses ai_recommendation row and rejects related Pending outbound from the same Manage anchor intent.
 */
export async function dismissAiRecommendationWithClient(
  supabase: SupabaseClient,
  options: {
    recommendationId: string;
    actorUserId: string;
    refundInviteCredits: boolean;
  },
): Promise<DismissAiRecommendationFlowResult> {
  const { recommendationId, actorUserId, refundInviteCredits } = options;

  const { data: rec, error: fErr } = await supabase
    .from("ai_recommendations")
    .select("id, intent_id, candidate_profile_id")
    .eq("id", recommendationId)
    .maybeSingle();

  if (fErr || !rec) return { ok: false, message: fErr?.message ?? "Not found." };

  const { data: intent } = await supabase
    .from("intent_requests")
    .select("user_id")
    .eq("id", rec.intent_id)
    .maybeSingle();

  if (!intent || intent.user_id !== actorUserId) {
    return { ok: false, message: "Forbidden." };
  }

  const matchIdsToReject = await idsOfPendingOutboundToWithdraw({
    supabase,
    actorUserId,
    anchorIntentId: rec.intent_id,
    candidateProfileId: rec.candidate_profile_id,
  });

  for (const mid of matchIdsToReject) {
    const { error: rejErr } = await supabase
      .from("matches")
      .update({ status: "Rejected", updated_at: new Date().toISOString() })
      .eq("id", mid)
      .eq("sender_id", actorUserId)
      .eq("status", "Pending");

    if (rejErr) {
      return { ok: false, message: rejErr.message };
    }

    if (refundInviteCredits) {
      const { error: refErr } = await supabase.rpc("refund_connection_credit", {
        p_user_id: actorUserId,
      });
      if (refErr) return { ok: false, message: refErr.message };
    }
  }

  const { error: uErr } = await supabase
    .from("ai_recommendations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", recommendationId);

  if (uErr) return { ok: false, message: uErr.message };

  return { ok: true, withdrawn_match_ids: matchIdsToReject };
}
