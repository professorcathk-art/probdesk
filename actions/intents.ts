"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  embedTextSmall,
  generateFollowUpQuestions,
  parseIntentWithMini,
  vibeCheckWith4o,
} from "@/lib/aiml";
import { formatProfileMatchingSnippet } from "@/lib/profile-matching-snippet";
import { validateProfileBasicsForPublish } from "@/lib/profile-basics";
import { normalizeProfileTags } from "@/lib/profile-tags";
import { isAdminEmail } from "@/lib/admin-emails";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";
import { meetupKindFrom, type MeetupKind } from "@/lib/meetup";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";
import { logPairingScoreEvent } from "@/lib/pairing-score-log";
import { BLOCKING_MATCH_STATUSES } from "@/lib/match-blocking";
import { vectorLiteral, embeddingVectorForRpc } from "@/lib/vector-literal";
import { syncOnboardingCompleteFromProfile } from "@/lib/sync-onboarding-complete-from-profile";
import { syncProfileEmbedding } from "@/lib/sync-profile-embedding";
import { asEmbeddingContextRecord, buildDemandEmbeddingText } from "@/lib/demand-supply-embedding";
import { recordImmediateHybridRecommendations } from "@/actions/ai-recommendations";
import {
  AI_SUGGESTION_MIN_MATCH_SCORE,
  applyPartnershipSemanticsScoreCap,
  rankSupplyPoolForPartnerSemantics,
  type MatchingSenderSnapshot,
} from "@/lib/hybrid-ai-suggestion-rules";
import { parseProfileAttractionOrientation } from "@/lib/profile-attraction-orientation";
import { hydrateIntentMatchingSignals } from "@/lib/intent-hydrate-matching-signals";
import { embeddingNoteForMatchingSignals, normalizeIntentMatchingSignals } from "@/lib/intent-matching-signals";

function normalizeMustHaves(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t ? t : null;
}

export type IntentLimitErrorCode = "MAX_ACTIVE_INTENTS";

async function countActiveIntentsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("intent_requests")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) return 0;
  return count ?? 0;
}

export async function getConsoleQuotaSnapshot(): Promise<
  | {
      activeIntentCount: number;
      maxActiveIntents: number;
      unlimitedIntents: boolean;
    }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const unlimitedIntents = isAdminEmail(user.email ?? undefined);
  const activeIntentCount = await countActiveIntentsForUser(supabase, user.id);

  return {
    activeIntentCount,
    maxActiveIntents: MAX_ACTIVE_INTENTS_PER_USER,
    unlimitedIntents,
  };
}

export type IntentRow = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  status: string;
  is_marketplace_public: boolean;
  extracted_persona: Record<string, unknown> | null;
  must_haves: string | null;
};

export async function bootstrapIntentFromLanding(naturalLanguageInput: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, message: "Not authenticated" };
  }

  const ensured = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensured.ok) return { ok: false as const, message: ensured.message };

  if (!isAdminEmail(user.email ?? undefined)) {
    const active = await countActiveIntentsForUser(supabase, user.id);
    if (active >= MAX_ACTIVE_INTENTS_PER_USER) {
      return {
        ok: false as const,
        message: "MAX_ACTIVE_INTENTS",
        code: "MAX_ACTIVE_INTENTS" as const,
      };
    }
  }

  const trimmed = naturalLanguageInput.trim();
  if (trimmed.length < 12) {
    return { ok: false as const, message: "Request is too short." };
  }

  let parsed: Awaited<ReturnType<typeof parseIntentWithMini>>;
  let embedding: number[];

  try {
    parsed = await parseIntentWithMini(trimmed);
    embedding = await embedTextSmall(
      buildDemandEmbeddingText(trimmed, null, {
        extracted_persona: parsed.extracted_persona as Record<string, unknown>,
        semantic_match_hints: embeddingNoteForMatchingSignals(
          normalizeIntentMatchingSignals(parsed.matching_signals),
        ) || undefined,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI pipeline failed";
    return { ok: false as const, message: msg };
  }

  const persona = parsed.extracted_persona as Record<string, unknown>;
  const location_filter =
    parsed.location_filter?.trim() ||
    (typeof persona.location === "string" ? persona.location.trim() : null);

  const matching_signals = normalizeIntentMatchingSignals(parsed.matching_signals);

  const { data: inserted, error } = await supabase
    .from("intent_requests")
    .insert({
      user_id: user.id,
      natural_language_input: trimmed,
      extracted_persona: parsed.extracted_persona,
      matching_signals,
      location_filter,
      embedding: vectorLiteral(embedding),
      demand_embedding: vectorLiteral(embedding),
      status: "active",
      is_marketplace_public: false,
    })
    .select("id, extracted_persona")
    .single();

  if (error || !inserted) {
    return { ok: false as const, message: error?.message ?? "Insert failed" };
  }

  await supabase
    .from("users")
    .update({ onboarding_status: "in_progress" })
    .eq("id", user.id)
    .eq("onboarding_status", "pending");

  let questions: string[] = [];
  try {
    questions = await generateFollowUpQuestions(inserted.extracted_persona as Record<string, unknown>);
  } catch {
    questions = [
      "What cadence works best for intros?",
      "What proof or portfolio should a match see?",
      "What non-negotiables should we respect?",
    ];
  }

  revalidatePath("/console");
  revalidatePath("/onboarding");
  revalidatePath("/profile");

  return {
    ok: true as const,
    intentId: inserted.id as string,
    questions,
    persona: inserted.extracted_persona as Record<string, unknown>,
    locationHint: location_filter,
  };
}

export async function completeOnboarding(params: {
  intentId: string;
  answers: Record<string, string>;
  profile: {
    display_name?: string;
    industry?: string;
    superpower?: string;
    location?: string;
    bio?: string;
    gender?: string;
    preferred_contact_channel?: "whatsapp" | "line" | "wechat" | "" | null;
    preferred_contact_detail?: string;
    skills_tags?: string[];
    languages?: string[];
  };
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, message: "Not authenticated" };
  }

  const ensuredOnboarding = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensuredOnboarding.ok) return { ok: false as const, message: ensuredOnboarding.message };

  const basics = validateProfileBasicsForPublish({
    display_name: params.profile.display_name,
    bio: params.profile.bio,
    location: params.profile.location,
    industry: params.profile.industry,
    superpower: params.profile.superpower,
    gender: params.profile.gender,
    skills_tags: params.profile.skills_tags ?? [],
    languages: params.profile.languages ?? [],
  });
  if (!basics.ok) {
    return { ok: false as const, code: "PROFILE_INCOMPLETE" as const };
  }

  const chRaw = params.profile.preferred_contact_channel?.trim() ?? "";
  const detRaw = params.profile.preferred_contact_detail?.trim() ?? "";
  const hasPair = chRaw.length > 0 && detRaw.length > 0;
  const hasPartial = (chRaw.length > 0) !== (detRaw.length > 0);
  if (hasPartial) {
    return { ok: false as const, message: "Choose both a contact method and your handle, or leave both empty." };
  }
  const allowed = new Set(["whatsapp", "line", "wechat"]);
  if (chRaw && !allowed.has(chRaw)) {
    return { ok: false as const, message: "Invalid contact method." };
  }

  const { error: intentError } = await supabase
    .from("intent_requests")
    .update({
      enrichment: params.answers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .eq("user_id", user.id);

  if (intentError) {
    return { ok: false as const, message: intentError.message };
  }

  const genderTrim = params.profile.gender?.trim() ?? "";

  const superpowerTrim = params.profile.superpower?.trim() ?? "";

  const skillTags = normalizeProfileTags(params.profile.skills_tags ?? [], 5);
  const langTags = normalizeProfileTags(params.profile.languages ?? [], 5);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: params.profile.display_name ?? null,
      industry: params.profile.industry ?? null,
      superpower: superpowerTrim || null,
      location: params.profile.location ?? null,
      bio: params.profile.bio ?? null,
      gender: genderTrim || null,
      preferred_contact_channel: hasPair ? chRaw : null,
      preferred_contact_detail: hasPair ? detRaw : null,
      skills_tags: skillTags,
      languages: langTags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false as const, message: profileError.message };
  }

  const { data: intent } = await supabase
    .from("intent_requests")
    .select("location_filter")
    .eq("id", params.intentId)
    .single();

  if (intent?.location_filter == null && params.profile.location) {
    await supabase
      .from("intent_requests")
      .update({ location_filter: params.profile.location })
      .eq("id", params.intentId)
      .eq("user_id", user.id);
  }

  await syncOnboardingCompleteFromProfile(supabase, user.id);

  revalidatePath("/console");
  revalidatePath("/onboarding");
  revalidatePath("/profile");
  revalidatePath("/marketplace");
  revalidatePath("/square");
  revalidatePath("/");

  const { data: attractionRow } = await supabase
    .from("profiles")
    .select("attraction_orientation")
    .eq("user_id", user.id)
    .maybeSingle();

  const supplyEmb = await syncProfileEmbedding(supabase, user.id, {
    bio: params.profile.bio ?? null,
    industry: params.profile.industry ?? null,
    superpower: superpowerTrim || null,
    skills_tags: skillTags,
    languages: langTags,
    attraction_orientation_slug: parseProfileAttractionOrientation(attractionRow?.attraction_orientation),
  });
  if (!supplyEmb.ok) {
    console.warn("[completeOnboarding] supply_embedding sync did not persist", user.id);
  }

  return { ok: true as const };
}

export async function listMyIntents(): Promise<{ intents: IntentRow[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, location_filter, status, is_marketplace_public, extracted_persona, must_haves")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { intents: (data ?? []) as IntentRow[] };
}

export async function listIntentKinds(ids: string[]): Promise<Record<string, MeetupKind>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 80);
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, must_haves")
    .in("id", unique);
  if (error || !data) return {};
  const out: Record<string, MeetupKind> = {};
  for (const row of data) {
    out[row.id as string] = meetupKindFrom(
      String(row.natural_language_input ?? ""),
      (row.must_haves as string | null) ?? null,
    );
  }
  return out;
}

export async function setIntentMarketplacePublic(intentId: string, isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  if (isPublic) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, bio, location, industry, superpower, gender, skills_tags, languages")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profErr) return { ok: false as const, message: profErr.message };
    const gate = validateProfileBasicsForPublish(prof ?? {});
    if (!gate.ok) return { ok: false as const, message: gate.message };
  }

  const { error } = await supabase
    .from("intent_requests")
    .update({ is_marketplace_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  revalidatePath("/console");
  revalidatePath("/marketplace");
  revalidatePath("/square");
  revalidatePath("/portal/one-to-one");
  revalidatePath("/portal/groups");
  return { ok: true as const };
}

export async function setIntentStatus(
  intentId: string,
  status: "active" | "paused",
): Promise<{ ok: true } | { ok: false; message: string; code?: IntentLimitErrorCode }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  if (status === "active" && !isAdminEmail(user.email ?? undefined)) {
    const { data: row } = await supabase
      .from("intent_requests")
      .select("status")
      .eq("id", intentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (row?.status === "paused") {
      const active = await countActiveIntentsForUser(supabase, user.id);
      if (active >= MAX_ACTIVE_INTENTS_PER_USER) {
        return {
          ok: false as const,
          message: "MAX_ACTIVE_INTENTS",
          code: "MAX_ACTIVE_INTENTS" as const,
        };
      }
    }
  }

  const { error } = await supabase
    .from("intent_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  revalidatePath("/console");
  revalidatePath("/portal/one-to-one");
  revalidatePath("/portal/groups");
  return { ok: true as const };
}

/** Hard-delete the intent row owned by the current user (RLS-enforced). Related AI suggestion rows cascade. */
export async function deleteMyIntent(
  intentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { data: removed, error } = await supabase
    .from("intent_requests")
    .delete()
    .eq("id", intentId)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { ok: false as const, message: error.message };
  if (!removed?.length) return { ok: false as const, message: "Request not found." };

  revalidatePath("/");
  revalidatePath("/console");
  revalidatePath("/marketplace");
  revalidatePath("/square");
  revalidatePath("/portal/one-to-one");
  revalidatePath("/portal/groups");
  return { ok: true as const };
}

export type SuggestionCard = {
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

/** Bumped when hybrid discovery logging / guardrail inputs change materially. */
const HYBRID_DISCOVERY_LOG_PIPELINE = "082-ai-matching-signals-column";

export async function computeHybridSuggestions(intentId: string): Promise<
  | { ok: true; suggestions: SuggestionCard[] }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: intentRow, error } = await supabase
    .from("intent_requests")
    .select(
      "id, natural_language_input, location_filter, demand_embedding, embedding, must_haves, matching_signals",
    )
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

  const matchingSignalsForHybrid = await hydrateIntentMatchingSignals({
    supabase,
    intentId,
    ownerUserId: user.id,
    natural_language_input: intent.natural_language_input,
    must_haves: intent.must_haves ?? null,
    stored_signals: intentRow.matching_signals,
  });

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

  /**
   * Phase 22 retrieval: anchor **demand_embedding** vs candidate **supply_embedding** only (`match_profiles`).
   * No demand-vs-demand fallback — avoids parallel-demand pools and wasted LLM scoring.
   */
  const MATCH_TIERS = [
    { key: "demand_supply_primary", maxDistance: 0.55, requireLocationMatch: false },
    { key: "demand_supply_relaxed", maxDistance: 0.66, requireLocationMatch: false },
    { key: "demand_supply_wide", maxDistance: 0.76, requireLocationMatch: false },
    { key: "demand_supply_loose_a", maxDistance: 0.84, requireLocationMatch: false },
    { key: "demand_supply_loose_b", maxDistance: 0.94, requireLocationMatch: false },
    { key: "demand_supply_same_city", maxDistance: 0.72, requireLocationMatch: true },
  ] as const;

  /** Cosine distance upper bound (~opposite vectors); includes essentially all embedded profiles for KNN ordering. */
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
    matchingSignalsForHybrid,
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
          matchingSignals: matchingSignalsForHybrid,
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
          matchingSignals: matchingSignalsForHybrid,
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
          anchor_goal_lane: matchingSignalsForHybrid.goal_lane,
          ai_suggestion_min_match_score: AI_SUGGESTION_MIN_MATCH_SCORE,
          require_location_match: logMeta.require_location_match,
          discovery_source: logMeta.discovery_source,
          retrieval_model: retrievalModel,
          intent_match_tier: null,
          profile_match_tier: appliedTier,
        },
      });
    }),
  );

  const suggestions: SuggestionCard[] = qualifying.slice(0, 3).map(({ card }) => card);

  try {
    await recordImmediateHybridRecommendations(
      intentId,
      suggestions.map((card) => ({
        owner_user_id: card.owner_user_id,
        match_score: card.match_score,
        compatibility_reason: card.compatibility_reason,
      })),
    );
  } catch (e) {
    console.error("[computeHybridSuggestions] recordImmediateHybridRecommendations:", e);
  }

  return { ok: true, suggestions };
}

export async function createConsoleIntent(
  naturalLanguageInput: string,
  locationFilterInput?: string | null,
  mustHavesInput?: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, message: "Not authenticated" };
  }

  const ensuredCreate = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensuredCreate.ok) return { ok: false as const, message: ensuredCreate.message };

  const { count: existingCount, error: countErr } = await supabase
    .from("intent_requests")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", user.id);

  if (countErr) {
    return { ok: false as const, message: countErr.message };
  }

  if (!isAdminEmail(user.email ?? undefined)) {
    const active = await countActiveIntentsForUser(supabase, user.id);
    if (active >= MAX_ACTIVE_INTENTS_PER_USER) {
      return {
        ok: false as const,
        message: "MAX_ACTIVE_INTENTS",
        code: "MAX_ACTIVE_INTENTS" as const,
      };
    }
  }

  if ((existingCount ?? 0) === 0) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, bio, location, industry, superpower, gender, skills_tags, languages")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profErr) return { ok: false as const, message: profErr.message };
    const gate = validateProfileBasicsForPublish(prof ?? {});
    if (!gate.ok) return { ok: false as const, message: gate.message };
  }

  const trimmed = naturalLanguageInput.trim();
  if (trimmed.length < 12) {
    return { ok: false as const, message: "Request is too short." };
  }

  const must_haves = normalizeMustHaves(mustHavesInput);

  let parsed: Awaited<ReturnType<typeof parseIntentWithMini>>;
  let embedding: number[];

  try {
    parsed = await parseIntentWithMini(trimmed);
    embedding = await embedTextSmall(
      buildDemandEmbeddingText(trimmed, must_haves, {
        extracted_persona: parsed.extracted_persona as Record<string, unknown>,
        semantic_match_hints: embeddingNoteForMatchingSignals(
          normalizeIntentMatchingSignals(parsed.matching_signals),
        ) || undefined,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI pipeline failed";
    return { ok: false as const, message: msg };
  }

  const persona = parsed.extracted_persona as Record<string, unknown>;
  const parsedLoc =
    parsed.location_filter?.trim() ||
    (typeof persona.location === "string" ? persona.location.trim() : null);

  const explicit = locationFilterInput?.trim();
  let location_filter: string | null = null;
  if (explicit) {
    location_filter = explicit;
  } else if (parsedLoc) {
    location_filter = parsedLoc;
  }

  if (!location_filter) {
    const { data: profile } = await supabase.from("profiles").select("location").eq("user_id", user.id).maybeSingle();
    location_filter = profile?.location?.trim() ?? null;
  }

  const { data: inserted, error } = await supabase.from("intent_requests").insert({
    user_id: user.id,
    natural_language_input: trimmed,
    extracted_persona: parsed.extracted_persona,
    matching_signals: normalizeIntentMatchingSignals(parsed.matching_signals),
    location_filter,
    embedding: vectorLiteral(embedding),
    demand_embedding: vectorLiteral(embedding),
    status: "active",
    is_marketplace_public: false,
    must_haves,
  }).select("id").single();

  if (error || !inserted) return { ok: false as const, message: error?.message ?? "Insert failed" };

  await syncOnboardingCompleteFromProfile(supabase, user.id);

  const { data: profForSupply } = await supabase
    .from("profiles")
    .select("bio, industry, superpower, skills_tags, languages, attraction_orientation")
    .eq("user_id", user.id)
    .maybeSingle();

  const supplyEmb = await syncProfileEmbedding(supabase, user.id, {
    bio: profForSupply?.bio ?? null,
    industry: profForSupply?.industry ?? null,
    superpower: profForSupply?.superpower ?? null,
    skills_tags: Array.isArray(profForSupply?.skills_tags) ? profForSupply.skills_tags : [],
    languages: Array.isArray(profForSupply?.languages) ? profForSupply.languages : [],
    attraction_orientation_slug: parseProfileAttractionOrientation(profForSupply?.attraction_orientation),
  });
  if (!supplyEmb.ok) {
    console.warn("[createConsoleIntent] supply_embedding sync did not persist", user.id);
  }

  revalidatePath("/");
  revalidatePath("/console");
  revalidatePath("/square");
  revalidatePath("/portal/one-to-one");
  revalidatePath("/portal/groups");
  return { ok: true as const, intentId: inserted.id as string };
}

export async function updateConsoleIntent(
  intentId: string,
  naturalLanguageInput: string,
  locationFilterInput?: string | null,
  mustHavesInput?: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const trimmed = naturalLanguageInput.trim();
  if (trimmed.length < 12) {
    return { ok: false as const, message: "Request is too short." };
  }

  const must_haves = normalizeMustHaves(mustHavesInput);

  const { data: existing } = await supabase
    .from("intent_requests")
    .select("location_filter, enrichment")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .maybeSingle();

  let parsed: Awaited<ReturnType<typeof parseIntentWithMini>>;
  let embedding: number[];

  try {
    parsed = await parseIntentWithMini(trimmed);
    embedding = await embedTextSmall(
      buildDemandEmbeddingText(trimmed, must_haves, {
        extracted_persona: parsed.extracted_persona as Record<string, unknown>,
        enrichment: asEmbeddingContextRecord(existing?.enrichment),
        semantic_match_hints:
          embeddingNoteForMatchingSignals(normalizeIntentMatchingSignals(parsed.matching_signals)) || undefined,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI pipeline failed";
    return { ok: false as const, message: msg };
  }

  const persona = parsed.extracted_persona as Record<string, unknown>;
  const parsedLoc =
    parsed.location_filter?.trim() ||
    (typeof persona.location === "string" ? persona.location.trim() : null);

  const explicit = locationFilterInput?.trim();
  let location_filter: string | null = null;
  if (explicit) {
    location_filter = explicit;
  } else if (parsedLoc) {
    location_filter = parsedLoc;
  } else {
    location_filter = existing?.location_filter ?? null;
  }

  if (!location_filter) {
    const { data: profile } = await supabase.from("profiles").select("location").eq("user_id", user.id).maybeSingle();
    location_filter = profile?.location?.trim() ?? null;
  }

  const matching_signals_update = normalizeIntentMatchingSignals(parsed.matching_signals);

  const { error } = await supabase
    .from("intent_requests")
    .update({
      natural_language_input: trimmed,
      extracted_persona: parsed.extracted_persona,
      matching_signals: matching_signals_update,
      location_filter,
      embedding: vectorLiteral(embedding),
      demand_embedding: vectorLiteral(embedding),
      must_haves,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };

  await syncOnboardingCompleteFromProfile(supabase, user.id);

  const { data: profForSupply } = await supabase
    .from("profiles")
    .select("bio, industry, superpower, skills_tags, languages, attraction_orientation")
    .eq("user_id", user.id)
    .maybeSingle();

  const supplyEmb = await syncProfileEmbedding(supabase, user.id, {
    bio: profForSupply?.bio ?? null,
    industry: profForSupply?.industry ?? null,
    superpower: profForSupply?.superpower ?? null,
    skills_tags: Array.isArray(profForSupply?.skills_tags) ? profForSupply.skills_tags : [],
    languages: Array.isArray(profForSupply?.languages) ? profForSupply.languages : [],
    attraction_orientation_slug: parseProfileAttractionOrientation(profForSupply?.attraction_orientation),
  });
  if (!supplyEmb.ok) {
    console.warn("[updateConsoleIntent] supply_embedding sync did not persist", user.id);
  }

  revalidatePath("/");
  revalidatePath("/console");
  revalidatePath("/square");
  revalidatePath("/portal/one-to-one");
  revalidatePath("/portal/groups");
  return { ok: true as const };
}
