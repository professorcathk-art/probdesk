"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { MatchRow } from "@/actions/matches";
import { DualIntentBlurbs } from "@/components/dual-intent-blurbs";
import { IntentSnippet } from "@/components/intent-snippet";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { SenderPreviewBlock } from "@/components/sender-preview-block";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

function isSystemStyleMatch(m: MatchRow): boolean {
  return Boolean(m.counterparty_intent_id);
}

function relatesMatchToIntentCard(m: MatchRow, intentId: string, userId: string): boolean {
  if (isSystemStyleMatch(m)) {
    return m.intent_request_id === intentId || m.counterparty_intent_id === intentId;
  }
  const inbound = m.receiver_id === userId && m.intent_request_id === intentId;
  const outbound = m.sender_id === userId && m.sender_context_intent_id === intentId;
  return inbound || outbound;
}

export function filterMatchesForIntentCard(intentId: string, userId: string, matches: MatchRow[]): MatchRow[] {
  const okStatus = new Set(["Pending", "Pending_System", "Accepted", "Rejected"]);
  return matches
    .filter((m) => okStatus.has(m.status))
    .filter((m) => relatesMatchToIntentCard(m, intentId, userId))
    .sort((a, b) => {
      const rank = (x: MatchRow) => {
        if (x.status === "Pending" || x.status === "Pending_System") return 0;
        if (x.status === "Accepted") return 1;
        return 2;
      };
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

/** True when the intent card (Manage → 徵求 / Requests tab) still needs the viewer to accept, decline, or confirm a mutual row. */
export function intentManageTabNeedsAttention(intentId: string, userId: string, matches: MatchRow[]): boolean {
  const rows = filterMatchesForIntentCard(intentId, userId, matches);
  for (const m of rows) {
    const systemMatch = isSystemStyleMatch(m);
    const inboundListing = !systemMatch && m.receiver_id === userId && m.intent_request_id === intentId;
    const pendingInbound = m.status === "Pending" && inboundListing;
    if (pendingInbound) return true;
    if (m.status === "Pending_System") {
      const isSender = userId === m.sender_id;
      const myAck = isSender ? m.system_ack_sender : m.system_ack_receiver;
      if (!myAck) return true;
    }
  }
  return false;
}

function truncateText(s: string | null | undefined, max: number): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Hide legacy admin cold-start placeholder stored on older matches. */
function compatibilityReasonForDisplay(reason: string | null | undefined): string | null {
  const t = reason?.trim();
  if (!t) return null;
  if (t === "Manual system match (admin cold-start).") return null;
  return reason ?? null;
}

export function IntentCardRequestsList({
  intentId,
  userId,
  matches,
  onRespond,
}: {
  intentId: string;
  userId: string;
  matches: MatchRow[];
  onRespond: (matchId: string, decision: "Accepted" | "Rejected") => void;
}) {
  const { strings } = useLanguage();
  const d = strings.console.intentDashboard;
  const c = strings.console;

  const rows = useMemo(() => filterMatchesForIntentCard(intentId, userId, matches), [intentId, userId, matches]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
        <p className="text-sm text-slate-500">{d.empty}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((m) => {
        const systemMatch = isSystemStyleMatch(m);
        const inboundListing =
          !systemMatch && m.receiver_id === userId && m.intent_request_id === intentId;
        const outboundFromCard =
          !systemMatch && m.sender_id === userId && m.sender_context_intent_id === intentId;

        const sourceLabel = inboundListing ? d.tagSourceInbound : outboundFromCard ? d.tagSourceOutbound : d.tagSourceAi;

        const pendingInbound = m.status === "Pending" && inboundListing;
        const pendingOutbound = m.status === "Pending" && outboundFromCard;
        const pendingSystem = m.status === "Pending_System";

        const isSender = userId === m.sender_id;
        const myAck = isSender ? m.system_ack_sender : m.system_ack_receiver;
        const peerAck = isSender ? m.system_ack_receiver : m.system_ack_sender;

        let statusLabel: string = d.tagStatusPending;
        let statusSub: string | null = null;

        if (m.status === "Accepted") {
          statusLabel = d.tagStatusAccepted;
        } else if (m.status === "Rejected") {
          statusLabel = d.tagStatusDeclined;
        } else if (pendingSystem) {
          if (myAck && peerAck) {
            statusLabel = d.tagStatusPendingMutualReady;
          } else if (myAck && !peerAck) {
            statusLabel = d.tagStatusAwaitingPeer;
            statusSub = d.waitingForTheirConfirmation;
          } else if (!myAck && peerAck) {
            statusLabel = d.tagStatusActionNeeded;
          } else {
            statusLabel = d.tagStatusPendingMutual;
          }
        } else if (pendingOutbound) {
          statusLabel = d.tagStatusAwaitingTheirReply;
        }

        const preview = m.ai_context_sender as { headline?: string; summary?: string } | undefined;

        const compatDisplay = compatibilityReasonForDisplay(m.compatibility_reason);

        const showAnonymousPreview = outboundFromCard || systemMatch;

        return (
          <li key={m.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl md:p-5">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
              <Badge variant="outline" className="border-slate-500/35 text-[11px] font-medium text-slate-300">
                {sourceLabel}
              </Badge>
              <Badge variant="outline" className="border-white/12 text-[11px] font-normal text-slate-400">
                {statusLabel}
              </Badge>
              {typeof m.match_score === "number" ? (
                <span className="text-[11px] tabular-nums text-sky-400/90">
                  {d.fitScore}: {m.match_score}
                </span>
              ) : null}
            </div>
            {statusSub ? <p className="mt-1.5 text-xs text-slate-500">{statusSub}</p> : null}

            <div className="mt-4 flex gap-3">
              <div className="shrink-0 pt-0.5">
                <LockedAvatarPreview size="sm" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {showAnonymousPreview ? (
                  <div>
                    <p className="text-sm font-medium text-slate-100">{d.peerAnonymous}</p>
                    {(pendingOutbound || pendingSystem || m.status !== "Pending") && (preview?.summary || compatDisplay) ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {truncateText(preview?.summary ?? compatDisplay ?? "", 220)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {outboundFromCard && m.introductory_context?.trim() ? (
                  <p className="text-xs leading-relaxed text-slate-400">
                    <span className="font-medium text-slate-500">{d.yourInviteNote}: </span>
                    {truncateText(m.introductory_context, 200)}
                  </p>
                ) : null}

                {(outboundFromCard || systemMatch) && compatDisplay ? (
                  <p className="text-xs leading-relaxed text-slate-400">
                    <span className="font-medium text-slate-500">{d.matchContext}: </span>
                    {truncateText(compatDisplay, 280)}
                  </p>
                ) : null}

                {inboundListing ? (
                  <>
                    <SenderPreviewBlock match={m} />
                    {pendingInbound ? (
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                        <Button
                          size="sm"
                          className="min-h-11 w-full touch-manipulation border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 sm:w-auto sm:min-h-10"
                          onClick={() => onRespond(m.id, "Accepted")}
                        >
                          {d.accept}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11 w-full touch-manipulation text-slate-400 hover:bg-white/5 sm:w-auto sm:min-h-10"
                          onClick={() => onRespond(m.id, "Rejected")}
                        >
                          {d.decline}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {outboundFromCard ? (
                  <div className="pt-1">
                    {m.intent_request_id ? (
                      <IntentSnippet intentId={m.intent_request_id} label={d.theirListing} />
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{d.theirListing}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.outboundProfileInviteHint}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {systemMatch ? (
                  <>
                    <DualIntentBlurbs idA={m.intent_request_id} idB={m.counterparty_intent_id} />
                    {pendingSystem ? (
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                        <Button
                          size="sm"
                          className="min-h-11 w-full touch-manipulation border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-50 sm:w-auto sm:min-h-10"
                          disabled={Boolean(myAck && !peerAck)}
                          onClick={() => onRespond(m.id, "Accepted")}
                        >
                          {myAck && !peerAck ? d.waitingOnPeer : d.confirmMutualInterest}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11 w-full touch-manipulation text-slate-400 hover:bg-white/5 sm:w-auto sm:min-h-10"
                          onClick={() => onRespond(m.id, "Rejected")}
                        >
                          {d.decline}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {m.status === "Accepted" ? (
                  <Link
                    href={`/messages?matchId=${encodeURIComponent(m.id)}`}
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "galaxy-btn-glow inline-flex min-h-11 w-full justify-center border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto sm:min-h-10",
                    )}
                  >
                    {c.messagePeerCta}
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
