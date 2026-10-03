import { listMarketplaceListings } from "@/actions/marketplace";
import { MeetupHome } from "@/components/meetup/home-screen";
import { getAuthContext } from "@/lib/auth-context";
import type { MeetupKind } from "@/lib/meetup";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; type?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const query = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const type: "all" | MeetupKind = sp.type === "group" || sp.type === "one_to_one" ? sp.type : "all";
  const { user } = await getAuthContext();
  const listingsRes = await listMarketplaceListings({ guestPreview: !user });
  const listings = "error" in listingsRes ? [] : listingsRes.listings;
  const moreAvailable = !("error" in listingsRes) && listingsRes.moreAvailable;

  return (
    <MeetupHome
      listings={listings}
      query={query}
      type={type}
      viewerId={user?.id ?? null}
      moreAvailable={moreAvailable}
    />
  );
}
