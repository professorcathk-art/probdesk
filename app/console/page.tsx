import { redirect } from "next/navigation";
import { getConsoleQuotaSnapshot, listMyIntents } from "@/actions/intents";
import { getBlockingPeerIdsForCurrentUser, listMatches } from "@/actions/matches";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";
import { ConsoleClient } from "./console-client";
import { listMyAiRecommendations } from "@/actions/ai-recommendations";
import { getProfileBasicsGateForInvites } from "@/actions/profile";

export const dynamic = "force-dynamic";

export default async function ConsolePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; cue?: string }>;
}) {
  const { user } = await getAuthContext();

  if (!user) {
    redirect("/login?after=%2Fconsole");
  }

  await ensureProfileCoreCompleteForAppUse();

  const sp = (await searchParams) ?? {};
  const tabRaw = typeof sp.tab === "string" ? sp.tab : undefined;
  const cueRaw = typeof sp.cue === "string" ? sp.cue : undefined;
  const initialConsoleCue =
    cueRaw === "pulseCreateIntent" || cueRaw === "openIntentDraft" ? cueRaw : null;
  const validTabs = ["intents", "requests", "connections"] as const;
  const initialConsoleTab: (typeof validTabs)[number] = validTabs.includes(
    tabRaw as (typeof validTabs)[number],
  )
    ? (tabRaw as (typeof validTabs)[number])
    : "intents";

  const [intentsRes, matchesRes, blockedRes, quotaRes, inviteGate, aiRecRes] = await Promise.all([
    listMyIntents(),
    listMatches(),
    getBlockingPeerIdsForCurrentUser(),
    getConsoleQuotaSnapshot(),
    getProfileBasicsGateForInvites(),
    listMyAiRecommendations(),
  ]);

  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const blockedPeerIds = "error" in blockedRes ? [] : blockedRes.peerIds;
  const aiRecommendations = aiRecRes.ok ? aiRecRes.rows : [];

  const quotaSnapshot =
    "error" in quotaRes
      ? { activeIntentCount: 0, maxActiveIntents: MAX_ACTIVE_INTENTS_PER_USER, unlimitedIntents: false }
      : quotaRes;

  return (
    <ConsoleClient
      /** Stable key: do not derive from cue/tab — cue is stripped client-side while revalidation refetches `/console`; a changing key remounts the client and wipes discovery modal state. */
      key={user.id}
      userId={user.id}
      intents={intents}
      matches={matches}
      blockedPeerIds={blockedPeerIds}
      aiRecommendations={aiRecommendations}
      initialConsoleTab={initialConsoleTab}
      initialConsoleCue={initialConsoleCue}
      quotaSnapshot={quotaSnapshot}
      profileReadyForInvites={inviteGate.ok}
    />
  );
}
