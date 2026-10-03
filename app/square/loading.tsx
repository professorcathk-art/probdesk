import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

export default function SquareLoading() {
  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:gap-10 md:px-6 md:py-16">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />
        <div className="h-14 max-w-2xl animate-pulse rounded-xl bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div
              key={k}
              className="h-52 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
