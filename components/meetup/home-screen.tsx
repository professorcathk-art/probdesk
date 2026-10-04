"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Users, UserRound } from "lucide-react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { listingCoverSrc } from "@/lib/meetup-cover";
import { formatListingPrice, listingTitle, meetupKindFrom, priceFromMustHaves, type MeetupKind } from "@/lib/meetup";
import { scoreListingText } from "@/lib/meetup-search";
import { meetupCopy } from "@/lib/meetup-copy";
import { displayGenderLabel } from "@/lib/display-gender";
import { HomeStory } from "@/components/meetup/home-story";

function excerpt(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return "";
  return lines.slice(1).join(" ");
}

function Cover({ src, kind, label, eager }: { src: string; kind: MeetupKind; label: string; eager?: boolean }) {
  const group = kind === "group";
  return (
    <div className="relative h-36 overflow-hidden bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
      <img src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
        {group ? <Users className="h-3.5 w-3.5" aria-hidden /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </span>
    </div>
  );
}

function Card({
  listing,
  viewerId,
  yoursLabel,
  detailsLabel,
  oneLabel,
  groupLabel,
  eager,
}: {
  listing: MarketplaceListing;
  viewerId: string | null;
  yoursLabel: string;
  detailsLabel: string;
  oneLabel: string;
  groupLabel: string;
  eager?: boolean;
}) {
  const { lang, strings } = useLanguage();
  const mine = viewerId != null && listing.user_id === viewerId;
  const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
  const priceLabel = formatListingPrice(lang, priceFromMustHaves(listing.must_haves));
  const genderLine = displayGenderLabel(listing.gender, strings.console);
  const title = listingTitle(listing.natural_language_input);
  const blurb = excerpt(listing.natural_language_input);
  const href = mine ? (kind === "group" ? "/portal/groups" : "/portal/one-to-one") : `/explore/${listing.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Cover
        src={listingCoverSrc(listing)}
        kind={kind}
        label={kind === "group" ? groupLabel : oneLabel}
        eager={eager}
      />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900 group-hover:text-[#ff5a5f]">{title}</h3>
        {blurb ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{blurb}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 flex-col gap-1">
            {listing.location_filter ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {listing.location_filter}
              </span>
            ) : null}
            {priceLabel ? <span className="truncate text-xs font-medium text-slate-700">{priceLabel}</span> : null}
            {genderLine ? <span className="truncate text-xs text-slate-600">{genderLine}</span> : null}
          </span>
          {mine ? <span className="text-xs font-semibold text-[#ff5a5f]">{yoursLabel}</span> : <span className="shrink-0 text-xs font-semibold text-[#ff5a5f]">{detailsLabel}</span>}
        </div>
      </div>
    </Link>
  );
}

export function MeetupHome({
  listings,
  query,
  type,
  viewerId,
  moreAvailable,
}: {
  listings: MarketplaceListing[];
  query: string;
  type: "all" | MeetupKind;
  viewerId: string | null;
  moreAvailable: boolean;
}) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const [liveQuery, setLiveQuery] = useState(query);
  const [liveType, setLiveType] = useState(type);
  useEffect(() => {
    setLiveQuery(query);
  }, [query]);
  useEffect(() => {
    setLiveType(type);
  }, [type]);
  useEffect(() => {
    const onSearch = (event: Event) => setLiveQuery((event as CustomEvent<string>).detail ?? "");
    const applyType = (value: string | null | undefined) => {
      setLiveType(value === "group" || value === "one_to_one" ? value : "all");
    };
    const onType = (event: Event) => applyType((event as CustomEvent<string>).detail);
    const onPop = () => applyType(new URL(window.location.href).searchParams.get("type"));
    window.addEventListener("vennode-search", onSearch);
    window.addEventListener("vennode-type", onType);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("vennode-search", onSearch);
      window.removeEventListener("vennode-type", onType);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  function showType(next: MeetupKind) {
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setLiveType(next);
  }

  function showQuery(next: string) {
    const url = new URL(window.location.href);
    const q = next.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    url.searchParams.delete("type");
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setLiveQuery(q);
    setLiveType("all");
    window.dispatchEvent(new CustomEvent("vennode-search", { detail: q }));
    document.getElementById("home-listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const needle = liveQuery.trim().toLowerCase();
  const matched = listings
    .map((listing) => {
      const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
      const hay = `${listing.natural_language_input} ${listing.location_filter ?? ""} ${listing.must_haves ?? ""} ${listing.interest_keywords.join(" ")}`;
      return { listing, kind, score: scoreListingText(needle, hay) };
    })
    .filter((row) => (liveType === "all" || row.kind === liveType) && row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.listing);
  const oneToOne = matched.filter((listing) => meetupKindFrom(listing.natural_language_input, listing.must_haves) === "one_to_one");
  const groups = matched.filter((listing) => meetupKindFrom(listing.natural_language_input, listing.must_haves) === "group");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="max-w-3xl text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{t.slogan}</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500 sm:text-base">{t.lead}</p>
      {matched.length === 0 ? (
        <p id="home-listings" className="mt-8 scroll-mt-24 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          {needle || liveType !== "all" ? t.emptyFiltered : t.empty}
        </p>
      ) : (
        <div id="home-listings" className="mt-8 scroll-mt-24 space-y-10">
          {liveType !== "group" ? (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.oneToOne}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t.oneToOneHint}</p>
                </div>
                {liveType === "all" ? (
                  <button type="button" onClick={() => showType("one_to_one")} className="text-sm font-medium text-[#ff5a5f]">
                    {t.viewAll}
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {oneToOne.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{needle || liveType !== "all" ? t.emptyFiltered : t.emptySection}</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(liveType === "all" ? oneToOne.slice(0, 6) : oneToOne).map((listing, index) => (
                    <Card key={listing.id} listing={listing} viewerId={viewerId} yoursLabel={t.yours} detailsLabel={t.apply} oneLabel={t.badgeOne} groupLabel={t.groups} eager={index < 3} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
          {liveType !== "one_to_one" ? (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.groups}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t.groupsHint}</p>
                </div>
                {liveType === "all" ? (
                  <button type="button" onClick={() => showType("group")} className="text-sm font-medium text-[#ff5a5f]">
                    {t.viewAll}
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {groups.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{needle || liveType !== "all" ? t.emptyFiltered : t.emptySection}</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(liveType === "all" ? groups.slice(0, 6) : groups).map((listing, index) => (
                    <Card key={listing.id} listing={listing} viewerId={viewerId} yoursLabel={t.yours} detailsLabel={t.apply} oneLabel={t.badgeOne} groupLabel={t.groups} eager={index < 3} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}
      {liveType === "all" && !needle ? <HomeStory t={t} signedIn={viewerId != null} onBrowse={showQuery} /> : null}
      {moreAvailable ? (
        <p className="mt-8 text-sm text-slate-500">
          <Link href="/login?after=%2F" className="font-semibold text-[#ff5a5f]">
            {t.guestMore}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
