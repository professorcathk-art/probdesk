export const PROFILE_AGE_GROUP_VALUES = ["18_24", "25_34", "35_44", "45_54", "55_64", "65_plus"] as const;

export type ProfileAgeGroupValue = (typeof PROFILE_AGE_GROUP_VALUES)[number];

export function parseProfileAgeGroup(raw: string | null | undefined): ProfileAgeGroupValue | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  return (PROFILE_AGE_GROUP_VALUES as readonly string[]).includes(t) ? (t as ProfileAgeGroupValue) : null;
}
