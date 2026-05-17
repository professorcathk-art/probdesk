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

function vectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

function normalizeMustHaves(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t ? t : null;
}

/** Include must-haves in the embedding text so vector search respects constraints. */
function intentEmbeddingSource(main: string, mustHaves: string | null): string {
  if (!mustHaves) return main;
  return `${main}\n\nMust-haves: ${mustHaves}`;
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
  intent_id: string;
  owner_user_id: string;
  natural_language_input: string;
  extracted_persona: Record<string, unknown> | null;
  location_filter: string | null;
  distance: number;
  similarity: number;
  match_score: number;
  compatibility_reason: string;
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

  const { data: intent, error } = await supabase
    .from("intent_requests")
    .select("id, natural_language_input, location_filter, embedding")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .single();

  if (error || !intent) {
    return { ok: false, message: error?.message ?? "Request not found" };
  }

  if (!intent.location_filter) {
    return { ok: false, message: "Add a location to your intent or profile so we can discover matches nearby." };
  }

  if (!intent.embedding) {
    return { ok: false, message: "This intent could not be processed — please create a new one." };
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc("match_intents", {
    target_embedding: intent.embedding as unknown as string,
    p_location: intent.location_filter,
    p_threshold: 0.55,
    p_limit: 24,
    p_exclude_user_id: user.id,
  });

  if (rpcError) {
    return { ok: false, message: rpcError.message };
  }

  const rows = (rpcRows ?? []) as {
    intent_id: string;
    owner_user_id: string;
    natural_language_input: string;
    extracted_persona: Record<string, unknown> | null;
    location_filter: string | null;
    distance: number;
    similarity: number;
  }[];

  const pool = rows.slice(0, 6);

  const { data: senderProf } = await supabase
    .from("profiles")
    .select("bio, industry, skills_tags, languages, intent_level, superpower")
    .eq("user_id", user.id)
    .maybeSingle();

  const ownerIds = [...new Set(pool.map((r) => r.owner_user_id))];
  const { data: ownerProfiles } = await supabase
    .from("profiles")
    .select("user_id, bio, industry, skills_tags, languages, intent_level, superpower")
    .in("user_id", ownerIds);

  const profMap = new Map((ownerProfiles ?? []).map((p) => [p.user_id as string, p]));

  const scored = await Promise.all(
    pool.map(async (row) => {
      try {
        const cand = profMap.get(row.owner_user_id);
        const senderSnippet = formatProfileMatchingSnippet({
          bio: senderProf?.bio ?? null,
          industry: senderProf?.industry ?? null,
          skills_tags: senderProf?.skills_tags ?? null,
          languages: senderProf?.languages ?? null,
          intent_level: senderProf?.intent_level ?? null,
          superpower: senderProf?.superpower ?? null,
        });
        const candidateSnippet = formatProfileMatchingSnippet({
          bio: cand?.bio ?? null,
          industry: cand?.industry ?? null,
          skills_tags: cand?.skills_tags ?? null,
          languages: cand?.languages ?? null,
          intent_level: cand?.intent_level ?? null,
          superpower: cand?.superpower ?? null,
        });
        const vibe = await vibeCheckWith4o({
          senderIntent: intent.natural_language_input,
          candidateIntent: row.natural_language_input,
          senderProfileSnippet: senderSnippet || undefined,
          candidateProfileSnippet: candidateSnippet || undefined,
        });
        return {
          row,
          match_score: vibe.match_score,
          compatibility_reason: vibe.compatibility_reason,
        };
      } catch {
        return {
          row,
          match_score: Math.round((row.similarity ?? 0) * 100),
          compatibility_reason:
            "Strong semantic overlap on goals and constraints — worth a careful intro if incentives align.",
        };
      }
    }),
  );

  scored.sort((a, b) => b.match_score - a.match_score);

  const suggestions: SuggestionCard[] = scored.slice(0, 3).map(({ row, match_score, compatibility_reason }) => ({
    ...row,
    extracted_persona: row.extracted_persona,
    match_score,
    compatibility_reason,
  }));

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
