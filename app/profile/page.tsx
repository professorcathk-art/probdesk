import { redirect } from "next/navigation";
import { getMyProfileAvatar, getMyProfileIdentity } from "@/actions/profile";
import { ProfilePageClient } from "@/components/profile-page-client";
import { getAuthContext } from "@/lib/auth-context";
import { getProfileCoreFieldIssues, type ProfileCoreFieldKey } from "@/lib/profile-basics";
import { sanitizeInternalRedirect } from "@/lib/sanitize-redirect";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ required?: string; after?: string }>;
}) {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/login?after=%2Fprofile");
  }

  const sp = (await searchParams) ?? {};
  const showProfileRequiredBanner = sp.required === "profile";
  const redirectAfterSave = sanitizeInternalRedirect(typeof sp.after === "string" ? sp.after : undefined);

  const avatarRes = await getMyProfileAvatar();
  const profileRes = await getMyProfileIdentity();

  let coreFieldIssues: ProfileCoreFieldKey[] = [];
  if (showProfileRequiredBanner && !("error" in profileRes)) {
    coreFieldIssues = getProfileCoreFieldIssues(profileRes);
  }

  const profileAvatarUrl = "error" in avatarRes ? null : avatarRes.avatar_url;
  const profileIdentity =
    "error" in profileRes
      ? {
          display_name: null,
          bio: null,
          location: null,
          industry: null,
          superpower: null,
          gender: null,
          age_group: null,
          preferred_contact_channel: null,
          preferred_contact_detail: null,
          skills_tags: [],
          languages: [],
          social_link: null,
          album_storage_paths: [],
        }
      : profileRes;

  return (
    <ProfilePageClient
      profileAvatarUrl={profileAvatarUrl}
      profileIdentity={profileIdentity}
      showProfileRequiredBanner={showProfileRequiredBanner}
      coreFieldIssues={coreFieldIssues}
      redirectAfterSave={redirectAfterSave}
    />
  );
}
