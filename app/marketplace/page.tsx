import { getConsoleQuotaSnapshot } from "@/actions/intents";
import { getSquarePendingIntentIdsForCurrentUser } from "@/actions/matches";
import { listMarketplaceListings } from "@/actions/marketplace";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { MarketplaceFeed } from "@/components/marketplace-feed";
import { getProfileBasicsGateForInvites } from "@/actions/profile";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";
import { MAX_ACTIVE_INTENTS_PER_USER } from "@/lib/limits";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string; connectTo?: string }>;
}) {
  await ensureProfileCoreCompleteForAppUse();
  const sp = (await searchParams) ?? {};
  const intentHighlight = typeof sp.intent === "string" ? sp.intent : undefined;
  const connectToRaw = typeof sp.connectTo === "string" ? sp.connectTo.trim() : "";
  const connectToIntentId = /^[0-9a-f-]{36}$/i.test(connectToRaw) ? connectToRaw : undefined;

  const res = await listMarketplaceListings();
  const listings = "error" in res ? [] : res.listings;
  const { user } = await getAuthContext();
  const pendingRes = await getSquarePendingIntentIdsForCurrentUser();
  const pendingIntentIds = "error" in pendingRes ? [] : pendingRes.intentIds;

  const quotaRes = user ? await getConsoleQuotaSnapshot() : null;
  const quotaSnapshot =
    quotaRes && !("error" in quotaRes)
      ? quotaRes
      : { activeIntentCount: 0, maxActiveIntents: MAX_ACTIVE_INTENTS_PER_USER, unlimitedIntents: false };

  const inviteGate = user ? await getProfileBasicsGateForInvites() : { ok: true as const };

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <MarketplaceFeed
          listings={listings}
          currentUserId={user?.id ?? null}
          pendingIntentIds={pendingIntentIds}
          highlightIntentId={intentHighlight}
          connectToIntentId={connectToIntentId}
          exploreBasePath="/marketplace"
          profileReadyForInvites={inviteGate.ok}
          loadError={"error" in res ? res.error : null}
          quotaSnapshot={user?.id ? quotaSnapshot : null}
        />
      </div>
    </div>
  );
}
