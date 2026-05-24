/**
 * Bearer-auth variant of `computeHybridSuggestions` (actions/intents.ts).
 * Duplicate implementation so we never import server actions here and never rely on cookie sessions.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { vibeCheckWith4o } from "@/lib/aiml";
import { BLOCKING_MATCH_STATUSES } from "@/lib/match-blocking";
import { formatProfileMatchingSnippet } from "@/lib/profile-matching-snippet";
import { logPairingScoreEvent } from "@/lib/pairing-score-log";
import { embeddingVectorForRpc } from "@/lib/vector-literal";
import { recordSyncTop3RecommendationsWithClient } from "@/lib/mobile/record-sync-top3-recommendations";
import {
  AI_SUGGESTION_MIN_MATCH_SCORE,
  applyPartnershipSemanticsScoreCap,
  rankSupplyPoolForPartnerSemantics,
  type MatchingSenderSnapshot,
} from "@/lib/hybrid-ai-suggestion-rules";

/** Same shape as `SuggestionCard` in actions/intents (kept local to avoid coupling to `"use server"` module). */
export type MobileHybridSuggestionCard = {
  intent_id: string | null;
  owner_user_id: string;
  natural_language_input: string;
  extracted_persona: Record<string, unknown> | null;
  location_filter: string | null;
  distance: number;
  similarity: number;
  match_score: number;
  compatibility_reason: string;
  discovery_source: "intent" | "profile";
  peer_display_name: string | null;
  peer_bio: string | null;
  peer_gender: string | null;
  peer_age_group: string | null;
  peer_skills_tags: string[] | null;
  peer_languages: string[] | null;
};

const HYBRID_DISCOVERY_LOG_PIPELINE = "080-lgbt-hint-aro-word-boundary";

export async function runHybridSuggestionsForMobile(
  supabase: SupabaseClient,
  user: User,
  intentId: string,
): Promise<{ ok: true; suggestions: MobileHybridSuggestionCard[] } | { ok: false; message: string }> {
  const { data: intentRow, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, location_filter, demand_embedding, embedding, must_haves")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .single();

  if (error || !intentRow) {
    return { ok: false, message: error?.message ?? "Request not found" };
  }

  let locationForRpc = intentRow.location_filter?.trim() ?? "";
  if (!locationForRpc) {
    const { data: profLoc } = await supabase.from("profiles").select("location").eq("user_id", user.id).maybeSingle();
    locationForRpc = profLoc?.location?.trim() ?? "";
  }
  if (!locationForRpc) {
    return {
      ok: false,
      message:
        "Add a location on your intent or profile (soft context only). Discovery is driven mainly by your statement and expectations.",
    };
  }

  const intent = { ...intentRow, location_filter: locationForRpc };

  const demandVec = intentRow.demand_embedding ?? intentRow.embedding;
  if (!demandVec) {
    return {
      ok: false,
      message: "This intent is missing vectors — edit and save the request once to refresh embeddings.",
    };
  }

  let targetEmbeddingRpc: string;
  try {
    targetEmbeddingRpc = embeddingVectorForRpc(demandVec);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Invalid intent embedding format.",
    };
  }

  const { data: blockRows } = await supabase
    .from("matches")
    .select("sender_id, receiver_id")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .in("status", [...BLOCKING_MATCH_STATUSES]);

  const blocking = new Set<string>();
  for (const r of blockRows ?? []) {
    blocking.add(r.sender_id === user.id ? r.receiver_id : r.sender_id);
  }

  const MATCH_TIERS = [
    { key: "demand_supply_primary", maxDistance: 0.55, requireLocationMatch: false },
    { key: "demand_supply_relaxed", maxDistance: 0.66, requireLocationMatch: false },
    { key: "demand_supply_wide", maxDistance: 0.76, requireLocationMatch: false },
    { key: "demand_supply_loose_a", maxDistance: 0.84, requireLocationMatch: false },
    { key: "demand_supply_loose_b", maxDistance: 0.94, requireLocationMatch: false },
    { key: "demand_supply_same_city", maxDistance: 0.72, requireLocationMatch: true },
  ] as const;

  const NEIGHBOR_FALLBACK_MAX_DISTANCE = 2.0;
  const NEIGHBOR_FALLBACK_LIMIT = 45;

  type SupplyRpcRow = {
    user_id: string;
    display_name: string | null;
    bio: string | null;
    gender: string | null;
    age_group: string | null;
    skills_tags: string[] | null;
    languages: string[] | null;
    location: string | null;
    industry: string | null;
    superpower: string | null;
    linked_intent_id: string | null;
    linked_natural_language_input: string | null;
    distance: number;
    similarity: number;
  };

  function dedupeBestProfileByUser(rows: SupplyRpcRow[]): SupplyRpcRow[] {
    const best = new Map<string, SupplyRpcRow>();
    for (const r of rows) {
      const cur = best.get(r.user_id);
      if (!cur || r.distance < cur.distance) best.set(r.user_id, r);
    }
    return [...best.values()].sort((a, b) => a.distance - b.distance);
  }

  let supplyRows: SupplyRpcRow[] = [];
  let appliedTier = "none";
  let appliedMax = 0;
  let appliedReq = false;
  let rpcError: { message: string } | null = null;
  const retrievalModel = "demand_vs_supply_embedding" as const;
  let supplyTierMaxRowsSeen = 0;
  let neighborSupplyRowsCount: number | null = null;

  for (const tier of MATCH_TIERS) {
    const { data, error: tierErr } = await supabase.rpc("match_profiles", {
      target_embedding: targetEmbeddingRpc,
      p_location: intent.location_filter,
      p_threshold: tier.maxDistance,
      p_limit: 20,
      p_exclude_user_id: user.id,
      p_require_location_match: tier.requireLocationMatch,
    });
    if (tierErr) {
      rpcError = tierErr;
      break;
    }
    const next = (data ?? []) as SupplyRpcRow[];
    supplyTierMaxRowsSeen = Math.max(supplyTierMaxRowsSeen, next.length);
    if (next.length > 0) {
      supplyRows = next;
      appliedTier = tier.key;
      appliedMax = tier.maxDistance;
      appliedReq = tier.requireLocationMatch;
      break;
    }
  }

  if (!rpcError && supplyRows.length === 0) {
    const { data: fbData, error: fbErr } = await supabase.rpc("match_profiles", {
      target_embedding: targetEmbeddingRpc,
      p_location: intent.location_filter,
      p_threshold: NEIGHBOR_FALLBACK_MAX_DISTANCE,
      p_limit: NEIGHBOR_FALLBACK_LIMIT,
      p_exclude_user_id: user.id,
      p_require_location_match: false,
    });
    if (fbErr) {
      rpcError = fbErr;
    } else {
      const next = (fbData ?? []) as SupplyRpcRow[];
      neighborSupplyRowsCount = next.length;
      if (next.length > 0) {
        supplyRows = next;
        appliedTier = "demand_supply_neighbor_fallback";
        appliedMax = NEIGHBOR_FALLBACK_MAX_DISTANCE;
        appliedReq = false;
      }
    }
  }

  if (rpcError) {
    await logPairingScoreEvent({
      source: "hybrid_suggestion",
      actor_user_id: user.id,
      anchor_intent_id: intentId,
      excluded_reason: "discovery_rpc_error",
      meta: {
        pipeline: HYBRID_DISCOVERY_LOG_PIPELINE,
        supabase_message: rpcError.message,
        supply_tier_max_rows_seen: supplyTierMaxRowsSeen,
        neighbor_supply_row_count: neighborSupplyRowsCount,
        mobile_api: true,
      },
    });
    return { ok: false, message: rpcError.message };
  }

  const { data: senderProf } = await supabase
    .from("profiles")
    .select("bio, industry, skills_tags, languages, superpower, gender, attraction_orientation")
    .eq("user_id", user.id)
    .maybeSingle();

  const senderForMatching: MatchingSenderSnapshot = {
    gender: senderProf?.gender ?? null,
    attractionOrientation: senderProf?.attraction_orientation ?? null,
  };

  const POOL_SIZE = 34;
  const poolRows = rankSupplyPoolForPartnerSemantics(
    dedupeBestProfileByUser(supplyRows).filter((r) => !blocking.has(r.user_id)),
    senderForMatching,
    intent.natural_language_input,
    intent.must_haves ?? null,
  ).slice(0, POOL_SIZE);

  if (poolRows.length === 0) {
    let eligibility: unknown = null;
    const { data: eligData, error: eligErr } = await supabase.rpc("discovery_eligibility_counts", {
      p_exclude_user_id: user.id,
    });
    if (eligErr) {
      eligibility = { rpc_error: eligErr.message };
    } else {
      eligibility = eligData;
    }

    await logPairingScoreEvent({
      source: "hybrid_suggestion",
      actor_user_id: user.id,
      anchor_intent_id: intentId,
      excluded_reason:
        supplyRows.length === 0 ? "empty_rpc_retrieval" : "all_candidates_blocked_or_truncated",
      meta: {
        pipeline: HYBRID_DISCOVERY_LOG_PIPELINE,
        anchor_user_id: user.id,
        p_location_for_rpc: intent.location_filter,
        target_embedding_dims:
          targetEmbeddingRpc.startsWith("[") && targetEmbeddingRpc.endsWith("]")
            ? targetEmbeddingRpc.slice(1, -1).split(",").filter(Boolean).length
            : null,
        supply_tier_max_rows_seen: supplyTierMaxRowsSeen,
        neighbor_supply_row_count: neighborSupplyRowsCount,
        supply_rows_before_dedupe: supplyRows.length,
        blocking_peer_count: blocking.size,
        applied_tier: appliedTier,
        applied_max_distance: appliedMax,
        retrieval_model: retrievalModel,
        eligibility,
        mobile_api: true,
      },
    });
  }

  const linkedIds = poolRows.map((r) => r.linked_intent_id).filter((id): id is string => Boolean(id));
  const { data: poolMustRows } =
    linkedIds.length > 0
      ? await supabase.from("intent_requests").select("id, must_haves").in("id", linkedIds)
      : { data: [] as { id: string; must_haves: string | null }[] };
  const mustByIntentId = new Map((poolMustRows ?? []).map((r) => [r.id as string, r.must_haves as string | null]));

  const PROFILE_ONLY_STUB =
    "(No posted Explore listing on file — complementary fit is from this member's saved profile / supply embedding vs your request; a listing is optional.)";

  const scored = await Promise.all(
    poolRows.map(async (row) => {
      const senderSnippet = formatProfileMatchingSnippet({
        bio: senderProf?.bio ?? null,
        industry: senderProf?.industry ?? null,
        skills_tags: senderProf?.skills_tags ?? null,
        languages: senderProf?.languages ?? null,
        superpower: senderProf?.superpower ?? null,
      });
      const candidateSnippet =
        formatProfileMatchingSnippet({
          bio: row.bio ?? null,
          industry: row.industry ?? null,
          skills_tags: row.skills_tags ?? null,
          languages: row.languages ?? null,
          superpower: row.superpower ?? null,
        }) || undefined;

      const candidateIntentText = row.linked_natural_language_input?.trim() || PROFILE_ONLY_STUB;
      const candidateMustHaves = row.linked_intent_id ? mustByIntentId.get(row.linked_intent_id) ?? null : null;
      const discovery_source = row.linked_intent_id ? ("intent" as const) : ("profile" as const);

      try {
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: candidateIntentText,
          senderProfileSnippet: senderSnippet || undefined,
          candidateProfileSnippet: candidateSnippet,
          senderMustHaves: intent.must_haves,
          candidateMustHaves,
          senderLocationPreference: intent.location_filter,
          candidateLocation: row.location,
          senderGender: senderProf?.gender ?? null,
          candidateGender: row.gender ?? null,
          senderAttractionOrientationSlug: senderProf?.attraction_orientation ?? null,
        });
        const capped = applyPartnershipSemanticsScoreCap({
          sender: senderForMatching,
          candidateGender: row.gender ?? null,
          naturalLanguageIntent: intent.natural_language_input,
          mustHaves: intent.must_haves,
          score: vibe.match_score,
        });
        return {
          card: {
            intent_id: row.linked_intent_id,
            owner_user_id: row.user_id,
            natural_language_input: candidateIntentText,
            extracted_persona: null,
            location_filter: row.location,
            distance: row.distance,
            similarity: row.similarity,
            discovery_source,
            peer_display_name: row.display_name,
            peer_bio: row.bio,
            peer_gender: row.gender,
            peer_age_group: row.age_group,
            peer_skills_tags: row.skills_tags,
            peer_languages: row.languages,
            match_score: capped.score,
            compatibility_reason: vibe.compatibility_reason,
          },
          logMeta: {
            candidate_intent_id: row.linked_intent_id,
            similarity: row.similarity,
            rpc_threshold: appliedMax,
            tier: appliedTier,
            require_location_match: appliedReq,
            discovery_source,
          },
        };
      } catch {
        const fb = Math.round((row.similarity ?? 0) * 100);
        const capped = applyPartnershipSemanticsScoreCap({
          sender: senderForMatching,
          candidateGender: row.gender ?? null,
          naturalLanguageIntent: intent.natural_language_input,
          mustHaves: intent.must_haves,
          score: fb,
        });
        return {
          card: {
            intent_id: row.linked_intent_id,
            owner_user_id: row.user_id,
            natural_language_input: candidateIntentText,
            extracted_persona: null,
            location_filter: row.location,
            distance: row.distance,
            similarity: row.similarity,
            discovery_source,
            peer_display_name: row.display_name,
            peer_bio: row.bio,
            peer_gender: row.gender,
            peer_age_group: row.age_group,
            peer_skills_tags: row.skills_tags,
            peer_languages: row.languages,
            match_score: capped.score,
            compatibility_reason:
              "Demand↔supply retrieval — confirm fit manually while AI scoring is unavailable.",
          },
          logMeta: {
            candidate_intent_id: row.linked_intent_id,
            similarity: row.similarity,
            rpc_threshold: appliedMax,
            tier: appliedTier,
            require_location_match: appliedReq,
            discovery_source,
          },
        };
      }
    }),
  );

  scored.sort((a, b) => b.card.match_score - a.card.match_score);

  const qualifying = scored.filter((s) => s.card.match_score >= AI_SUGGESTION_MIN_MATCH_SCORE);
  const suggestionEntriesForLog = qualifying.slice(0, 3);
  const selectedOwnerIdsForLog = new Set(suggestionEntriesForLog.map((s) => s.card.owner_user_id));

  await Promise.all(
    scored.map(({ card, logMeta }, index) => {
      const belowFloor = card.match_score < AI_SUGGESTION_MIN_MATCH_SCORE;
      const selectedTop = selectedOwnerIdsForLog.has(card.owner_user_id);
      return logPairingScoreEvent({
        source: "hybrid_suggestion",
        actor_user_id: user.id,
        anchor_intent_id: intentId,
        candidate_intent_id: logMeta.candidate_intent_id,
        candidate_user_id: card.owner_user_id,
        similarity: logMeta.similarity,
        rpc_threshold: logMeta.rpc_threshold,
        rank_after_sort: index + 1,
        selected_top: selectedTop,
        match_score: card.match_score,
        compatibility_reason: card.compatibility_reason,
        excluded_reason: belowFloor
          ? `below_ai_suggestion_min_${AI_SUGGESTION_MIN_MATCH_SCORE}`
          : selectedTop
            ? null
            : "not_in_top_3_above_min_floor",
        meta: {
          pipeline: HYBRID_DISCOVERY_LOG_PIPELINE,
          pool_size: poolRows.length,
          match_tier: logMeta.tier,
          ai_suggestion_min_match_score: AI_SUGGESTION_MIN_MATCH_SCORE,
          require_location_match: logMeta.require_location_match,
          discovery_source: logMeta.discovery_source,
          retrieval_model: retrievalModel,
          intent_match_tier: null,
          profile_match_tier: appliedTier,
          mobile_api: true,
        },
      });
    }),
  );

  const suggestions: MobileHybridSuggestionCard[] = qualifying.slice(0, 3).map(({ card }) => card);

  try {
    await recordSyncTop3RecommendationsWithClient(
      supabase,
      user.id,
      intentId,
      suggestions.map((c) => ({
        owner_user_id: c.owner_user_id,
        match_score: c.match_score,
        compatibility_reason: c.compatibility_reason,
      })),
    );
  } catch (e) {
    console.error("[runHybridSuggestionsForMobile] recordSyncTop3RecommendationsWithClient:", e);
  }

  return { ok: true, suggestions };
}
