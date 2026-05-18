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
import { parseIntentLevel } from "@/lib/profile-intent-level";
import { normalizeProfileTags } from "@/lib/profile-tags";
import { isAdminEmail } from "@/lib/admin-emails";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";
import { logPairingScoreEvent } from "@/lib/pairing-score-log";
import { BLOCKING_MATCH_STATUSES } from "@/lib/match-blocking";
import { vectorLiteral } from "@/lib/vector-literal";
import { syncProfileEmbedding } from "@/lib/sync-profile-embedding";

function normalizeMustHaves(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t ? t : null;
}

/** Include expectations text in the embedding so vector search respects constraints. */
function intentEmbeddingSource(main: string, mustHaves: string | null): string {
  if (!mustHaves) return main;
  return `${main}\n\nExpectations: ${mustHaves}`;
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
    embedding = await embedTextSmall(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI pipeline failed";
    return { ok: false as const, message: msg };
  }

  const persona = parsed.extracted_persona as Record<string, unknown>;
  const location_filter =
    parsed.location_filter?.trim() ||
    (typeof persona.location === "string" ? persona.location.trim() : null);

  const { data: inserted, error } = await supabase
    .from("intent_requests")
    .insert({
      user_id: user.id,
      natural_language_input: trimmed,
      extracted_persona: parsed.extracted_persona,
      location_filter,
      embedding: vectorLiteral(embedding),
      status: "active",
      is_marketplace_public: false,
    })
    .select("id, extracted_persona")
    .single();

  if (error || !inserted) {
    return { ok: false as const, message: error?.message ?? "Insert failed" };
  }

  await supabase.from("users").update({ onboarding_status: "in_progress" }).eq("id", user.id);

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
    intent_level?: string;
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
    intent_level: params.profile.intent_level,
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

  const intent_level = parseIntentLevel(params.profile.intent_level ?? "");
  if (!intent_level) {
    return { ok: false as const, code: "PROFILE_INCOMPLETE" as const };
  }

  const superpowerTrim = params.profile.superpower?.trim() ?? "";

  const skillTags = normalizeProfileTags(params.profile.skills_tags ?? [], 5);
  const langTags = normalizeProfileTags(params.profile.languages ?? [], 5);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: params.profile.display_name ?? null,
      industry: params.profile.industry ?? null,
      intent_level,
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

  await syncProfileEmbedding(supabase, user.id, {
    display_name: params.profile.display_name ?? null,
    bio: params.profile.bio ?? null,
    location: params.profile.location ?? null,
    industry: params.profile.industry ?? null,
    superpower: superpowerTrim || null,
    gender: genderTrim || null,
    intent_level,
    skills_tags: skillTags,
    languages: langTags,
  });

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

  await supabase.from("users").update({ onboarding_status: "complete" }).eq("id", user.id);

  revalidatePath("/console");
  revalidatePath("/onboarding");
  revalidatePath("/profile");

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

export async function setIntentMarketplacePublic(intentId: string, isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  if (isPublic) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, bio, location, industry, intent_level, superpower, gender, skills_tags, languages")
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
  revalidatePath("/console");
  revalidatePath("/marketplace");
  revalidatePath("/square");
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
  revalidatePath("/console");
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
    .select("id, natural_language_input, location_filter, embedding, must_haves")
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

  if (!intent.embedding) {
    return { ok: false, message: "This intent could not be processed — please create a new one." };
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
   * Semantic-first against other intents, then fill remaining slots with profile.embedding matches.
   * `match_intents` / `match_profiles` are SECURITY DEFINER and return peer preview columns for the UI.
   */
  const MATCH_TIERS = [
    { key: "semantic_primary", maxDistance: 0.55, requireLocationMatch: false },
    { key: "semantic_relaxed", maxDistance: 0.66, requireLocationMatch: false },
    { key: "semantic_wide", maxDistance: 0.76, requireLocationMatch: false },
    { key: "same_city_boost_fallback", maxDistance: 0.72, requireLocationMatch: true },
  ] as const;

  type IntentRpcRow = {
    intent_id: string;
    owner_user_id: string;
    natural_language_input: string;
    extracted_persona: Record<string, unknown> | null;
    location_filter: string | null;
    distance: number;
    similarity: number;
    peer_display_name: string | null;
    peer_bio: string | null;
    peer_gender: string | null;
    peer_age_group: string | null;
    peer_skills_tags: string[] | null;
    peer_languages: string[] | null;
    peer_industry: string | null;
    peer_intent_level: string | null;
    peer_superpower: string | null;
  };

  type ProfileRpcRow = {
    user_id: string;
    display_name: string | null;
    bio: string | null;
    gender: string | null;
    age_group: string | null;
    skills_tags: string[] | null;
    languages: string[] | null;
    location: string | null;
    industry: string | null;
    intent_level: string | null;
    superpower: string | null;
    distance: number;
    similarity: number;
  };

  function dedupeBestIntentByOwner(rows: IntentRpcRow[]): IntentRpcRow[] {
    const best = new Map<string, IntentRpcRow>();
    for (const r of rows) {
      const cur = best.get(r.owner_user_id);
      if (!cur || r.distance < cur.distance) best.set(r.owner_user_id, r);
    }
    return [...best.values()].sort((a, b) => a.distance - b.distance);
  }

  function dedupeBestProfileByUser(rows: ProfileRpcRow[]): ProfileRpcRow[] {
    const best = new Map<string, ProfileRpcRow>();
    for (const r of rows) {
      const cur = best.get(r.user_id);
      if (!cur || r.distance < cur.distance) best.set(r.user_id, r);
    }
    return [...best.values()].sort((a, b) => a.distance - b.distance);
  }

  let intentRpcRows: IntentRpcRow[] = [];
  let intentTier: (typeof MATCH_TIERS)[number]["key"] = MATCH_TIERS[0].key;
  let intentAppliedMax = MATCH_TIERS[0].maxDistance as number;
  let intentAppliedReq = MATCH_TIERS[0].requireLocationMatch as boolean;
  let rpcError: { message: string } | null = null;

  for (const tier of MATCH_TIERS) {
    const { data, error: tierErr } = await supabase.rpc("match_intents", {
      target_embedding: intent.embedding as unknown as string,
      p_location: intent.location_filter,
      p_threshold: tier.maxDistance,
      p_limit: 24,
      p_exclude_user_id: user.id,
      p_require_location_match: tier.requireLocationMatch,
    });
    if (tierErr) {
      rpcError = tierErr;
      break;
    }
    const next = (data ?? []) as IntentRpcRow[];
    if (next.length > 0) {
      intentRpcRows = next;
      intentTier = tier.key;
      intentAppliedMax = tier.maxDistance;
      intentAppliedReq = tier.requireLocationMatch;
      break;
    }
  }

  if (rpcError) {
    return { ok: false, message: rpcError.message };
  }

  const POOL = 6;
  const intentPick = dedupeBestIntentByOwner(intentRpcRows)
    .filter((r) => !blocking.has(r.owner_user_id))
    .slice(0, POOL);
  const intentOwners = new Set(intentPick.map((r) => r.owner_user_id));

  let profilePick: ProfileRpcRow[] = [];
  let profileTier: (typeof MATCH_TIERS)[number]["key"] = MATCH_TIERS[0].key;
  let profileAppliedMax = MATCH_TIERS[0].maxDistance as number;
  let profileAppliedReq = MATCH_TIERS[0].requireLocationMatch as boolean;

  if (intentPick.length < POOL) {
    let profileRpcErr: { message: string } | null = null;
    for (const tier of MATCH_TIERS) {
      const { data, error: pErr } = await supabase.rpc("match_profiles", {
        target_embedding: intent.embedding as unknown as string,
        p_location: intent.location_filter,
        p_threshold: tier.maxDistance,
        p_limit: 24,
        p_exclude_user_id: user.id,
        p_require_location_match: tier.requireLocationMatch,
      });
      if (pErr) {
        profileRpcErr = pErr;
        break;
      }
      const next = (data ?? []) as ProfileRpcRow[];
      const filtered = dedupeBestProfileByUser(next).filter(
        (r) => !intentOwners.has(r.user_id) && !blocking.has(r.user_id),
      );
      if (filtered.length > 0) {
        profileTier = tier.key;
        profileAppliedMax = tier.maxDistance;
        profileAppliedReq = tier.requireLocationMatch;
        profilePick = filtered.slice(0, POOL - intentPick.length);
        break;
      }
    }
    if (profileRpcErr && intentPick.length === 0) {
      return { ok: false, message: profileRpcErr.message };
    }
  }

  type Unified =
    | { kind: "intent"; row: IntentRpcRow }
    | { kind: "profile"; row: ProfileRpcRow };

  const pool: Unified[] = [...intentPick.map((row) => ({ kind: "intent" as const, row })), ...profilePick.map((row) => ({ kind: "profile" as const, row }))];

  const poolIntentIds = intentPick.map((r) => r.intent_id);
  const { data: poolMustRows } =
    poolIntentIds.length > 0
      ? await supabase.from("intent_requests").select("id, must_haves").in("id", poolIntentIds)
      : { data: [] as { id: string; must_haves: string | null }[] };
  const mustByIntentId = new Map((poolMustRows ?? []).map((r) => [r.id as string, r.must_haves as string | null]));

  const { data: senderProf } = await supabase
    .from("profiles")
    .select("bio, industry, skills_tags, languages, intent_level, superpower")
    .eq("user_id", user.id)
    .maybeSingle();

  const PROFILE_ONLY_INTENT_STUB =
    "(Profile similarity — they have not published a separate Explore request; fit is from their profile.)";

  const scored = await Promise.all(
    pool.map(async (entry) => {
      const senderSnippet = formatProfileMatchingSnippet({
        bio: senderProf?.bio ?? null,
        industry: senderProf?.industry ?? null,
        skills_tags: senderProf?.skills_tags ?? null,
        languages: senderProf?.languages ?? null,
        intent_level: senderProf?.intent_level ?? null,
        superpower: senderProf?.superpower ?? null,
      });

      if (entry.kind === "intent") {
        const row = entry.row;
        const candidateSnippet =
          formatProfileMatchingSnippet({
            bio: row.peer_bio ?? null,
            industry: row.peer_industry ?? null,
            skills_tags: row.peer_skills_tags ?? null,
            languages: row.peer_languages ?? null,
            intent_level: row.peer_intent_level ?? null,
            superpower: row.peer_superpower ?? null,
          }) || undefined;
        try {
          const vibe = await vibeCheckWith4o({
            senderIntent: intent.natural_language_input,
            candidateIntent: row.natural_language_input,
            senderProfileSnippet: senderSnippet || undefined,
            candidateProfileSnippet: candidateSnippet,
            senderMustHaves: intent.must_haves,
            candidateMustHaves: mustByIntentId.get(row.intent_id) ?? null,
            senderLocationPreference: intent.location_filter,
            candidateLocation: row.location_filter,
          });
          return {
            card: {
              intent_id: row.intent_id,
              owner_user_id: row.owner_user_id,
              natural_language_input: row.natural_language_input,
              extracted_persona: row.extracted_persona,
              location_filter: row.location_filter,
              distance: row.distance,
              similarity: row.similarity,
              discovery_source: "intent" as const,
              peer_display_name: row.peer_display_name,
              peer_bio: row.peer_bio,
              peer_gender: row.peer_gender,
              peer_age_group: row.peer_age_group,
              peer_skills_tags: row.peer_skills_tags,
              peer_languages: row.peer_languages,
              match_score: vibe.match_score,
              compatibility_reason: vibe.compatibility_reason,
            },
            logMeta: {
              candidate_intent_id: row.intent_id,
              similarity: row.similarity,
              rpc_threshold: intentAppliedMax,
              tier: intentTier,
              require_location_match: intentAppliedReq,
              discovery_source: "intent" as const,
            },
          };
        } catch {
          return {
            card: {
              intent_id: row.intent_id,
              owner_user_id: row.owner_user_id,
              natural_language_input: row.natural_language_input,
              extracted_persona: row.extracted_persona,
              location_filter: row.location_filter,
              distance: row.distance,
              similarity: row.similarity,
              discovery_source: "intent" as const,
              peer_display_name: row.peer_display_name,
              peer_bio: row.peer_bio,
              peer_gender: row.peer_gender,
              peer_age_group: row.peer_age_group,
              peer_skills_tags: row.peer_skills_tags,
              peer_languages: row.peer_languages,
              match_score: Math.round((row.similarity ?? 0) * 100),
              compatibility_reason:
                "Strong semantic overlap on goals and constraints — worth a careful intro if incentives align.",
            },
            logMeta: {
              candidate_intent_id: row.intent_id,
              similarity: row.similarity,
              rpc_threshold: intentAppliedMax,
              tier: intentTier,
              require_location_match: intentAppliedReq,
              discovery_source: "intent" as const,
            },
          };
        }
      }

      const row = entry.row;
      const candidateSnippet =
        formatProfileMatchingSnippet({
          bio: row.bio ?? null,
          industry: row.industry ?? null,
          skills_tags: row.skills_tags ?? null,
          languages: row.languages ?? null,
          intent_level: row.intent_level ?? null,
          superpower: row.superpower ?? null,
        }) || undefined;
      try {
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: PROFILE_ONLY_INTENT_STUB,
          senderProfileSnippet: senderSnippet || undefined,
          candidateProfileSnippet: candidateSnippet,
          senderMustHaves: intent.must_haves,
          candidateMustHaves: null,
          senderLocationPreference: intent.location_filter,
          candidateLocation: row.location,
        });
        return {
          card: {
            intent_id: null,
            owner_user_id: row.user_id,
            natural_language_input: row.bio?.trim() || PROFILE_ONLY_INTENT_STUB,
            extracted_persona: null,
            location_filter: row.location,
            distance: row.distance,
            similarity: row.similarity,
            discovery_source: "profile" as const,
            peer_display_name: row.display_name,
            peer_bio: row.bio,
            peer_gender: row.gender,
            peer_age_group: row.age_group,
            peer_skills_tags: row.skills_tags,
            peer_languages: row.languages,
            match_score: vibe.match_score,
            compatibility_reason: vibe.compatibility_reason,
          },
          logMeta: {
            candidate_intent_id: null,
            similarity: row.similarity,
            rpc_threshold: profileAppliedMax,
            tier: profileTier,
            require_location_match: profileAppliedReq,
            discovery_source: "profile" as const,
          },
        };
      } catch {
        return {
          card: {
            intent_id: null,
            owner_user_id: row.user_id,
            natural_language_input: row.bio?.trim() || PROFILE_ONLY_INTENT_STUB,
            extracted_persona: null,
            location_filter: row.location,
            distance: row.distance,
            similarity: row.similarity,
            discovery_source: "profile" as const,
            peer_display_name: row.display_name,
            peer_bio: row.bio,
            peer_gender: row.gender,
            peer_age_group: row.age_group,
            peer_skills_tags: row.skills_tags,
            peer_languages: row.languages,
            match_score: Math.round((row.similarity ?? 0) * 100),
            compatibility_reason:
              "Profile signals overlap with what you're looking for — worth a careful intro if incentives align.",
          },
          logMeta: {
            candidate_intent_id: null,
            similarity: row.similarity,
            rpc_threshold: profileAppliedMax,
            tier: profileTier,
            require_location_match: profileAppliedReq,
            discovery_source: "profile" as const,
          },
        };
      }
    }),
  );

  scored.sort((a, b) => b.card.match_score - a.card.match_score);

  void Promise.all(
    scored.map(({ card, logMeta }, index) =>
      logPairingScoreEvent({
        source: "hybrid_suggestion",
        actor_user_id: user.id,
        anchor_intent_id: intentId,
        candidate_intent_id: logMeta.candidate_intent_id,
        candidate_user_id: card.owner_user_id,
        similarity: logMeta.similarity,
        rpc_threshold: logMeta.rpc_threshold,
        rank_after_sort: index + 1,
        selected_top: index < 3,
        match_score: card.match_score,
        compatibility_reason: card.compatibility_reason,
        excluded_reason: index >= 3 ? "not_in_top_3_after_sort" : null,
        meta: {
          pool_size: pool.length,
          match_tier: logMeta.tier,
          require_location_match: logMeta.require_location_match,
          discovery_source: logMeta.discovery_source,
          intent_match_tier: intentTier,
          profile_match_tier: profilePick.length > 0 ? profileTier : null,
        },
      }),
    ),
  );

  const suggestions: SuggestionCard[] = scored.slice(0, 3).map(({ card }) => card);

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
      .select("display_name, bio, location, industry, intent_level, superpower, gender, skills_tags, languages")
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
    embedding = await embedTextSmall(intentEmbeddingSource(trimmed, must_haves));
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
    location_filter,
    embedding: vectorLiteral(embedding),
    status: "active",
    is_marketplace_public: false,
    must_haves,
  }).select("id").single();

  if (error || !inserted) return { ok: false as const, message: error?.message ?? "Insert failed" };

  revalidatePath("/console");
  revalidatePath("/square");
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
    .select("location_filter")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .maybeSingle();

  let parsed: Awaited<ReturnType<typeof parseIntentWithMini>>;
  let embedding: number[];

  try {
    parsed = await parseIntentWithMini(trimmed);
    embedding = await embedTextSmall(intentEmbeddingSource(trimmed, must_haves));
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

  const { error } = await supabase
    .from("intent_requests")
    .update({
      natural_language_input: trimmed,
      extracted_persona: parsed.extracted_persona,
      location_filter,
      embedding: vectorLiteral(embedding),
      must_haves,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/console");
  revalidatePath("/square");
  return { ok: true as const };
}
