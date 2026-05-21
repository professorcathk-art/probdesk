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
  /** Pathname for return URLs (`/square` or `/marketplace`). */
  exploreBasePath?: "/square" | "/marketplace";
  /** False when logged-in user has not completed publish-level profile (gender, intent level, etc.). */
  profileReadyForInvites?: boolean;
  loadError?: string | null;
  quotaSnapshot?: {
    activeIntentCount: number;
    maxActiveIntents: number;
    unlimitedIntents: boolean;
  } | null;
  /** True when signed-out Explore caps listings (see server probe row). */
  guestListingsCapped?: boolean;
};

export function MarketplaceFeed({
  listings,
  currentUserId,
  pendingIntentIds,
  highlightIntentId,
  connectToIntentId = null,
  exploreBasePath = "/square",
  profileReadyForInvites = true,
  loadError,
  quotaSnapshot = null,
  guestListingsCapped = false,
}: Props) {
  const { strings } = useLanguage();

  return (
    <>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{strings.marketplace.kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{strings.marketplace.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{strings.marketplace.description}</p>
          {currentUserId && strings.marketplace.personalizationHint.trim() ? (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">{strings.marketplace.personalizationHint}</p>
          ) : null}
          {quotaSnapshot ? (
            <div className="mt-4">
              <InviteQuotaPill userId={currentUserId} quota={quotaSnapshot} />
            </div>
          ) : null}
        </div>
        {currentUserId ? (
          <Link
            href="/console"
            prefetch={false}
            className={cn(buttonVariants({ variant: "ghost" }), "text-sky-300/90 underline-offset-4 hover:underline")}
          >
            {strings.marketplace.backManage}
          </Link>
        ) : (
          <span className="hidden md:block md:w-40" aria-hidden />
        )}
      </header>

      {guestListingsCapped && !currentUserId ? (
        <div className="rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/15 to-transparent px-5 py-6 shadow-[0_0_40px_rgba(56,189,248,0.08)]">
          <h2 className="text-lg font-semibold text-white">{strings.marketplace.guestPreviewTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{strings.marketplace.guestPreviewBody}</p>
          <Link
            href={`/login?after=${encodeURIComponent(exploreBasePath)}`}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "galaxy-btn-glow mt-5 inline-flex border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
            )}
          >
            {strings.marketplace.guestPreviewCta}
          </Link>
          <p className="mt-3 text-xs text-slate-500">{strings.marketplace.guestPreviewFootnote}</p>
        </div>
      ) : null}

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
        exploreBasePath={exploreBasePath}
        profileReadyForInvites={profileReadyForInvites}
      />
    </>
  );
}
