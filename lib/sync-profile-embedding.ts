import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTextSmall } from "@/lib/aiml";
import { vectorLiteral } from "@/lib/vector-literal";

export function buildProfileEmbeddingText(p: {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  industry: string | null;
  superpower: string | null;
  gender: string | null;
  intent_level: string | null;
  skills_tags: string[];
  languages: string[];
  age_group?: string | null;
}): string {
  const chunks: string[] = [];
  if (p.display_name?.trim()) chunks.push(`Name: ${p.display_name.trim()}`);
  if (p.bio?.trim()) chunks.push(p.bio.trim());
  if (p.industry?.trim()) chunks.push(`Industry: ${p.industry.trim()}`);
  if (p.superpower?.trim()) chunks.push(`Offers: ${p.superpower.trim()}`);
  if (p.intent_level?.trim()) chunks.push(`Intent level: ${p.intent_level.trim()}`);
  if (p.gender?.trim()) chunks.push(`Gender: ${p.gender.trim()}`);
  const ageBand =
    p.age_group?.trim() &&
    ({
      "18_24": "Age band 18–24",
      "25_34": "Age band 25–34",
      "35_44": "Age band 35–44",
      "45_54": "Age band 45–54",
      "55_64": "Age band 55–64",
      "65_plus": "Age band 65+",
    }[p.age_group.trim()] as string | undefined);
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
