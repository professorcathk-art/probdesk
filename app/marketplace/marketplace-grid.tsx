"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Users, UserRound } from "lucide-react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { ConnectModal } from "@/components/connect-modal";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { IntentShareButton } from "@/components/intent-share-button";
import { ListingAuthor } from "@/components/listing-author";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { MarketplaceListingIdentity } from "@/components/marketplace-listing-identity";
import { useLanguage } from "@/components/language-provider";
import { listingCoverSrc } from "@/lib/meetup-cover";
import { formatListingPrice, listingTitle, meetupKindFrom, priceFromMustHaves, splitMeetupPost } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";
import { displayGenderLabel } from "@/lib/display-gender";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const { lang, strings } = useLanguage();
  const mp = strings.marketplace;
  const copy = meetupCopy(lang);
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
          const group = meetupKindFrom(item.natural_language_input, item.must_haves) === "group";
          const post = splitMeetupPost(item.natural_language_input);
          const priceLabel = formatListingPrice(lang, priceFromMustHaves(item.must_haves));
          const genderLine = displayGenderLabel(item.gender, strings.console);
          const genderLabel = genderLine ? `${mp.publicGenderLabel} · ${genderLine}` : null;
          return (
            <div
              key={item.id}
              ref={isHi ? highlightedRef : undefined}
              id={`listing-${item.id}`}
              className={cn("scroll-mt-28", isHi && "rounded-xl")}
            >
              <Card
                className={cn(
                  "overflow-hidden border-[#eee] bg-white py-0 shadow-sm transition-shadow",
                  isHi && "ring-2 ring-[#ff5a5f]/40",
                )}
              >
              <div className="relative h-40 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- local or uploaded cover */}
                <img src={listingCoverSrc(item)} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                  {group ? <Users className="h-3.5 w-3.5" aria-hidden /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
                  {group ? copy.groups : copy.badgeOne}
                </span>
                {item.recommended ? (
                  <Badge className="absolute right-3 top-3 border-0 bg-white/95 text-[10px] font-medium text-[#e0484d] hover:bg-white">
                    {mp.recommendedBadge}
                  </Badge>
                ) : null}
              </div>
              <CardHeader className="gap-3 px-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <ListingAuthor
                    name={item.author_name}
                    avatar={item.author_avatar}
                    anonymousLabel={mp.anonymous}
                    anonymousHint={item.author_name ? copy.hostedBy : mp.anonymousHint}
                    genderLabel={genderLabel}
                  />
                  <IntentShareButton intentId={item.id} size="sm" variant="ghost" className="h-8 px-2 text-xs" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <div>
                  <h3 className="text-base font-semibold leading-6 text-slate-900">{listingTitle(item.natural_language_input)}</h3>
                  {post.details ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.details}</p> : null}
                </div>
                {post.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <IntentMustHavesCallout heading={mp.mustHavesHeading} body={item.must_haves ?? ""} tone="neutral" />
                <MarketplaceListingIdentity listing={item} />
                {priceLabel ? (
                  <div>
                    <p className="text-sm font-medium text-slate-800">{priceLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{copy.priceHint}</p>
                  </div>
                ) : null}
                {item.location_filter ? (
                  <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {item.location_filter}
                  </p>
                ) : null}
                <Button
                  className="h-11 w-full rounded-lg bg-[#ff5a5f] text-white hover:bg-[#e0484d] disabled:opacity-60"
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
                  {pending.has(item.id) ? copy.alreadyApplied : outOfCredits ? cr.dailyLimitReached : group ? copy.joinGroup : copy.sendInvite}
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
