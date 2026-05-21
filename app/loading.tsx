import { LandingGalaxyScene } from "@/components/landing-galaxy-scene";

/** Home `/` instant shell while SSR + Explore RPC resolve. */
export default function RootPageLoading() {
  return (
    <div className="relative min-h-screen text-slate-50">
      <LandingGalaxyScene />
      <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:pt-24">
        <section className="space-y-8">
          <div className="space-y-5">
            <div className="h-4 w-32 animate-pulse rounded-md bg-sky-400/20" />
            <div className="h-12 max-w-xl animate-pulse rounded-lg bg-white/10 md:h-14 md:max-w-3xl" />
            <div className="h-20 max-w-xl animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="h-[min(340px,55vh)] max-w-xl animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
        </section>
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="h-7 w-48 animate-pulse rounded-md bg-white/10" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-white/10 sm:w-44" />
          </div>
          <div className="flex gap-3 overflow-hidden pb-2">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-[200px] w-[260px] shrink-0 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        </section>
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl"
            />
          ))}
        </section>
      </main>
    </div>
  );
}
