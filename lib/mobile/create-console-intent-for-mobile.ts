import type { SupabaseClient, User } from "@supabase/supabase-js";
import { embedTextSmall, parseIntentWithMini } from "@/lib/aiml";
import { isAdminEmail } from "@/lib/admin-emails";
import { buildDemandEmbeddingText } from "@/lib/demand-supply-embedding";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";
import { validateProfileBasicsForPublish } from "@/lib/profile-basics";
import { syncOnboardingCompleteFromProfile } from "@/lib/sync-onboarding-complete-from-profile";
import { syncProfileEmbedding } from "@/lib/sync-profile-embedding";
import { vectorLiteral } from "@/lib/vector-literal";
import { countActiveIntentsForUser } from "@/lib/mobile/count-active-intents";
import { normalizeMustHaves } from "@/lib/mobile/normalize-must-haves";
import { parseProfileAttractionOrientation } from "@/lib/profile-attraction-orientation";

export type CreateConsoleIntentMobileResult =
  | { ok: true; intentId: string }
  | { ok: false; message: string; code?: "MAX_ACTIVE_INTENTS" };

/**
 * Same behavior as server action `createConsoleIntent`, without Next.js cache hooks.
 */
export async function createConsoleIntentForMobile(
  supabase: SupabaseClient,
  user: User,
  params: {
    naturalLanguageInput: string;
    locationFilterInput?: string | null;
    mustHavesInput?: string | null;
  },
): Promise<CreateConsoleIntentMobileResult> {
  const ensuredCreate = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensuredCreate.ok) return { ok: false, message: ensuredCreate.message };

  const { count: existingCount, error: countErr } = await supabase
    .from("intent_requests")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", user.id);

  if (countErr) {
    return { ok: false, message: countErr.message };
  }

  if (!isAdminEmail(user.email ?? undefined)) {
    const active = await countActiveIntentsForUser(supabase, user.id);
    if (active >= MAX_ACTIVE_INTENTS_PER_USER) {
      return { ok: false, message: "MAX_ACTIVE_INTENTS", code: "MAX_ACTIVE_INTENTS" };
    }
  }

  if ((existingCount ?? 0) === 0) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, bio, location, industry, superpower, gender, skills_tags, languages")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profErr) return { ok: false, message: profErr.message };
    const gate = validateProfileBasicsForPublish(prof ?? {});
    if (!gate.ok) return { ok: false, message: gate.message };
  }

  const trimmed = params.naturalLanguageInput.trim();
  if (trimmed.length < 12) {
    return { ok: false, message: "Request is too short." };
  }

  const must_haves = normalizeMustHaves(params.mustHavesInput);

  let parsed: Awaited<ReturnType<typeof parseIntentWithMini>>;
  let embedding: number[];

  try {
    parsed = await parseIntentWithMini(trimmed);
    embedding = await embedTextSmall(
      buildDemandEmbeddingText(trimmed, must_haves, {
        extracted_persona: parsed.extracted_persona as Record<string, unknown>,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI pipeline failed";
    return { ok: false, message: msg };
  }

  const persona = parsed.extracted_persona as Record<string, unknown>;
  const parsedLoc =
    parsed.location_filter?.trim() ||
    (typeof persona.location === "string" ? persona.location.trim() : null);

  const explicit = params.locationFilterInput?.trim();
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

  const { data: inserted, error } = await supabase
    .from("intent_requests")
    .insert({
      user_id: user.id,
      natural_language_input: trimmed,
      extracted_persona: parsed.extracted_persona,
      location_filter,
      embedding: vectorLiteral(embedding),
      demand_embedding: vectorLiteral(embedding),
      status: "active",
      is_marketplace_public: false,
      must_haves,
    })
    .select("id")
    .single();

  if (error || !inserted) return { ok: false, message: error?.message ?? "Insert failed" };

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
    console.warn("[createConsoleIntentForMobile] supply_embedding sync did not persist", user.id);
  }

  return { ok: true, intentId: inserted.id as string };
}
