import { redirect } from "next/navigation";
import { getBlockingPeerIdsForCurrentUser, listMatches } from "@/actions/matches";
import { listMyIntents } from "@/actions/intents";
import { getMyProfileAvatar } from "@/actions/profile";
import { getAuthContext } from "@/lib/auth-context";
import { ConsoleClient } from "./console-client";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const { user, onboardingStatus } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (onboardingStatus !== "complete") {
    redirect("/onboarding");
  }

  const intentsRes = await listMyIntents();
  const matchesRes = await listMatches();
  const blockedRes = await getBlockingPeerIdsForCurrentUser();
  const avatarRes = await getMyProfileAvatar();

  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const blockedPeerIds = "error" in blockedRes ? [] : blockedRes.peerIds;
  const profileAvatarUrl = "error" in avatarRes ? null : avatarRes.avatar_url;

  return (
    <ConsoleClient
      userId={user.id}
      intents={intents}
      matches={matches}
      blockedPeerIds={blockedPeerIds}
      profileAvatarUrl={profileAvatarUrl}
    />
  );
}
