import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTextSmall } from "@/lib/aiml";
import { PROFILE_AGE_GROUP_EMBEDDING_PHRASE, type ProfileAgeGroupValue } from "@/lib/profile-age-groups";
import { vectorLiteral } from "@/lib/vector-literal";

export function buildProfileEmbeddingText(p: {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  industry: string | null;
  superpower: string | null;
  gender: string | null;
  skills_tags: string[];
  languages: string[];
  age_group?: string | null;
}): string {
  const chunks: string[] = [];
  if (p.display_name?.trim()) chunks.push(`Name: ${p.display_name.trim()}`);
  if (p.bio?.trim()) chunks.push(p.bio.trim());
  if (p.industry?.trim()) chunks.push(`Industry: ${p.industry.trim()}`);
  if (p.superpower?.trim()) chunks.push(`Offers: ${p.superpower.trim()}`);
  if (p.gender?.trim()) chunks.push(`Gender: ${p.gender.trim()}`);
  const raw = p.age_group?.trim();
  const ageBand =
    raw && raw in PROFILE_AGE_GROUP_EMBEDDING_PHRASE
      ? PROFILE_AGE_GROUP_EMBEDDING_PHRASE[raw as ProfileAgeGroupValue]
      : undefined;
  if (ageBand) chunks.push(ageBand);
  if (p.location?.trim()) chunks.push(`Location: ${p.location.trim()}`);
  if (p.skills_tags.length) chunks.push(`Interests / keywords: ${p.skills_tags.join(", ")}`);
  if (p.languages.length) chunks.push(`Languages: ${p.languages.join(", ")}`);
  const body = chunks.filter(Boolean).join("\n\n");
  return body.length >= 8 ? body : "Networking member profile";
}

/** Best-effort: keeps `profiles.embedding` aligned for semantic discovery. */
export async function syncProfileEmbedding(
  supabase: SupabaseClient,
  userId: string,
  source: Parameters<typeof buildProfileEmbeddingText>[0],
): Promise<void> {
  try {
    const text = buildProfileEmbeddingText(source);
    const vec = await embedTextSmall(text);
    await supabase.from("profiles").update({ embedding: vectorLiteral(vec) }).eq("user_id", userId);
  } catch {
    /* embedding must never block profile saves */
  }
}
