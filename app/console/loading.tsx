import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

export default function ConsoleLoading() {
  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:gap-10 md:px-6 md:py-16">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-14 max-w-3xl animate-pulse rounded-xl bg-white/10" />
        <div className="h-12 max-w-xl animate-pulse rounded-xl bg-white/10" />
        <div className="grid gap-6">
          <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          <div className="h-48 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        </div>
      </main>
    </div>
  );
}
