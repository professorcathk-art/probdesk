import type { SupabaseClient } from "@supabase/supabase-js";
import { vibeCheckWith4o } from "@/lib/aiml";

type IntentRow = {
  id: string;
  user_id: string;
  natural_language_input: string;
  location_filter: string | null;
  embedding: unknown;
  must_haves?: string | null;
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

  const tiers = [
    { maxDistance: 0.55, requireLocationMatch: false },
    { maxDistance: 0.66, requireLocationMatch: false },
    { maxDistance: 0.76, requireLocationMatch: false },
    { maxDistance: 0.72, requireLocationMatch: true },
  ] as const;

  type RpcRow = {
    intent_id: string;
    owner_user_id: string;
    natural_language_input: string;
    similarity: number;
    location_filter: string | null;
  };

  let rows: RpcRow[] = [];
  for (const tier of tiers) {
    const { data, error: rpcError } = await supabase.rpc("match_intents", {
      target_embedding: intent.embedding as unknown as string,
      p_location: intent.location_filter,
      p_threshold: tier.maxDistance,
      p_limit: 24,
      p_exclude_user_id: intent.user_id,
      p_require_location_match: tier.requireLocationMatch,
    });
    if (rpcError) {
      return { ok: false, reason: `rpc:${rpcError.message}` };
    }
    rows = (data ?? []) as RpcRow[];
    if (rows.length > 0) break;
  }

  if (rows.length === 0) {
    return { ok: false, reason: "no_candidates" };
  }

  const pool = rows.slice(0, 6);
  const poolIds = pool.map((r) => r.intent_id);
  const { data: poolMustRows } =
    poolIds.length > 0
      ? await supabase.from("intent_requests").select("id, must_haves").in("id", poolIds)
      : { data: [] as { id: string; must_haves: string | null }[] };
  const mustByIntentId = new Map((poolMustRows ?? []).map((r) => [r.id as string, r.must_haves as string | null]));

  const scored = await Promise.all(
    pool.map(async (row) => {
      try {
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: row.natural_language_input,
          senderMustHaves: intent.must_haves ?? null,
          candidateMustHaves: mustByIntentId.get(row.intent_id) ?? null,
          senderLocationPreference: intent.location_filter,
          candidateLocation: row.location_filter,
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
