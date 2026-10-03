"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { listingTitle, meetupKindFrom, type MeetupKind } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";

function excerpt(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return "";
  return lines.slice(1).join(" ");
}

function Card({
  listing,
  viewerId,
  yoursLabel,
  oneLabel,
  groupLabel,
}: {
  listing: MarketplaceListing;
  viewerId: string | null;
  yoursLabel: string;
  oneLabel: string;
  groupLabel: string;
}) {
  const mine = viewerId != null && listing.user_id === viewerId;
  const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
  const title = listingTitle(listing.natural_language_input);
  const blurb = excerpt(listing.natural_language_input);
  const href = mine ? (kind === "group" ? "/portal/groups" : "/portal/one-to-one") : `/explore/${listing.id}`;
  const group = kind === "group";
  const label = group ? groupLabel : oneLabel;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
    >
      <div
        className={`relative flex h-28 items-end p-4 ${group ? "bg-[linear-gradient(145deg,#ff8a4c,#ff5b1f)] text-white" : "bg-[#fff1ea] text-[#9a3412]"}`}
      >
        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${group ? "bg-white/20" : "bg-white text-[#ff5b1f]"}`}>
          {label}
        </span>
        {listing.location_filter ? (
          <span className={`absolute bottom-4 right-4 inline-flex max-w-[55%] items-center gap-1 truncate text-xs font-medium ${group ? "text-white" : "text-[#9a3412]"}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {listing.location_filter}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-[16px] font-semibold leading-6 text-[#222] group-hover:text-[#ff5b1f]">{title}</h2>
        {blurb ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#757575]">{blurb}</p> : null}
        {mine ? <p className="mt-3 text-xs font-semibold text-[#ff5b1f]">{yoursLabel}</p> : null}
        {listing.interest_keywords.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {listing.interest_keywords.slice(0, 3).map((tag) => (
              <li key={tag} className="rounded-md bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#555]">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
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
  const needle = query.trim().toLowerCase();
  const visible = listings.filter((listing) => {
    const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
    if (type !== "all" && kind !== type) return false;
    if (!needle) return true;
    const hay = `${listing.natural_language_input} ${listing.location_filter ?? ""} ${listing.interest_keywords.join(" ")}`.toLowerCase();
    return hay.includes(needle);
  });
  const filters: { id: "all" | MeetupKind; label: string }[] = [
    { id: "all", label: lang === "zh" ? "全部" : "All" },
    { id: "one_to_one", label: t.oneToOne },
    { id: "group", label: t.groups },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-[#222] sm:text-[34px]">{t.slogan}</h1>
      <p className="mt-2 max-w-xl text-sm text-[#757575]">{t.lead}</p>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const active = type === filter.id;
          const href =
            filter.id === "all" ? (query ? `/?q=${encodeURIComponent(query)}` : "/") : `/?type=${filter.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
          return (
            <Link
              key={filter.id}
              href={href}
              className={`inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium ${active ? "bg-[#ff5b1f] text-white" : "border border-[#e6e6e6] bg-white text-[#222]"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-[#222]">{t.latest}</h2>
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[#e6e6e6] bg-white px-5 py-12 text-center text-sm text-[#757575]">
          {needle || type !== "all" ? t.emptyFiltered : t.empty}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => (
            <Card
              key={listing.id}
              listing={listing}
              viewerId={viewerId}
              yoursLabel={t.yours}
              oneLabel={t.oneToOne}
              groupLabel={t.groups}
            />
          ))}
        </div>
      )}
      {moreAvailable ? (
        <p className="mt-6 text-sm text-[#757575]">
          <Link href="/login?after=%2F" className="font-semibold text-[#ff5b1f]">
            {t.guestMore}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
