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
};

/** Best-effort: keeps `profiles.supply_embedding` (and legacy `embedding`) aligned for Phase 14 retrieval. */
export async function syncProfileEmbedding(
  supabase: SupabaseClient,
  userId: string,
  source: ProfileSupplyEmbeddingSource,
): Promise<void> {
  try {
    const languages = Array.isArray(source.languages) ? source.languages : [];
    const skills_tags = Array.isArray(source.skills_tags) ? source.skills_tags : [];
    const text = buildSupplyEmbeddingText({
      industry: source.industry ?? null,
      bio: source.bio ?? null,
      superpower: source.superpower ?? null,
      languages,
      skills_tags,
    });
    const vec = await embedTextSmall(text);
    const lit = vectorLiteral(vec);
    await supabase
      .from("profiles")
      .update({ supply_embedding: lit, embedding: lit })
      .eq("user_id", userId);
  } catch {
    /* embedding must never block profile saves */
  }
}
