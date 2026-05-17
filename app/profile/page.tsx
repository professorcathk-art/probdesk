import { redirect } from "next/navigation";
import { getMyProfileAvatar, getMyProfileIdentity } from "@/actions/profile";
import { ProfilePageClient } from "@/components/profile-page-client";
import { getAuthContext } from "@/lib/auth-context";
import { getProfileCoreFieldIssues, type ProfileCoreFieldKey } from "@/lib/profile-basics";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ required?: string }>;
}) {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  const sp = (await searchParams) ?? {};
  const showProfileRequiredBanner = sp.required === "profile";

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
          available_time: null,
          gender: null,
          preferred_contact_channel: null,
          preferred_contact_detail: null,
        }
      : profileRes;

  return (
    <ProfilePageClient
      profileAvatarUrl={profileAvatarUrl}
      profileIdentity={profileIdentity}
      showProfileRequiredBanner={showProfileRequiredBanner}
      coreFieldIssues={coreFieldIssues}
    />
  );
}
