import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

export default function MarketplaceLoading() {
  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="h-10 max-w-xs animate-pulse rounded-lg bg-white/10 md:h-12 md:max-w-md" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/10 sm:max-w-xs" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div key={k} className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </main>
    </div>
  );
}
