/** Uses `strings.profilePage` age band labels (slug `65_plus` → key `ageGroup65Plus`). */
export function displayProfileAgeGroup(
  slug: string | null | undefined,
  labels: {
    ageGroup18_24: string;
    ageGroup25_29: string;
    ageGroup30_34: string;
    ageGroup35_39: string;
    ageGroup40_44: string;
    ageGroup45_49: string;
    ageGroup50_54: string;
    ageGroup55_64: string;
    ageGroup65Plus: string;
  },
): string | null {
  switch (slug?.trim()) {
    case "18_24":
      return labels.ageGroup18_24;
    case "25_29":
      return labels.ageGroup25_29;
    case "30_34":
      return labels.ageGroup30_34;
    case "35_39":
      return labels.ageGroup35_39;
    case "40_44":
      return labels.ageGroup40_44;
    case "45_49":
      return labels.ageGroup45_49;
    case "50_54":
      return labels.ageGroup50_54;
    case "55_64":
      return labels.ageGroup55_64;
    case "65_plus":
      return labels.ageGroup65Plus;
    default:
      return null;
  }
}
