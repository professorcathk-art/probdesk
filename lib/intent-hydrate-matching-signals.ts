import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIntentMatchingSignalsMini } from "@/lib/aiml";
import { screeningTextForAi } from "@/lib/meetup";
import {
  FALLBACK_MIXED_SIGNALS,
  normalizeIntentMatchingSignals,
  type IntentMatchingSignals,
} from "@/lib/intent-matching-signals";

/**
 * Normalize stored JSONB; if absent, computes via mini-model and persists (legacy intents).
 */
export async function hydrateIntentMatchingSignals(params: {
  supabase: SupabaseClient;
  intentId: string;
  ownerUserId: string;
  natural_language_input: string;
  must_haves: string | null;
  location?: string | null;
  /** Raw `matching_signals` from DB (`null` = never classified / legacy row). */
  stored_signals: unknown;
}): Promise<IntentMatchingSignals> {
  if (params.stored_signals != null) {
    return normalizeIntentMatchingSignals(params.stored_signals);
  }

  const blob = screeningTextForAi({
    naturalLanguage: params.natural_language_input,
    mustHaves: params.must_haves,
    location: params.location,
  }).slice(0, 8000);
  try {
    const sig = await parseIntentMatchingSignalsMini(blob);
    const { error } = await params.supabase
      .from("intent_requests")
      .update({
        matching_signals: sig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.intentId)
      .eq("user_id", params.ownerUserId);
    if (error) {
      console.warn("[hydrateIntentMatchingSignals] persist failed:", error.message);
    }
    return sig;
  } catch (e) {
    console.warn("[hydrateIntentMatchingSignals] AIML classify failed:", e);
    return FALLBACK_MIXED_SIGNALS;
  }
}
