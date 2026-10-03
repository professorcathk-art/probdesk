"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/actions/marketplace";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { MarketplaceListingIdentity } from "@/components/marketplace-listing-identity";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  listing: MarketplaceListing;
  viewerUserId: string | null;
};

export function ExploreIntentLanding({ listing, viewerUserId }: Props) {
  const { strings } = useLanguage();
  const mp = strings.marketplace;
  const x = strings.exploreIntent;

  const isOwner = viewerUserId !== null && listing.user_id === viewerUserId;

  const primaryHref = !viewerUserId
    ? `/login?flow=pending_connect&connectIntent=${encodeURIComponent(listing.id)}`
    : isOwner
      ? "/console"
      : `/square?connectTo=${encodeURIComponent(listing.id)}`;

  const primaryLabel = isOwner ? x.ownerCta : x.sendInvite;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-8 md:max-w-xl md:py-12">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5b1f]">{x.kicker}</p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-[#222] md:text-3xl">{x.headline}</h1>
          <p className="text-pretty text-sm leading-relaxed text-[#757575]">{x.subhead}</p>
        </div>

        <Card className="w-full border-[#eee] bg-white shadow-sm">
          <CardHeader className="gap-3 space-y-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <LockedAvatarPreview />
                <div>
                  <CardTitle className="text-lg text-[#222]">{mp.anonymous}</CardTitle>
                  <CardDescription className="text-[#757575]">{mp.anonymousHint}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-[#eee] bg-[#fff1ea] text-xs text-[#c2410c]">
                {listing.location_filter ?? mp.locationUnknown}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <p className="text-base leading-relaxed text-[#222]">{listing.natural_language_input}</p>
            {listing.must_haves?.trim() ? (
              <IntentMustHavesCallout compact heading={x.expectationsHeading} body={listing.must_haves} />
            ) : null}
            <MarketplaceListingIdentity listing={listing} />
          </CardContent>
        </Card>

        <div className="mt-10 flex w-full flex-col items-stretch gap-4 md:mt-12">
          {!viewerUserId ? (
            <p className="text-center text-xs leading-relaxed text-slate-500">{x.signingInNote}</p>
          ) : null}
          <Link
            href={primaryHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#ff5b1f] px-6 text-base font-semibold text-white hover:bg-[#e84e12]",
            )}
          >
            {primaryLabel}
          </Link>
          <Link
            href="/square"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mx-auto text-sm text-[#757575] hover:bg-[#f4f4f4] hover:text-[#222]",
            )}
          >
            {x.browseSquare}
          </Link>
        </div>
      </main>
    </div>
  );
}
