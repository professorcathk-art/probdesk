import Link from "next/link";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { SiteNav } from "@/components/site-nav";
import { listMarketplaceListings } from "@/actions/marketplace";
import { getAuthContext } from "@/lib/auth-context";
import { MarketplaceGrid } from "./marketplace-grid";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const res = await listMarketplaceListings();
  const listings = "error" in res ? [] : res.listings;
  const { user } = await getAuthContext();

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <SiteNav />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Square</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Public marketplace feed</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Opt-in intents only. Personas stay blurred until mutual acceptance — connect with a mandatory context message.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-sky-300/90 underline-offset-4 hover:underline">
            Back to console
          </Link>
        </header>

        {"error" in res ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Could not load listings: {res.error}. Confirm Supabase URL and anon key are set for this deployment.
          </p>
        ) : null}

        <MarketplaceGrid listings={listings} currentUserId={user?.id ?? null} />
      </div>
    </div>
  );
}
