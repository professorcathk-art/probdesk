import { redirect } from "next/navigation";
import { getMyProfileAvatar, getMyProfileIdentity } from "@/actions/profile";
import { ProfilePageClient } from "@/components/profile-page-client";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  const avatarRes = await getMyProfileAvatar();
  const profileRes = await getMyProfileIdentity();

  const profileAvatarUrl = "error" in avatarRes ? null : avatarRes.avatar_url;
  const profileIdentity =
    "error" in profileRes
      ? { display_name: null, bio: null, location: null, industry: null }
      : profileRes;

  return <ProfilePageClient profileAvatarUrl={profileAvatarUrl} profileIdentity={profileIdentity} />;
}
