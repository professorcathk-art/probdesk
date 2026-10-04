import { notFound } from "next/navigation";
import { getPublicMarketplaceIntentById, listMarketplaceListings, type MarketplaceListing } from "@/actions/marketplace";
import { ExploreIntentLanding } from "@/components/explore-intent-landing";
import { getAuthContext } from "@/lib/auth-context";
import { meetupKindFrom } from "@/lib/meetup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ intentId: string }>;
};

function relatedListings(all: MarketplaceListing[], current: MarketplaceListing) {
  const kind = meetupKindFrom(current.natural_language_input, current.must_haves);
  const rest = all.filter((item) => item.id !== current.id);
  const same = rest.filter((item) => meetupKindFrom(item.natural_language_input, item.must_haves) === kind);
  const other = rest.filter((item) => meetupKindFrom(item.natural_language_input, item.must_haves) !== kind);
  return [...same, ...other].slice(0, 6);
}

export default async function ExploreIntentPage({ params }: Props) {
  const { intentId } = await params;
  const [res, relatedRes, { user }] = await Promise.all([
    getPublicMarketplaceIntentById(intentId),
    listMarketplaceListings({ guestPreview: true }),
    getAuthContext(),
  ]);
  if ("error" in res) notFound();

  const related = "error" in relatedRes ? [] : relatedListings(relatedRes.listings, res.listing);

  return <ExploreIntentLanding listing={res.listing} related={related} viewerUserId={user?.id ?? null} />;
}
