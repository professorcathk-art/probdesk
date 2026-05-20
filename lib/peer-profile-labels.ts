/** Map stored profile gender slugs to localized labels (same rules as console discovery cards). */
export function peerGenderLabelFromSlug(
  raw: string | null | undefined,
  t: {
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  },
): string | null {
  switch (raw?.trim()) {
    case "woman":
      return t.genderWoman;
    case "man":
      return t.genderMan;
    case "non_binary":
      return t.genderNonBinary;
    case "prefer_not_say":
      return t.genderPreferNotSay;
    case "other":
      return t.genderOther;
    default:
      return null;
  }
}
