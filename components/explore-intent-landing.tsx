"use client";

import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { ListingAuthor } from "@/components/listing-author";
import { MarketplaceListingIdentity } from "@/components/marketplace-listing-identity";
import { useLanguage } from "@/components/language-provider";
import { listingCoverSrc } from "@/lib/meetup-cover";
import { formatListingPrice, listingTitle, meetupKindFrom, priceFromMustHaves } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";

type Props = {
  listing: MarketplaceListing;
  viewerUserId: string | null;
};

export function ExploreIntentLanding({ listing, viewerUserId }: Props) {
  const { lang, strings } = useLanguage();
  const mp = strings.marketplace;
  const x = strings.exploreIntent;
  const t = meetupCopy(lang);
  const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
  const priceLabel = formatListingPrice(lang, priceFromMustHaves(listing.must_haves));
  const title = listingTitle(listing.natural_language_input);
  const isOwner = viewerUserId !== null && listing.user_id === viewerUserId;
  const primaryHref = !viewerUserId
    ? `/login?flow=pending_connect&connectIntent=${encodeURIComponent(listing.id)}`
    : isOwner
      ? "/console"
      : `/square?connectTo=${encodeURIComponent(listing.id)}`;
  const primaryLabel = isOwner ? x.ownerCta : x.sendInvite;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5a5f]">{kind === "group" ? t.groups : t.oneToOne}</p>
      <h1 className="mt-2 max-w-3xl text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      <div className="mt-4">
        <ListingAuthor
          name={listing.author_name}
          avatar={listing.author_avatar}
          anonymousLabel={mp.anonymous}
          anonymousHint={listing.author_name ? t.profilePublic : mp.anonymousHint}
        />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="relative h-52 overflow-hidden rounded-2xl bg-slate-100 sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
            <img
              src={listingCoverSrc(listing)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{lang === "zh" ? "這次想做的事" : "What this is about"}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">{listing.natural_language_input}</p>
            {listing.must_haves?.trim() ? (
              <div className="mt-4">
                <IntentMustHavesCallout heading={x.expectationsHeading} body={listing.must_haves} tone="neutral" />
              </div>
            ) : null}
            <div className="mt-4">
              <MarketplaceListingIdentity listing={listing} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a5f]" aria-hidden />
                <span>{listing.location_filter ?? mp.locationUnknown}</span>
              </li>
              {priceLabel ? (
                <li className="text-sm">
                  <p className="font-medium text-slate-900">{priceLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{t.priceHint}</p>
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a5f]" aria-hidden />
                <span>{kind === "group" ? t.groupsHint : t.oneToOneHint}</span>
              </li>
            </ul>
            {!viewerUserId ? <p className="mt-4 text-xs leading-relaxed text-slate-500">{x.signingInNote}</p> : null}
            <Link
              href={primaryHref}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#ff5a5f] text-base font-semibold text-white hover:bg-[#e0484d]"
            >
              {primaryLabel}
            </Link>
            <Link href="/square" className="mt-3 inline-flex h-10 w-full items-center justify-center text-sm font-medium text-slate-500 hover:text-slate-800">
              {x.browseSquare}
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
