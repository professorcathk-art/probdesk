import type { MatchRow } from "@/actions/matches";

/** True when an outbound invite from this 「尋找對象」 row already ties you to the suggested peer (Pending/Accepted). */
export function aiRecommendationOutboundOverlap(
  matches: MatchRow[],
  userId: string,
  intentId: string,
  candidateProfileId: string,
): boolean {
  return matches.some(
    (m) =>
      m.sender_id === userId &&
      m.receiver_id === candidateProfileId &&
      !m.counterparty_intent_id &&
      m.sender_context_intent_id === intentId &&
      (m.status === "Pending" || m.status === "Accepted"),
  );
}
