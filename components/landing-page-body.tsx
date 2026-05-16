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
  onboardingStatus: "pending" | "in_progress" | "complete";
  squareListings: MarketplaceListing[];
  squarePendingIntentIds: string[];
};

export function LandingPageBody({ user, onboardingStatus, squareListings, squarePendingIntentIds }: Props) {
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
              href={onboardingStatus === "complete" ? "/console" : "/onboarding"}
              className={cn(
                buttonVariants({ variant: "default" }),
                "border border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
              )}
            >
              {onboardingStatus === "complete" ? L.openConsole : L.continueOnboarding}
            </Link>
            <Link href="/square" className={cn(buttonVariants({ variant: "ghost" }), "text-slate-300 hover:bg-white/5")}>
              {L.browseSquare}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">{L.marqueeTitle}</h2>
          <Link href="/square" className="text-xs font-medium text-sky-300/90 underline-offset-4 hover:underline">
            {L.browseSquare}
          </Link>
        </div>
        <LandingSquareMarquee
          listings={squareListings}
          currentUserId={user?.id ?? null}
          pendingIntentIds={squarePendingIntentIds}
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
          <h2 className="text-2xl font-semibold tracking-tight text-white">{L.aboutProbdeskTitle}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{L.aboutProbdeskSubtitle}</p>
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
