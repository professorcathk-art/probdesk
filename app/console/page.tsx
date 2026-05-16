import { redirect } from "next/navigation";
import { getBlockingPeerIdsForCurrentUser, listMatches } from "@/actions/matches";
import { listMyIntents } from "@/actions/intents";
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

  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const blockedPeerIds = "error" in blockedRes ? [] : blockedRes.peerIds;

  return (
    <ConsoleClient
      userId={user.id}
      intents={intents}
      matches={matches}
      blockedPeerIds={blockedPeerIds}
    />
  );
}
