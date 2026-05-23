import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTextSmall } from "@/lib/aiml";
import { buildSupplyEmbeddingText } from "@/lib/demand-supply-embedding";
import { vectorLiteral } from "@/lib/vector-literal";

export type ProfileSupplyEmbeddingSource = {
  industry?: string | null;
  bio?: string | null;
  superpower?: string | null;
  languages?: string[] | null;
  skills_tags?: string[] | null;
  /** Optional headline / role for supply vector prefix (Phase 24); no demand / intent text here */
  role?: string | null;
};

/** Keeps `profiles.supply_embedding` (and legacy `embedding`) aligned — profile fields only (Phase 22). */
export async function syncProfileEmbedding(
  supabase: SupabaseClient,
  userId: string,
  source: ProfileSupplyEmbeddingSource,
): Promise<{ ok: boolean }> {
  try {
    const languages = Array.isArray(source.languages) ? source.languages : [];
    const skills_tags = Array.isArray(source.skills_tags) ? source.skills_tags : [];
    const text = buildSupplyEmbeddingText({
      industry: source.industry ?? null,
      bio: source.bio ?? null,
      superpower: source.superpower ?? null,
      languages,
      skills_tags,
      role: source.role ?? null,
    });
    const vec = await embedTextSmall(text);
    const lit = vectorLiteral(vec);
    const { data, error } = await supabase
      .from("profiles")
      .update({ supply_embedding: lit, embedding: lit })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (error) {
      console.error("[syncProfileEmbedding] Supabase update failed", userId, error.message);
      return { ok: false };
    }
    if (!data) {
      console.error(
        "[syncProfileEmbedding] No profile row updated (missing profiles row or RLS blocked)",
        userId,
      );
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[syncProfileEmbedding] Unexpected failure", userId, e);
    return { ok: false };
  }
}
