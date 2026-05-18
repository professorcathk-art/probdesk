export const PROFILE_AGE_GROUP_VALUES = [
  "18_24",
  "25_29",
  "30_34",
  "35_39",
  "40_44",
  "45_49",
  "50_54",
  "55_64",
  "65_plus",
] as const;

export type ProfileAgeGroupValue = (typeof PROFILE_AGE_GROUP_VALUES)[number];

/** Phrases folded into profile embeddings (English is fine for the vector model). */
export const PROFILE_AGE_GROUP_EMBEDDING_PHRASE: Record<ProfileAgeGroupValue, string> = {
  "18_24": "Age band 18–24",
  "25_29": "Age band 25–29",
  "30_34": "Age band 30–34",
  "35_39": "Age band 35–39",
  "40_44": "Age band 40–44",
  "45_49": "Age band 45–49",
  "50_54": "Age band 50–54",
  "55_64": "Age band 55–64",
  "65_plus": "Age band 65+",
};

export function parseProfileAgeGroup(raw: string | null | undefined): ProfileAgeGroupValue | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  return (PROFILE_AGE_GROUP_VALUES as readonly string[]).includes(t) ? (t as ProfileAgeGroupValue) : null;
}
