"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { MarketplaceGrid } from "@/app/marketplace/marketplace-grid";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listings: MarketplaceListing[];
  currentUserId: string | null;
  pendingIntentIds: string[];
  highlightIntentId?: string | null;
  loadError?: string | null;
};

export function MarketplaceFeed({
  listings,
  currentUserId,
  pendingIntentIds,
  highlightIntentId,
  loadError,
}: Props) {
  const { strings } = useLanguage();

  return (
    <>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{strings.marketplace.kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{strings.marketplace.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{strings.marketplace.description}</p>
        </div>
        <Link href="/console" className={cn(buttonVariants({ variant: "ghost" }), "text-sky-300/90 underline-offset-4 hover:underline")}>
          {strings.marketplace.backManage}
        </Link>
      </header>

      {loadError ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {strings.marketplace.loadErrorPrefix} {loadError}
        </p>
      ) : null}

      <MarketplaceGrid
        listings={listings}
        currentUserId={currentUserId}
        pendingIntentIds={pendingIntentIds}
        highlightIntentId={highlightIntentId ?? undefined}
      />
    </>
  );
}
