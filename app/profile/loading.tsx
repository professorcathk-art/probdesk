import { GalaxyBackdrop } from "@/components/galaxy-backdrop";

export default function ProfileLoading() {
  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-white/10" />
        <div className="h-16 max-w-xl animate-pulse rounded-xl bg-white/10" />
        <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
          <div className="h-6 w-40 animate-pulse rounded-md bg-white/10" />
          <div className="h-10 animate-pulse rounded-lg bg-white/10" />
          <div className="h-24 animate-pulse rounded-lg bg-white/10" />
          <div className="h-10 animate-pulse rounded-lg bg-white/10" />
          <div className="h-10 animate-pulse rounded-lg bg-white/10" />
        </div>
      </main>
    </div>
  );
}
