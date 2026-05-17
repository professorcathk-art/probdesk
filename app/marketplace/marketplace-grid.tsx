"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { ConnectModal } from "@/components/connect-modal";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { IntentShareButton } from "@/components/intent-share-button";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConnectionCredits } from "@/hooks/use-connection-credits";
import { cn } from "@/lib/utils";

function exploreInviteResumeAfter(exploreBasePath: "/square" | "/marketplace", intentId: string) {
  return `${exploreBasePath}?connectTo=${encodeURIComponent(intentId)}`;
}

type Props = {
  listings: MarketplaceListing[];
  currentUserId: string | null;
  pendingIntentIds: string[];
  highlightIntentId?: string;
  /** Open connect modal once after auth + optional profile gate (matches intent id). */
  connectToIntentId?: string;
  exploreBasePath?: "/square" | "/marketplace";
  /** Publish-level profile complete — required before sending Explore invites. */
  profileReadyForInvites?: boolean;
};

export function MarketplaceGrid({
  listings,
  currentUserId,
  pendingIntentIds,
  highlightIntentId,
  connectToIntentId,
  exploreBasePath = "/square",
  profileReadyForInvites = true,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const mp = strings.marketplace;
  const cr = strings.credits;
  const pending = useMemo(() => new Set(pendingIntentIds), [pendingIntentIds]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [ctx, setCtx] = useState<{ receiverUserId: string; receiverIntentId: string } | null>(null);
  const [creditsTeaserOpen, setCreditsTeaserOpen] = useState(false);
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const resumedConnectRef = useRef(false);

  const { refresh: refreshCredits, outOfCredits } = useConnectionCredits(currentUserId);

  function redirectToCompleteProfileForInvite(intentId: string) {
    const after = exploreInviteResumeAfter(exploreBasePath, intentId);
    router.push(`/profile?required=profile&after=${encodeURIComponent(after)}`);
  }

  useEffect(() => {
    if (!connectToIntentId || !currentUserId || resumedConnectRef.current) return;
    const listing = listings.find((l) => l.id === connectToIntentId);
    if (!listing || listing.user_id === currentUserId || pending.has(listing.id)) return;
    if (!profileReadyForInvites) {
      resumedConnectRef.current = true;
      router.replace(
        `/profile?required=profile&after=${encodeURIComponent(exploreInviteResumeAfter(exploreBasePath, connectToIntentId))}`,
      );
      return;
    }
    resumedConnectRef.current = true;
    queueMicrotask(() => {
      setCtx({ receiverUserId: listing.user_id, receiverIntentId: listing.id });
      setConnectOpen(true);
    });
    router.replace(exploreBasePath, { scroll: false });
  }, [
    connectToIntentId,
    currentUserId,
    exploreBasePath,
    listings,
    pending,
    profileReadyForInvites,
    router,
  ]);

  useEffect(() => {
    if (!highlightIntentId || listings.every((l) => l.id !== highlightIntentId)) return;
    const t = window.setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlightIntentId, listings]);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {listings.map((item) => {
          const isHi = highlightIntentId === item.id;
          return (
            <div
              key={item.id}
              ref={isHi ? highlightedRef : undefined}
              id={`listing-${item.id}`}
              className={cn("scroll-mt-28", isHi && "rounded-xl")}
            >
              <Card
                className={cn(
                  "border-white/10 bg-white/[0.035] backdrop-blur-xl transition-shadow",
                  isHi && "ring-2 ring-sky-400/45 shadow-[0_0_28px_rgba(56,189,248,0.18)]",
                )}
              >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <LockedAvatarPreview />
                    <div>
                      <CardTitle className="text-base text-slate-200">{mp.anonymous}</CardTitle>
                      <CardDescription className="text-slate-500">{mp.anonymousHint}</CardDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline" className="border-white/15 text-slate-200">
                      {item.location_filter ?? mp.locationUnknown}
                    </Badge>
                    <IntentShareButton intentId={item.id} size="sm" variant="ghost" className="h-8 px-2 text-xs" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-200">{item.natural_language_input}</p>
                <IntentMustHavesCallout heading={mp.mustHavesHeading} body={item.must_haves ?? ""} />
                <Button
                  className={cn(
                    "w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 disabled:opacity-60",
                    currentUserId &&
                      currentUserId !== item.user_id &&
                      !pending.has(item.id) &&
                      outOfCredits &&
                      "opacity-50 hover:bg-sky-500/15",
                  )}
                  disabled={currentUserId === item.user_id || pending.has(item.id)}
                  onClick={() => {
                    if (!currentUserId) {
                      router.push(`/login?flow=pending_connect&connectIntent=${encodeURIComponent(item.id)}`);
                      return;
                    }
                    if (!profileReadyForInvites) {
                      redirectToCompleteProfileForInvite(item.id);
                      return;
                    }
                    if (currentUserId === item.user_id || pending.has(item.id)) return;
                    if (outOfCredits) {
                      setCreditsTeaserOpen(true);
                      return;
                    }
                    setCtx({ receiverUserId: item.user_id, receiverIntentId: item.id });
                    setConnectOpen(true);
                  }}
                >
                  {pending.has(item.id) ? mp.pending : outOfCredits ? cr.dailyLimitReached : mp.connect}
                </Button>
              </CardContent>
            </Card>
            </div>
          );
        })}
        {listings.length === 0 ? (
          <p className="col-span-full text-center text-sm text-slate-500">{mp.empty}</p>
        ) : null}
      </div>

      <CreditsLimitModal open={creditsTeaserOpen} onOpenChange={setCreditsTeaserOpen} />

      {ctx ? (
        <ConnectModal
          open={connectOpen}
          onOpenChange={(open) => {
            setConnectOpen(open);
            if (!open) router.refresh();
          }}
          receiverUserId={ctx.receiverUserId}
          receiverIntentId={ctx.receiverIntentId}
          headline={mp.inviteTargetLabel}
          onInviteSent={() => void refreshCredits()}
          profileIncompleteResumeAfter={exploreInviteResumeAfter(exploreBasePath, ctx.receiverIntentId)}
        />
      ) : null}
    </>
  );
}
