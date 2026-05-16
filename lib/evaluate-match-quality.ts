import type { SupabaseClient } from "@supabase/supabase-js";
import { vibeCheckWith4o } from "@/lib/aiml";

type IntentRow = {
  id: string;
  user_id: string;
  natural_language_input: string;
  location_filter: string | null;
  embedding: unknown;
};

export type MatchQualityEval =
  | { ok: true; maxScore: number; topPeerUserId: string | null }
  | { ok: false; reason: string };

/**
 * Mirrors console hybrid discovery: RPC pool + vibe scoring (fallback to similarity × 100).
 * Used by cron to estimate best match quality without an end-user session.
 */
export async function maxHybridMatchScoreForIntent(
  supabase: SupabaseClient,
  intent: IntentRow,
): Promise<MatchQualityEval> {
  if (!intent.location_filter?.trim()) {
    return { ok: false, reason: "no_location" };
  }
  if (!intent.embedding) {
    return { ok: false, reason: "no_embedding" };
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc("match_intents", {
    target_embedding: intent.embedding as unknown as string,
    p_location: intent.location_filter,
    p_threshold: 0.55,
    p_limit: 24,
    p_exclude_user_id: intent.user_id,
  });

  if (rpcError) {
    return { ok: false, reason: `rpc:${rpcError.message}` };
  }

  const rows = (rpcRows ?? []) as {
    owner_user_id: string;
    natural_language_input: string;
    similarity: number;
  }[];

  if (rows.length === 0) {
    return { ok: false, reason: "no_candidates" };
  }

  const pool = rows.slice(0, 6);

  const scored = await Promise.all(
    pool.map(async (row) => {
      try {
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: row.natural_language_input,
        });
        return { score: vibe.match_score, peerId: row.owner_user_id };
      } catch {
        return {
          score: Math.round((row.similarity ?? 0) * 100),
          peerId: row.owner_user_id,
        };
      }
    }),
  );

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { ok: true, maxScore: best.score, topPeerUserId: best.peerId };
}
