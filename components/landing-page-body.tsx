"use client";

import Link from "next/link";
import { LandingIntentForm } from "@/components/landing-intent-form";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  user: { id: string } | null;
  onboardingStatus: "pending" | "in_progress" | "complete";
};

export function LandingPageBody({ user, onboardingStatus }: Props) {
  const { strings } = useLanguage();
  const L = strings.landing;

  const samples = [L.marqueeSample1, L.marqueeSample2, L.marqueeSample3, L.marqueeSample4, L.marqueeSample5, L.marqueeSample6];

  const intentRow = (keyPrefix: string) =>
    samples.map((text, i) => (
      <div
        key={`${keyPrefix}-${i}`}
        className="w-[min(100vw-3rem,340px)] shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">{L.marqueeCardLabel}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-100">{text}</p>
      </div>
    ));

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
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">{L.marqueeTitle}</h2>
        </div>
        <div className="relative -mx-6 md:-mx-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-16 bg-gradient-to-r from-[oklch(0.13_0.045_264)] to-transparent md:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 bg-gradient-to-l from-[oklch(0.13_0.045_264)] to-transparent md:w-24" />
          <div className="overflow-hidden pb-2">
            <div className="landing-marquee-track flex w-max gap-0">
              <div className="flex shrink-0 gap-4 pr-4">{intentRow("a")}</div>
              <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
                {intentRow("b")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{L.useCasesTitle}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{L.useCasesSubtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: L.useCaseCofounderTitle, body: L.useCaseCofounderBody },
            { title: L.useCaseMentorTitle, body: L.useCaseMentorBody },
            { title: L.useCaseNetworkTitle, body: L.useCaseNetworkBody },
          ].map((item) => (
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

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: L.featureSmartTitle, body: L.featureSmartBody },
          { title: L.featureSquareTitle, body: L.featureSquareBody },
          { title: L.featureTrustTitle, body: L.featureTrustBody },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <h3 className="text-sm font-semibold tracking-wide text-slate-100">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
