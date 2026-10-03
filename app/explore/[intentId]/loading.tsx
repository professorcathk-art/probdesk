import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

/** Deep-linked intent preview while fetching listing + viewer context. */
export default function ExploreIntentLoading() {
  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="h-8 w-full max-w-xl animate-pulse rounded-lg bg-white/10" />
        <div className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        <div className="flex gap-3">
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/35" />
          <div className="h-11 w-28 animate-pulse rounded-lg bg-white/10 ring-1 ring-white/15" />
        </div>
      </main>
    </div>
  );
}
