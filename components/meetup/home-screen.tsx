"use client";

import Link from "next/link";
import { MapPin, Users, UserRound } from "lucide-react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { meetupCoverSrc } from "@/lib/meetup-cover";
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

function Cover({ src, kind, label }: { src: string; kind: MeetupKind; label: string }) {
  const group = kind === "group";
  return (
    <div className="relative h-36 overflow-hidden bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
      <img src={src} alt="" className="h-full w-full object-cover" />
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

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Cover
        src={meetupCoverSrc(`${listing.natural_language_input}\n${listing.must_haves ?? ""}`, listing.id)}
        kind={kind}
        label={kind === "group" ? groupLabel : oneLabel}
      />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900 group-hover:text-[#ff5a5f]">{title}</h3>
        {blurb ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{blurb}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          {listing.location_filter ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {listing.location_filter}
            </span>
          ) : (
            <span />
          )}
          {mine ? <span className="text-xs font-semibold text-[#ff5a5f]">{yoursLabel}</span> : null}
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
  const needle = query.trim().toLowerCase();
  const matched = listings.filter((listing) => {
    const kind = meetupKindFrom(listing.natural_language_input, listing.must_haves);
    if (type !== "all" && kind !== type) return false;
    if (!needle) return true;
    const hay = `${listing.natural_language_input} ${listing.location_filter ?? ""} ${listing.interest_keywords.join(" ")}`.toLowerCase();
    return hay.includes(needle);
  });
  const oneToOne = matched.filter((listing) => meetupKindFrom(listing.natural_language_input, listing.must_haves) === "one_to_one");
  const groups = matched.filter((listing) => meetupKindFrom(listing.natural_language_input, listing.must_haves) === "group");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="max-w-3xl text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{t.slogan}</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500 sm:text-base">{t.lead}</p>
      {matched.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          {needle || type !== "all" ? t.emptyFiltered : t.empty}
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {type !== "group" ? (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.oneToOne}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t.oneToOneHint}</p>
                </div>
                {type === "all" ? (
                  <Link href="/?type=one_to_one" className="text-sm font-medium text-[#ff5a5f]">
                    {lang === "zh" ? "查看全部" : "See all"}
                  </Link>
                ) : (
                  <span />
                )}
              </div>
              {oneToOne.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{needle || type !== "all" ? t.emptyFiltered : t.emptySection}</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(type === "all" ? oneToOne.slice(0, 6) : oneToOne).map((listing) => (
                    <Card key={listing.id} listing={listing} viewerId={viewerId} yoursLabel={t.yours} oneLabel={t.oneToOne} groupLabel={t.groups} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
          {type !== "one_to_one" ? (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.groups}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t.groupsHint}</p>
                </div>
                {type === "all" ? (
                  <Link href="/?type=group" className="text-sm font-medium text-[#ff5a5f]">
                    {lang === "zh" ? "查看全部" : "See all"}
                  </Link>
                ) : (
                  <span />
                )}
              </div>
              {groups.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{needle || type !== "all" ? t.emptyFiltered : t.emptySection}</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(type === "all" ? groups.slice(0, 6) : groups).map((listing) => (
                    <Card key={listing.id} listing={listing} viewerId={viewerId} yoursLabel={t.yours} oneLabel={t.oneToOne} groupLabel={t.groups} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}
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
