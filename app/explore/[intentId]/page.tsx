import { notFound } from "next/navigation";
import { getPublicMarketplaceIntentById } from "@/actions/marketplace";
import { ExploreIntentLanding } from "@/components/explore-intent-landing";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ intentId: string }>;
};

export default async function ExploreIntentPage({ params }: Props) {
  const { intentId } = await params;
  const res = await getPublicMarketplaceIntentById(intentId);
  if ("error" in res) notFound();

  const { user } = await getAuthContext();

  return <ExploreIntentLanding listing={res.listing} viewerUserId={user?.id ?? null} />;
}
