"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  embedTextSmall,
  generateFollowUpQuestions,
  parseIntentWithMini,
  vibeCheckWith4o,
} from "@/lib/aiml";

function vectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export type IntentRow = {
  id: string;
  natural_language_input: string;
  location_filter: string | null;
  status: string;
  is_marketplace_public: boolean;
  extracted_persona: Record<string, unknown> | null;
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

  const trimmed = naturalLanguageInput.trim();
  if (trimmed.length < 12) {
    return { ok: false as const, message: "Intent is too short." };
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
    available_time?: string;
    location?: string;
    bio?: string;
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

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: params.profile.display_name ?? null,
      industry: params.profile.industry ?? null,
      available_time: params.profile.available_time ?? null,
      location: params.profile.location ?? null,
      bio: params.profile.bio ?? null,
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
    .select("id, natural_language_input, location_filter, status, is_marketplace_public, extracted_persona")
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

  const { error } = await supabase
    .from("intent_requests")
    .update({ is_marketplace_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/console");
  revalidatePath("/marketplace");
  return { ok: true as const };
}

export async function setIntentStatus(intentId: string, status: "active" | "paused") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

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
    return { ok: false, message: error?.message ?? "Intent not found" };
  }

  if (!intent.location_filter) {
    return { ok: false, message: "Add a location to your intent or profile to run hybrid search." };
  }

  if (!intent.embedding) {
    return { ok: false, message: "Embedding missing — recreate intent." };
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc("match_intents", {
    target_embedding: intent.embedding as unknown as string,
    p_location: intent.location_filter,
    p_threshold: 0.55,
    p_limit: 12,
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

  const top = rows.slice(0, 3);

  const suggestions: SuggestionCard[] = [];

  for (const row of top) {
    try {
      const vibe = await vibeCheckWith4o({
        senderIntent: intent.natural_language_input,
        candidateIntent: row.natural_language_input,
      });
      suggestions.push({
        ...row,
        extracted_persona: row.extracted_persona,
        match_score: vibe.match_score,
        compatibility_reason: vibe.compatibility_reason,
      });
    } catch {
      suggestions.push({
        ...row,
        extracted_persona: row.extracted_persona,
        match_score: Math.round((row.similarity ?? 0) * 100),
        compatibility_reason:
          "Strong semantic overlap on goals and constraints — worth a careful intro if incentives align.",
      });
    }
  }

  return { ok: true, suggestions };
}
