import { PROFILE_GENDER_VALUES, type ProfileGenderValue } from "@/lib/profile-basics";

export type GenderLabelStrings = {
  genderWoman: string;
  genderMan: string;
  genderNonBinary: string;
  genderPreferNotSay: string;
  genderOther: string;
};

/** Maps stored profile gender value to a display label; unknown raw strings pass through. */
export function displayGenderLabel(raw: string | null | undefined, labels: GenderLabelStrings): string | null {
  const g = raw?.trim();
  if (!g) return null;
  if (!PROFILE_GENDER_VALUES.includes(g as ProfileGenderValue)) return g;
  switch (g as ProfileGenderValue) {
    case "woman":
      return labels.genderWoman;
    case "man":
      return labels.genderMan;
    case "non_binary":
      return labels.genderNonBinary;
    case "prefer_not_say":
      return labels.genderPreferNotSay;
    case "other":
      return labels.genderOther;
  }
}
