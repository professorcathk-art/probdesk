import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

export default function MessagesLoading() {
  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
          <div className="h-[420px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          <div className="min-h-[420px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        </div>
      </main>
    </div>
  );
}
