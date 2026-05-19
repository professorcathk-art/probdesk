/**
 * Inbound invite preview: **only** fields copied from the sender's saved profile.
 * No LLM paraphrase or invented “signals” — avoids misleading the recipient.
 */
export type FactualSenderPreviewV1 = {
  preview_kind: "factual_v1";
  bio: string | null;
  industry: string | null;
  location: string | null;
  superpower: string | null;
  gender: string | null;
  age_group: string | null;
  skills_tags: string[];
  languages: string[];
};

export type SystemMatchPreviewV1 = {
  preview_kind: "system_match_v1";
  body: string;
};

export function buildFactualSenderPreviewFromProfile(profile: {
  bio: string | null;
  industry: string | null;
  location: string | null;
  superpower: string | null;
  gender: string | null;
  age_group: string | null;
  skills_tags: string[] | null;
  languages: string[] | null;
}): FactualSenderPreviewV1 {
  const uniq = (arr: string[] | null | undefined, max: number) =>
    [...new Set((arr ?? []).map((s) => String(s).trim()).filter(Boolean))].slice(0, max);

  return {
    preview_kind: "factual_v1",
    bio: profile.bio?.trim() || null,
    industry: profile.industry?.trim() || null,
    location: profile.location?.trim() || null,
    superpower: profile.superpower?.trim() || null,
    gender: profile.gender?.trim() || null,
    age_group: profile.age_group?.trim() || null,
    skills_tags: uniq(profile.skills_tags, 24),
    languages: uniq(profile.languages, 24),
  };
}

export function isFactualSenderPreview(raw: unknown): raw is FactualSenderPreviewV1 {
  return Boolean(raw && typeof raw === "object" && (raw as FactualSenderPreviewV1).preview_kind === "factual_v1");
}

export function isSystemMatchPreview(raw: unknown): raw is SystemMatchPreviewV1 {
  return Boolean(raw && typeof raw === "object" && (raw as SystemMatchPreviewV1).preview_kind === "system_match_v1");
}
