/** Values persisted in `profiles.gender` (migration 050). */
export const PROFILE_GENDER_VALUES = ["woman", "man", "non_binary", "prefer_not_say", "other"] as const;
export type ProfileGenderValue = (typeof PROFILE_GENDER_VALUES)[number];

const ALLOWED_GENDER = new Set<string>(PROFILE_GENDER_VALUES);

export type ProfileBasicsInput = {
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  available_time?: string | null;
  gender?: string | null;
};

/** Minimum profile required before using Manage / Explore / etc. (middleware). */
export const PROFILE_CORE_INCOMPLETE_MSG =
  "Please complete your profile: display name, bio (12+ characters), location, and industry. / 請完成個人檔案：顯示名稱、簡介（至少 12 字）、所在地與產業／領域。";

export type ProfileCoreInput = Pick<
  ProfileBasicsInput,
  "display_name" | "bio" | "location" | "industry"
>;

export function validateMandatoryProfileCore(
  row: ProfileCoreInput,
): { ok: true } | { ok: false; message: string } {
  const display_name = row.display_name?.trim() ?? "";
  const bio = row.bio?.trim() ?? "";
  const location = row.location?.trim() ?? "";
  const industry = row.industry?.trim() ?? "";
  if (!display_name || !location || !industry || bio.length < 12) {
    return { ok: false, message: PROFILE_CORE_INCOMPLETE_MSG };
  }
  return { ok: true };
}

/** User-facing when server blocks onboarding completion / explore / first console intent. */
export const PROFILE_BASICS_INCOMPLETE_MSG =
  "Complete your profile first: display name, bio (at least 12 characters), location, industry, availability, and gender. / 請先填妥個人檔案：顯示名稱、簡介（至少 12 字）、所在地、產業、可聯絡時段與性別。";

export function validateProfileBasicsForPublish(
  input: ProfileBasicsInput,
): { ok: true } | { ok: false; message: string } {
  const display_name = input.display_name?.trim() ?? "";
  const bio = input.bio?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  const industry = input.industry?.trim() ?? "";
  const available_time = input.available_time?.trim() ?? "";
  const gender = input.gender?.trim() ?? "";

  if (
    !display_name ||
    !location ||
    !industry ||
    !available_time ||
    bio.length < 12 ||
    !ALLOWED_GENDER.has(gender)
  ) {
    return { ok: false, message: PROFILE_BASICS_INCOMPLETE_MSG };
  }
  return { ok: true };
}

export function parseProfileGender(raw: string | null | undefined): ProfileGenderValue | null {
  const g = raw?.trim() ?? "";
  return ALLOWED_GENDER.has(g) ? (g as ProfileGenderValue) : null;
}
