"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/actions/marketplace";
import { InviteQuotaPill } from "@/components/invite-quota-pill";
import { useLanguage } from "@/components/language-provider";
import { MarketplaceGrid } from "@/app/marketplace/marketplace-grid";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listings: MarketplaceListing[];
  currentUserId: string | null;
  pendingIntentIds: string[];
  highlightIntentId?: string | null;
  /** Resume “send invite” after profile completion (intent row id). */
  connectToIntentId?: string | null;
  loadError?: string | null;
  quotaSnapshot?: {
    activeIntentCount: number;
    maxActiveIntents: number;
    unlimitedIntents: boolean;
  } | null;
};

export function MarketplaceFeed({
  listings,
  currentUserId,
  pendingIntentIds,
  highlightIntentId,
  connectToIntentId = null,
  loadError,
  quotaSnapshot = null,
}: Props) {
  const { strings } = useLanguage();

  return (
    <>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{strings.marketplace.kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{strings.marketplace.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{strings.marketplace.description}</p>
          {quotaSnapshot ? (
            <div className="mt-4">
              <InviteQuotaPill userId={currentUserId} quota={quotaSnapshot} />
            </div>
          ) : null}
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
        connectToIntentId={connectToIntentId ?? undefined}
      />
    </>
  );
}
