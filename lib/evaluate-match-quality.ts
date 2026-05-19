import type { SupabaseClient } from "@supabase/supabase-js";
import { vibeCheckWith4o } from "@/lib/aiml";
import { formatProfileMatchingSnippet } from "@/lib/profile-matching-snippet";

type IntentRow = {
  id: string;
  user_id: string;
  natural_language_input: string;
  location_filter: string | null;
  demand_embedding?: unknown;
  embedding?: unknown;
  must_haves?: string | null;
};

export type MatchQualityEval =
  | { ok: true; maxScore: number; topPeerUserId: string | null }
  | { ok: false; reason: string };

/**
 * Mirrors console discovery: Phase 14 demand↔supply RPC pool + complementary vibe scoring.
 */
export async function maxHybridMatchScoreForIntent(
  supabase: SupabaseClient,
  intent: IntentRow,
): Promise<MatchQualityEval> {
  if (!intent.location_filter?.trim()) {
    return { ok: false, reason: "no_location" };
  }
  const demandVec = intent.demand_embedding ?? intent.embedding;
  if (!demandVec) {
    return { ok: false, reason: "no_embedding" };
  }

  const tiers = [
    { maxDistance: 0.55, requireLocationMatch: false },
    { maxDistance: 0.66, requireLocationMatch: false },
    { maxDistance: 0.76, requireLocationMatch: false },
    { maxDistance: 0.84, requireLocationMatch: false },
    { maxDistance: 0.94, requireLocationMatch: false },
    { maxDistance: 0.72, requireLocationMatch: true },
  ] as const;

  const NEIGHBOR_FALLBACK_MAX_DISTANCE = 2.0;

  type RpcRow = {
    user_id: string;
    linked_intent_id: string | null;
    linked_natural_language_input: string | null;
    bio: string | null;
    industry: string | null;
    superpower: string | null;
    skills_tags: string[] | null;
    languages: string[] | null;
    similarity: number;
    location: string | null;
  };

  let rows: RpcRow[] = [];
  for (const tier of tiers) {
    const { data, error: rpcError } = await supabase.rpc("match_profiles", {
      target_embedding: demandVec as unknown as string,
      p_location: intent.location_filter,
      p_threshold: tier.maxDistance,
      p_limit: 20,
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
    const { data, error: fbErr } = await supabase.rpc("match_profiles", {
      target_embedding: demandVec as unknown as string,
      p_location: intent.location_filter,
      p_threshold: NEIGHBOR_FALLBACK_MAX_DISTANCE,
      p_limit: 45,
      p_exclude_user_id: intent.user_id,
      p_require_location_match: false,
    });
    if (fbErr) {
      return { ok: false, reason: `rpc:${fbErr.message}` };
    }
    rows = (data ?? []) as RpcRow[];
  }

  if (rows.length === 0) {
    return { ok: false, reason: "no_candidates" };
  }

  const pool = rows.slice(0, 20);
  const linkedIds = pool.map((r) => r.linked_intent_id).filter((id): id is string => Boolean(id));
  const { data: poolMustRows } =
    linkedIds.length > 0
      ? await supabase.from("intent_requests").select("id, must_haves").in("id", linkedIds)
      : { data: [] as { id: string; must_haves: string | null }[] };
  const mustByIntentId = new Map((poolMustRows ?? []).map((r) => [r.id as string, r.must_haves as string | null]));

  const PROFILE_STUB = "(Profile supply only — no linked Explore listing.)";

  const scored = await Promise.all(
    pool.map(async (row) => {
      const candIntent = row.linked_natural_language_input?.trim() || PROFILE_STUB;
      const candSnippet =
        formatProfileMatchingSnippet({
          bio: row.bio ?? null,
          industry: row.industry ?? null,
          skills_tags: row.skills_tags ?? null,
          languages: row.languages ?? null,
          superpower: row.superpower ?? null,
        }) || undefined;
      try {
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: candIntent,
          senderMustHaves: intent.must_haves ?? null,
          candidateMustHaves: row.linked_intent_id ? mustByIntentId.get(row.linked_intent_id) ?? null : null,
          senderLocationPreference: intent.location_filter,
          candidateLocation: row.location,
          candidateProfileSnippet: candSnippet,
        });
        return { score: vibe.match_score, peerId: row.user_id };
      } catch {
        return {
          score: Math.round((row.similarity ?? 0) * 100),
          peerId: row.user_id,
        };
      }
    }),
  );

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { ok: true, maxScore: best.score, topPeerUserId: best.peerId };
}
