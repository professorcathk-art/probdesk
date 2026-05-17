import { getSquarePendingIntentIdsForCurrentUser } from "@/actions/matches";
import { listMarketplaceListings } from "@/actions/marketplace";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { MarketplaceFeed } from "@/components/marketplace-feed";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  await ensureProfileCoreCompleteForAppUse();
  const sp = (await searchParams) ?? {};
  const intentHighlight = typeof sp.intent === "string" ? sp.intent : undefined;

  const res = await listMarketplaceListings();
  const listings = "error" in res ? [] : res.listings;
  const { user } = await getAuthContext();
  const pendingRes = await getSquarePendingIntentIdsForCurrentUser();
  const pendingIntentIds = "error" in pendingRes ? [] : pendingRes.intentIds;

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <MarketplaceFeed
          listings={listings}
          currentUserId={user?.id ?? null}
          pendingIntentIds={pendingIntentIds}
          highlightIntentId={intentHighlight}
          loadError={"error" in res ? res.error : null}
        />
      </div>
    </div>
  );
}
