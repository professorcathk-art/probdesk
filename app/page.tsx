import { getSquarePendingIntentIdsForCurrentUser } from "@/actions/matches";
import { listMarketplaceListings } from "@/actions/marketplace";
import { getProfileBasicsGateForInvites } from "@/actions/profile";
import { LandingGalaxyScene } from "@/components/landing-galaxy-scene";
import { LandingPageBody } from "@/components/landing-page-body";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user } = await getAuthContext();

  const [listingsRes, pendingRes, inviteGate] = await Promise.all([
    listMarketplaceListings(),
    user ? getSquarePendingIntentIdsForCurrentUser() : Promise.resolve({ intentIds: [] as string[] }),
    user ? getProfileBasicsGateForInvites() : Promise.resolve({ ok: true as const }),
  ]);

  const squareListings = "error" in listingsRes ? [] : listingsRes.listings.slice(0, 48);
  const squarePendingIntentIds = "error" in pendingRes ? [] : pendingRes.intentIds;
  const profileReadyForInvites = inviteGate.ok;

  return (
    <div className="relative min-h-screen text-slate-50">
      <LandingGalaxyScene />
      <LandingPageBody
        user={user}
        squareListings={squareListings}
        squarePendingIntentIds={squarePendingIntentIds}
        profileReadyForInvites={profileReadyForInvites}
      />
    </div>
  );
}
