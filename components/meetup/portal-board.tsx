"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import { computeHybridSuggestions, setIntentStatus, type IntentRow } from "@/actions/intents";
import { respondToMatch, type MatchRow } from "@/actions/matches";
import { ConnectModal } from "@/components/connect-modal";
import { useLanguage } from "@/components/language-provider";
import { listingTitle, meetupKindFrom, type MeetupKind } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";

function statusLabel(status: string, t: ReturnType<typeof meetupCopy>) {
  if (status === "Accepted") return t.approved;
  if (status === "Rejected") return t.rejected;
  return t.pending;
}

export function PortalBoard({
  kind,
  userId,
  intents,
  matches,
  suggestions,
}: {
  kind: MeetupKind;
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
  suggestions: AiRecommendationListItem[];
}) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [invite, setInvite] = useState<AiRecommendationListItem | null>(null);

  const mine = intents.filter((row) => meetupKindFrom(row.natural_language_input, row.must_haves) === kind);

  function incomingFor(intentId: string) {
    return matches.filter((row) => row.receiver_id === userId && row.intent_request_id === intentId);
  }

  async function onDecision(matchId: string, decision: "Accepted" | "Rejected") {
    setBusyId(matchId);
    setError(null);
    const res = await respondToMatch(matchId, decision);
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function toggle(intent: IntentRow) {
    setBusyId(intent.id);
    setError(null);
    const next = intent.status === "paused" ? "active" : "paused";
    const res = await setIntentStatus(intent.id, next);
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function loadSuggestions(intentId: string) {
    setBusyId(`ai-${intentId}`);
    setError(null);
    const res = await computeHybridSuggestions(intentId);
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{kind === "group" ? t.groups : t.oneToOne}</h1>
        <Link href="/create" className="inline-flex min-h-11 items-center rounded-full bg-[#ff5a5f] px-4 text-sm font-medium text-white hover:bg-[#e0484d]">
          {t.publish}
        </Link>
      </div>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/portal/one-to-one" className={`inline-flex min-h-11 items-center rounded-full px-3 ${kind === "one_to_one" ? "bg-[#ff5a5f] text-white" : "bg-white text-slate-600"}`}>
          {t.oneToOne}
        </Link>
        <Link href="/portal/groups" className={`inline-flex min-h-11 items-center rounded-full px-3 ${kind === "group" ? "bg-[#ff5a5f] text-white" : "bg-white text-slate-600"}`}>
          {t.groups}
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">{t.hosted}</h2>
        {mine.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t.noPosts}</p> : null}
        <ul className="mt-3 space-y-3">
          {mine.map((intent) => {
            const incoming = incomingFor(intent.id);
            const ideas = suggestions.filter((row) => row.intent_id === intent.id).slice(0, 3);
            const open = openId === intent.id;
            const title = listingTitle(intent.natural_language_input);
            return (
              <li key={intent.id} className="rounded-2xl border border-[#eee] bg-white p-4">
                <p className="font-medium text-slate-900">{title}</p>
                {intent.location_filter ? <p className="mt-1 text-sm text-slate-500">{intent.location_filter}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/create?edit=${intent.id}`} className="inline-flex min-h-11 items-center rounded-full border border-rose-200 px-3 text-sm text-[#e0484d]">
                    {t.editTitle}
                  </Link>
                  <button type="button" disabled={busyId === intent.id} onClick={() => void toggle(intent)} className="min-h-11 rounded-full px-3 text-sm text-slate-600">
                    {intent.status === "paused" ? t.reopen : t.closePost}
                  </button>
                  <button type="button" onClick={() => setOpenId(open ? null : intent.id)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#ff5a5f]" aria-expanded={open}>
                    {t.incoming} · {incoming.length} {t.applicationCount}
                    <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                </div>

                {open ? (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {incoming.length === 0 ? <p className="text-sm text-slate-500">{t.noIncoming}</p> : null}
                    {incoming.map((match) => (
                      <div key={match.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-sm leading-6 text-slate-700">{match.introductory_context || statusLabel(match.status, t)}</p>
                        <p className="mt-2 text-xs font-medium text-[#ff5a5f]">{statusLabel(match.status, t)}</p>
                        {match.status === "Accepted" ? (
                          <Link href="/messages" className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-[#ff5a5f]">{t.openChat}</Link>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">{t.locked}</p>
                        )}
                        {match.status === "Pending" ? (
                          <div className="mt-3 flex gap-2">
                            <button type="button" disabled={busyId === match.id} onClick={() => void onDecision(match.id, "Accepted")} className="min-h-10 rounded-full bg-[#ff5a5f] px-4 text-sm text-white hover:bg-[#e0484d]">{t.approve}</button>
                            <button type="button" disabled={busyId === match.id} onClick={() => void onDecision(match.id, "Rejected")} className="min-h-10 rounded-full border border-[#e6e6e6] px-4 text-sm text-slate-700">{t.decline}</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                  <p className="text-sm font-semibold text-slate-900">{t.suggestions}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{t.suggestHint}</p>
                  {ideas.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t.suggestEmpty}</p> : null}
                  <ul className="mt-2 space-y-2">
                    {ideas.map((row) => (
                      <li key={row.id} className="rounded-lg bg-white p-3">
                        <p className="text-sm font-medium text-slate-900">{row.peer_industry?.trim() || row.peer_location?.trim() || t.suggestions}</p>
                        {row.reason ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{row.reason}</p> : null}
                        <button type="button" onClick={() => setInvite(row)} className="mt-2 min-h-10 rounded-full bg-[#ff5a5f] px-4 text-sm text-white hover:bg-[#e0484d]">
                          {t.invite}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" disabled={busyId === `ai-${intent.id}`} onClick={() => void loadSuggestions(intent.id)} className="mt-3 min-h-10 text-sm font-medium text-[#e0484d] disabled:opacity-60">
                    {busyId === `ai-${intent.id}` ? t.suggesting : t.suggestLoad}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {invite ? (
        <ConnectModal
          open
          onOpenChange={(open) => {
            if (!open) setInvite(null);
          }}
          receiverUserId={invite.candidate_profile_id}
          receiverIntentId={invite.peer_linked_intent_id}
          senderContextIntentId={invite.intent_id}
          headline={listingTitle(mine.find((row) => row.id === invite.intent_id)?.natural_language_input ?? invite.intent_preview)}
          initialIntro={lang === "zh" ? `你好，我想邀請你看這則：${listingTitle(invite.intent_preview)}` : `I'd like to invite you to this: ${listingTitle(invite.intent_preview)}`}
          onInviteSent={() => {
            setInvite(null);
            router.refresh();
          }}
          profileIncompleteResumeAfter={kind === "group" ? "/portal/groups" : "/portal/one-to-one"}
        />
      ) : null}
    </main>
  );
}
