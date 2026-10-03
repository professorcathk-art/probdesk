"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { listingTitle, meetupKindFrom, type MeetupKind } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";

function Card({
  listing,
  viewerId,
  applyLabel,
  yoursLabel,
  oneLabel,
  groupLabel,
}: {
  listing: MarketplaceListing;
  viewerId: string | null;
  applyLabel: string;
  yoursLabel: string;
  oneLabel: string;
  groupLabel: string;
}) {
  const mine = viewerId != null && listing.user_id === viewerId;
  const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
  const href = mine
    ? kind === "group"
      ? "/portal/groups"
      : "/portal/one-to-one"
    : `/explore/${listing.id}`;
  return (
    <article className="flex h-full flex-col rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-violet-700">{kind === "group" ? groupLabel : oneLabel}</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
        {listingTitle(listing.natural_language_input)}
      </h2>
      {listing.location_filter ? <p className="mt-2 text-sm text-slate-500">{listing.location_filter}</p> : null}
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{listing.natural_language_input}</p>
      {listing.interest_keywords.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {listing.interest_keywords.slice(0, 4).map((tag) => (
            <li key={tag} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-800">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
      >
        {mine ? yoursLabel : applyLabel}
      </Link>
    </article>
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
  const needle = query.trim().toLowerCase();
  const visible = listings.filter((listing) => {
    const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
    if (type !== "all" && kind !== type) return false;
    if (!needle) return true;
    const hay = `${listing.natural_language_input} ${listing.location_filter ?? ""} ${listing.interest_keywords.join(" ")}`.toLowerCase();
    return hay.includes(needle);
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{t.slogan}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/?type=one_to_one"
          className={`rounded-3xl border p-5 shadow-sm ${type === "one_to_one" ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}
        >
          <p className="text-lg font-semibold text-slate-900">{t.oneToOne}</p>
          <p className="mt-1 text-sm text-slate-500">{t.oneToOneHint}</p>
        </Link>
        <Link
          href="/?type=group"
          className={`rounded-3xl border p-5 shadow-sm ${type === "group" ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}
        >
          <p className="text-lg font-semibold text-slate-900">{t.groups}</p>
          <p className="mt-1 text-sm text-slate-500">{t.groupsHint}</p>
        </Link>
      </div>
      <div className="mt-10 flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{t.latest}</h2>
        {type !== "all" ? (
          <Link href={query ? `/?q=${encodeURIComponent(query)}` : "/"} className="text-sm text-violet-700">
            {lang === "zh" ? "全部" : "All"}
          </Link>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-violet-200 bg-white px-5 py-10 text-sm text-slate-500">
          {needle || type !== "all" ? t.emptyFiltered : t.empty}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => (
            <Card
              key={listing.id}
              listing={listing}
              viewerId={viewerId}
              applyLabel={t.apply}
              yoursLabel={t.yours}
              oneLabel={t.oneToOne}
              groupLabel={t.groups}
            />
          ))}
        </div>
      )}
      {moreAvailable ? (
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/login?after=%2F" className="font-medium text-violet-700">
            {t.guestMore}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
