"use client";

import { useMemo } from "react";
import { DualIntentBlurbs } from "@/components/dual-intent-blurbs";
import type { MatchRow } from "@/actions/matches";
import { IntentSnippet } from "@/components/intent-snippet";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { SenderPreviewBlock } from "@/components/sender-preview-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export function filterMatchesForIntentCard(intentId: string, userId: string, matches: MatchRow[]): MatchRow[] {
  return matches
    .filter((m) => {
      if (m.status !== "Pending" && m.status !== "Pending_System") return false;
      if (m.status === "Pending") {
        const inbound = m.receiver_id === userId && m.intent_request_id === intentId;
        const outbound = m.sender_id === userId && m.sender_context_intent_id === intentId;
        return inbound || outbound;
      }
      return m.intent_request_id === intentId || m.counterparty_intent_id === intentId;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function truncateText(s: string | null | undefined, max: number): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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
        const isInbound = m.status === "Pending" && m.receiver_id === userId && m.intent_request_id === intentId;
        const isOutbound = m.status === "Pending" && m.sender_id === userId && m.sender_context_intent_id === intentId;
        const isSystem = m.status === "Pending_System";

        const sourceLabel = isInbound ? d.tagSourceInbound : isOutbound ? d.tagSourceOutbound : d.tagSourceAi;

        const isSender = userId === m.sender_id;
        const myAck = isSender ? m.system_ack_sender : m.system_ack_receiver;
        const peerAck = isSender ? m.system_ack_receiver : m.system_ack_sender;

        let statusLabel: string = d.tagStatusPending;
        let statusSub: string | null = null;
        if (m.status === "Pending_System") {
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
        } else if (isOutbound) {
          statusLabel = d.tagStatusAwaitingTheirReply;
        }

        const preview = m.ai_context_sender as { headline?: string; summary?: string } | undefined;

        return (
          <li key={m.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl md:p-5">
            <div className="flex flex-wrap items-center gap-2">
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
                {!isInbound ? (
                  <div>
                    <p className="text-sm font-medium text-slate-100">{d.peerAnonymous}</p>
                    {(isOutbound || isSystem) && (preview?.summary || m.compatibility_reason) ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {truncateText(preview?.summary ?? m.compatibility_reason ?? "", 220)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isOutbound && m.introductory_context?.trim() ? (
                  <p className="text-xs leading-relaxed text-slate-400">
                    <span className="font-medium text-slate-500">{d.yourInviteNote}: </span>
                    {truncateText(m.introductory_context, 200)}
                  </p>
                ) : null}

                {(isOutbound || isSystem) && m.compatibility_reason ? (
                  <p className="text-xs leading-relaxed text-slate-400">
                    <span className="font-medium text-slate-500">{d.matchContext}: </span>
                    {truncateText(m.compatibility_reason, 280)}
                  </p>
                ) : null}

                {isInbound ? (
                  <>
                    <SenderPreviewBlock match={m} />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                        onClick={() => onRespond(m.id, "Accepted")}
                      >
                        {d.accept}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:bg-white/5"
                        onClick={() => onRespond(m.id, "Rejected")}
                      >
                        {d.decline}
                      </Button>
                    </div>
                  </>
                ) : null}

                {isOutbound ? (
                  <div className="pt-1">
                    <IntentSnippet intentId={m.intent_request_id} label={d.theirListing} />
                  </div>
                ) : null}

                {isSystem ? (
                  <>
                    <DualIntentBlurbs idA={m.intent_request_id} idB={m.counterparty_intent_id} />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-50"
                        disabled={Boolean(myAck && !peerAck)}
                        onClick={() => onRespond(m.id, "Accepted")}
                      >
                        {myAck && !peerAck ? d.waitingOnPeer : d.confirmMutualInterest}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:bg-white/5"
                        onClick={() => onRespond(m.id, "Rejected")}
                      >
                        {d.decline}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
