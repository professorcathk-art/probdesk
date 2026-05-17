"use client";

import type { MarketplaceListing } from "@/actions/marketplace";
import { ConnectModal } from "@/components/connect-modal";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useConnectionCredits } from "@/hooks/use-connection-credits";

type Props = {
  listings: MarketplaceListing[];
  currentUserId: string | null;
  pendingIntentIds: string[];
  /** Publish-level profile complete — required before sending Explore invites from the marquee. */
  profileReadyForInvites?: boolean;
};

/** Enough cards so the marquee feels continuous for small Square feeds. */
function marqueeSequence(items: MarketplaceListing[]): MarketplaceListing[] {
  if (items.length === 0) return [];
  const minSlots = 12;
  const target = Math.max(minSlots, items.length * 2);
  const out: MarketplaceListing[] = [];
  for (let i = 0; i < target; i++) {
    out.push(items[i % items.length]);
  }
  return out;
}

export function LandingSquareMarquee({
  listings,
  currentUserId,
  pendingIntentIds,
  profileReadyForInvites = true,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const L = strings.landing;
  const mp = strings.marketplace;
  const cr = strings.credits;

  const pending = useMemo(() => new Set(pendingIntentIds), [pendingIntentIds]);
  const seq = useMemo(() => marqueeSequence(listings), [listings]);

  const { refresh: refreshCredits, outOfCredits } = useConnectionCredits(currentUserId);

  function inviteResumeAfter(intentId: string) {
    return `/square?connectTo=${encodeURIComponent(intentId)}`;
  }

  function redirectToCompleteProfileForInvite(intentId: string) {
    router.push(`/profile?required=profile&after=${encodeURIComponent(inviteResumeAfter(intentId))}`);
  }

  const [preview, setPreview] = useState<MarketplaceListing | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectCtx, setConnectCtx] = useState<{ receiverUserId: string; receiverIntentId: string } | null>(null);
  const [creditsTeaserOpen, setCreditsTeaserOpen] = useState(false);

  const marqueePaused = preview !== null || connectOpen;

  function renderCardRow(rowKey: string, ariaHidden?: boolean) {
    return seq.map((item, idx) => (
      <button
        key={`${rowKey}-${item.id}-${idx}`}
        type="button"
        aria-hidden={ariaHidden}
        onClick={() => setPreview(item)}
        className={cn(
          "w-[min(100vw-3rem,340px)] shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-color,box-shadow] hover:border-sky-400/35 hover:shadow-[0_14px_44px_rgba(56,189,248,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <LockedAvatarPreview size="sm" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/85">{L.marqueeCardLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{mp.anonymous}</p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-white/15 text-[11px] text-slate-200">
            {item.location_filter ?? mp.locationUnknown}
          </Badge>
        </div>
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-100">{item.natural_language_input}</p>
      </button>
    ));
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-14 text-center backdrop-blur-xl">
        <p className="text-sm leading-relaxed text-slate-400">{L.marqueeEmpty}</p>
        <Link
          href="/square"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "galaxy-btn-glow mt-6 inline-flex border border-sky-400/45 bg-sky-500/20 px-6 text-sm font-semibold text-sky-50 shadow-[0_0_28px_rgba(56,189,248,0.38)] hover:bg-sky-500/35 sm:text-base",
          )}
        >
          {L.browseSquare}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-slate-500">{L.marqueeTapHint}</p>

      <div className="relative -mx-6 md:-mx-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-16 bg-gradient-to-r from-[oklch(0.13_0.045_264)] to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 bg-gradient-to-l from-[oklch(0.13_0.045_264)] to-transparent md:w-24" />
        <div className="overflow-hidden pb-2">
          <div className={cn("landing-marquee-track flex w-max gap-0", marqueePaused && "landing-marquee-paused")}>
            <div className="flex shrink-0 gap-4 pr-4">{renderCardRow("a")}</div>
            <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
              {renderCardRow("b", true)}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{L.marqueePreviewTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{mp.anonymousHint}</DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="space-y-4">
              <Badge variant="outline" className="border-white/15 text-slate-200">
                {preview.location_filter ?? mp.locationUnknown}
              </Badge>
              <p className="text-sm leading-relaxed text-slate-200">{preview.natural_language_input}</p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              className={cn(
                "w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 disabled:opacity-60",
                preview &&
                  currentUserId &&
                  preview.user_id !== currentUserId &&
                  !pending.has(preview.id) &&
                  outOfCredits &&
                  "opacity-50 hover:bg-sky-500/15",
              )}
              disabled={
                !preview ||
                (currentUserId !== null && preview.user_id === currentUserId) ||
                (preview ? pending.has(preview.id) : false)
              }
              onClick={() => {
                if (!preview) return;
                if (!currentUserId) {
                  router.push(
                    `/login?flow=pending_connect&connectIntent=${encodeURIComponent(preview.id)}`,
                  );
                  return;
                }
                if (!profileReadyForInvites) {
                  redirectToCompleteProfileForInvite(preview.id);
                  return;
                }
                if (preview.user_id === currentUserId || pending.has(preview.id)) return;
                if (outOfCredits) {
                  setCreditsTeaserOpen(true);
                  return;
                }
                const ctx = { receiverUserId: preview.user_id, receiverIntentId: preview.id };
                setPreview(null);
                setConnectCtx(ctx);
                setConnectOpen(true);
              }}
            >
              {!preview
                ? mp.connect
                : currentUserId !== null && preview.user_id === currentUserId
                  ? L.marqueeOwnListing
                  : pending.has(preview.id)
                    ? mp.pending
                    : outOfCredits
                      ? cr.dailyLimitReached
                      : mp.connect}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-slate-300" onClick={() => setPreview(null)}>
              {L.previewClose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreditsLimitModal open={creditsTeaserOpen} onOpenChange={setCreditsTeaserOpen} />

      {connectCtx ? (
        <ConnectModal
          open={connectOpen}
          onOpenChange={(open) => {
            setConnectOpen(open);
            if (!open) {
              setConnectCtx(null);
              void router.refresh();
            }
          }}
          receiverUserId={connectCtx.receiverUserId}
          receiverIntentId={connectCtx.receiverIntentId}
          headline={mp.inviteTargetLabel}
          onInviteSent={() => void refreshCredits()}
          profileIncompleteResumeAfter={inviteResumeAfter(connectCtx.receiverIntentId)}
        />
      ) : null}
    </>
  );
}
