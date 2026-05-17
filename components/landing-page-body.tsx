"use client";

import type { MarketplaceListing } from "@/actions/marketplace";
import { LandingIntentForm } from "@/components/landing-intent-form";
import { LandingSquareMarquee } from "@/components/landing-square-marquee";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  user: { id: string } | null;
  squareListings: MarketplaceListing[];
  squarePendingIntentIds: string[];
  profileReadyForInvites?: boolean;
};

export function LandingPageBody({
  user,
  squareListings,
  squarePendingIntentIds,
  profileReadyForInvites = true,
}: Props) {
  const { strings } = useLanguage();
  const L = strings.landing;

  const useCaseCards = [
    { title: L.useCasePartnerTitle, body: L.useCasePartnerBody },
    { title: L.useCaseFriendsTitle, body: L.useCaseFriendsBody },
    { title: L.useCaseInvestorsTitle, body: L.useCaseInvestorsBody },
    { title: L.useCaseCofounderTitle, body: L.useCaseCofounderBody },
    { title: L.useCaseMentorTitle, body: L.useCaseMentorBody },
    { title: L.useCaseNetworkTitle, body: L.useCaseNetworkBody },
  ];

  const aboutCards = [
    { title: L.featureSmartTitle, body: L.featureSmartBody },
    { title: L.featureSquareTitle, body: L.featureSquareBody },
    { title: L.featureTrustTitle, body: L.featureTrustBody },
  ];

  return (
    <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:pt-24">
      <section className="space-y-8">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{L.kicker}</p>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">{L.headline}</h1>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">{L.subhead}</p>
        </div>

        <LandingIntentForm />

        {user ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/console"
              className={cn(
                buttonVariants({ variant: "default" }),
                "border border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
              )}
            >
              {L.openConsole}
            </Link>
            <Link
              href="/square"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "galaxy-btn-glow border border-sky-400/45 bg-sky-500/20 px-5 text-sm font-semibold text-sky-50 shadow-[0_0_26px_rgba(56,189,248,0.35)] hover:bg-sky-500/35 sm:min-h-10 sm:text-base",
              )}
            >
              {L.browseSquare}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">{L.marqueeTitle}</h2>
          <Link
            href="/square"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "galaxy-btn-glow shrink-0 border border-sky-400/45 bg-sky-500/20 px-5 text-sm font-semibold text-sky-50 shadow-[0_0_28px_rgba(56,189,248,0.38)] hover:bg-sky-500/35 sm:w-fit sm:min-h-11 sm:text-base",
            )}
          >
            {L.browseSquare}
          </Link>
        </div>
        <LandingSquareMarquee
          listings={squareListings}
          currentUserId={user?.id ?? null}
          pendingIntentIds={squarePendingIntentIds}
          profileReadyForInvites={profileReadyForInvites}
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{L.useCasesTitle}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{L.useCasesSubtitle}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseCards.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              <h3 className="text-base font-semibold tracking-wide text-slate-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{L.aboutVennodeTitle}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{L.aboutVennodeSubtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {aboutCards.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
