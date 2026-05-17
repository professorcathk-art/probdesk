import { getSquarePendingIntentIdsForCurrentUser } from "@/actions/matches";
import { listMarketplaceListings } from "@/actions/marketplace";
import { getProfileBasicsGateForInvites } from "@/actions/profile";
import { LandingGalaxyScene } from "@/components/landing-galaxy-scene";
import { LandingPageBody } from "@/components/landing-page-body";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user } = await getAuthContext();

  const listingsRes = await listMarketplaceListings();
  const squareListings = "error" in listingsRes ? [] : listingsRes.listings.slice(0, 48);

  let squarePendingIntentIds: string[] = [];
  if (user) {
    const pendingRes = await getSquarePendingIntentIdsForCurrentUser();
    squarePendingIntentIds = "error" in pendingRes ? [] : pendingRes.intentIds;
  }

  let profileReadyForInvites = true;
  if (user) {
    const gate = await getProfileBasicsGateForInvites();
    profileReadyForInvites = gate.ok;
  }

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
