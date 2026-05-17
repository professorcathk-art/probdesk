import { redirect } from "next/navigation";
import { getConsoleQuotaSnapshot, listMyIntents } from "@/actions/intents";
import { getBlockingPeerIdsForCurrentUser, listMatches } from "@/actions/matches";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";
import { ConsoleClient } from "./console-client";

export const dynamic = "force-dynamic";

export default async function ConsolePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; peer?: string }>;
}) {
  const { user, onboardingStatus } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (onboardingStatus !== "complete") {
    redirect("/onboarding");
  }

  await ensureProfileCoreCompleteForAppUse();

  const sp = (await searchParams) ?? {};
  const peerRaw = typeof sp.peer === "string" ? sp.peer : undefined;
  const tabRaw = typeof sp.tab === "string" ? sp.tab : undefined;
  const validTabs = ["intents", "requests", "connections"] as const;
  const initialConsoleTab: (typeof validTabs)[number] = validTabs.includes(
    tabRaw as (typeof validTabs)[number],
  )
    ? (tabRaw as (typeof validTabs)[number])
    : peerRaw
      ? "connections"
      : "intents";
  const initialOpenPeerId =
    peerRaw && /^[0-9a-f-]{36}$/i.test(peerRaw) ? peerRaw : null;

  const intentsRes = await listMyIntents();
  const matchesRes = await listMatches();
  const blockedRes = await getBlockingPeerIdsForCurrentUser();

  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const blockedPeerIds = "error" in blockedRes ? [] : blockedRes.peerIds;

  const quotaRes = await getConsoleQuotaSnapshot();
  const quotaSnapshot =
    "error" in quotaRes
      ? { activeIntentCount: 0, maxActiveIntents: MAX_ACTIVE_INTENTS_PER_USER, unlimitedIntents: false }
      : quotaRes;

  return (
    <ConsoleClient
      key={`${initialConsoleTab}-${initialOpenPeerId ?? ""}`}
      userId={user.id}
      intents={intents}
      matches={matches}
      blockedPeerIds={blockedPeerIds}
      initialConsoleTab={initialConsoleTab}
      initialOpenPeerId={initialOpenPeerId}
      quotaSnapshot={quotaSnapshot}
    />
  );
}
