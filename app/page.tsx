import Link from "next/link";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { LandingIntentForm } from "@/components/landing-intent-form";
import { SiteNav } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, onboardingStatus } = await getAuthContext();

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <SiteNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:pt-24">
        <section className="space-y-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">
              Intent-driven networking
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              State who you are. State who you want. Let the galaxy route high-trust intros.
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">
              Probdesk pairs hybrid retrieval with mutual acceptance. Stay in system matches, or list on{" "}
              <span className="text-slate-200">Square</span> for inbound requests — identities stay blurred until both
              sides agree.
            </p>
          </div>

          <LandingIntentForm />

          {user ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href={onboardingStatus === "complete" ? "/dashboard" : "/onboarding"}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "border border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
                )}
              >
                {onboardingStatus === "complete" ? "Open console" : "Continue onboarding"}
              </Link>
              <Link
                href="/marketplace"
                className={cn(buttonVariants({ variant: "ghost" }), "text-slate-300 hover:bg-white/5")}
              >
                Browse Square
              </Link>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Hybrid search",
              body: "Embeddings + locality gate + vibe scoring — fewer false positives than feed scrolling.",
            },
            {
              title: "Square marketplace",
              body: "Opt-in visibility for inbound requests while preserving anonymity pre-acceptance.",
            },
            {
              title: "Double-blind acceptance",
              body: "Context messages first; identities unlock only after mutual trust.",
            },
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
    </div>
  );
}
