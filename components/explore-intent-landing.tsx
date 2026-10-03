"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/actions/marketplace";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
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
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-14 md:max-w-xl md:py-20">
        <div className="mb-8 space-y-3 text-center md:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{x.kicker}</p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-white md:text-3xl">{x.headline}</h1>
          <p className="text-pretty text-sm leading-relaxed text-slate-400 md:text-base">{x.subhead}</p>
        </div>

        <Card
          className={cn(
            "w-full border-white/15 bg-white/[0.045] shadow-xl shadow-sky-500/10 backdrop-blur-xl",
            "ring-1 ring-sky-400/20",
          )}
        >
          <CardHeader className="gap-3 space-y-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <LockedAvatarPreview />
                <div>
                  <CardTitle className="text-lg text-slate-100 md:text-xl">{mp.anonymous}</CardTitle>
                  <CardDescription className="text-slate-500">{mp.anonymousHint}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-white/15 text-xs text-slate-200 md:text-sm">
                {listing.location_filter ?? mp.locationUnknown}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <p className="text-base leading-relaxed text-slate-100 md:text-lg">{listing.natural_language_input}</p>
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
              "galaxy-btn-glow inline-flex min-h-14 w-full items-center justify-center border border-sky-400/45 bg-sky-500/20 px-6 text-base font-semibold text-sky-50 shadow-[0_0_32px_rgba(56,189,248,0.28)] hover:bg-sky-500/35 md:min-h-12 md:text-lg",
            )}
          >
            {primaryLabel}
          </Link>
          <Link
            href="/square"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mx-auto text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
            )}
          >
            {x.browseSquare}
          </Link>
        </div>
      </main>
    </div>
  );
}
