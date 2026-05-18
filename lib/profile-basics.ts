/** Values persisted in `profiles.gender` (migration 050). */
export const PROFILE_GENDER_VALUES = ["woman", "man", "non_binary", "prefer_not_say", "other"] as const;
export type ProfileGenderValue = (typeof PROFILE_GENDER_VALUES)[number];

const ALLOWED_GENDER = new Set<string>(PROFILE_GENDER_VALUES);

/** Publish / listing gate — short value-offer line for matching. */
export const PROFILE_SUPERPOWER_MIN_PUBLISH = 8;
export const PROFILE_SUPERPOWER_MAX = 150;

export type ProfileBasicsInput = {
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  superpower?: string | null;
  gender?: string | null;
  skills_tags?: string[] | null;
  languages?: string[] | null;
};

/** Routing gate (Manage / Explore): minimum bio length in characters (including spaces). */
export const PROFILE_CORE_MIN_BIO_LENGTH = 20;

/** Server-side hint when core routing gate fails (English; UI uses localized `profilePage` strings). */
export const PROFILE_CORE_INCOMPLETE_MSG =
  "Complete required profile fields: display name, bio, location, industry, at least one keyword (interests/traits), and at least one language.";

export type ProfileCoreInput = Pick<
  ProfileBasicsInput,
  "display_name" | "bio" | "location" | "industry" | "skills_tags" | "languages"
>;

function nonEmptyTags(tags: string[] | null | undefined): number {
  if (!Array.isArray(tags)) return 0;
  return tags.map((t) => String(t).trim()).filter(Boolean).length;
}

export function validateMandatoryProfileCore(
  row: ProfileCoreInput,
): { ok: true } | { ok: false; message: string } {
  const display_name = row.display_name?.trim() ?? "";
  const bio = row.bio?.trim() ?? "";
  const location = row.location?.trim() ?? "";
  const industry = row.industry?.trim() ?? "";
  const tagCount = nonEmptyTags(row.skills_tags);
  const langCount = nonEmptyTags(row.languages);
  if (
    !display_name ||
    !location ||
    !industry ||
    bio.length < PROFILE_CORE_MIN_BIO_LENGTH ||
    tagCount < 1 ||
    langCount < 1
  ) {
    return { ok: false, message: PROFILE_CORE_INCOMPLETE_MSG };
  }
  return { ok: true };
}

export type ProfileCoreFieldKey =
  | "display_name"
  | "bio"
  | "location"
  | "industry"
  | "skills_tags"
  | "languages";

/** Which core fields still fail the routing gate (for UI hints). */
export function getProfileCoreFieldIssues(row: ProfileCoreInput): ProfileCoreFieldKey[] {
  const display_name = row.display_name?.trim() ?? "";
  const bio = row.bio?.trim() ?? "";
  const location = row.location?.trim() ?? "";
  const industry = row.industry?.trim() ?? "";
  const tagCount = nonEmptyTags(row.skills_tags);
  const langCount = nonEmptyTags(row.languages);
  const issues: ProfileCoreFieldKey[] = [];
  if (!display_name) issues.push("display_name");
  if (bio.length < PROFILE_CORE_MIN_BIO_LENGTH) issues.push("bio");
  if (!location) issues.push("location");
  if (!industry) issues.push("industry");
  if (tagCount < 1) issues.push("skills_tags");
  if (langCount < 1) issues.push("languages");
  return issues;
}

/** Publish / Explore listing / first console intent (server validation). */
export const PROFILE_BASICS_INCOMPLETE_MSG =
  "Complete your profile: display name, bio (at least 20 characters), location, industry, a short what-you-offer line (8-150 characters), gender, at least one keyword (interests or traits), and at least one spoken language.";

export function validateProfileBasicsForPublish(
  input: ProfileBasicsInput,
): { ok: true } | { ok: false; message: string } {
  const display_name = input.display_name?.trim() ?? "";
  const bio = input.bio?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  const industry = input.industry?.trim() ?? "";
  const superpower = input.superpower?.trim() ?? "";
  const gender = input.gender?.trim() ?? "";
  const tagCount = nonEmptyTags(input.skills_tags);
  const langCount = nonEmptyTags(input.languages);

  if (
    !display_name ||
    !location ||
    !industry ||
    superpower.length < PROFILE_SUPERPOWER_MIN_PUBLISH ||
    superpower.length > PROFILE_SUPERPOWER_MAX ||
    bio.length < PROFILE_CORE_MIN_BIO_LENGTH ||
    !ALLOWED_GENDER.has(gender) ||
    tagCount < 1 ||
    langCount < 1
  ) {
    return { ok: false, message: PROFILE_BASICS_INCOMPLETE_MSG };
  }
  return { ok: true };
}

export function parseProfileGender(raw: string | null | undefined): ProfileGenderValue | null {
  const g = raw?.trim() ?? "";
  return ALLOWED_GENDER.has(g) ? (g as ProfileGenderValue) : null;
}
