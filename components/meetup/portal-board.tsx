"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setIntentStatus, type IntentRow } from "@/actions/intents";
import { respondToMatch, type MatchRow } from "@/actions/matches";
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
  kindByIntentId,
}: {
  kind: MeetupKind;
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
  kindByIntentId: Record<string, MeetupKind>;
}) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const mine = intents.filter((row) => meetupKindFrom(row.natural_language_input, row.must_haves) === kind);

  function rowKind(match: MatchRow): MeetupKind | null {
    const ids = [match.intent_request_id, match.counterparty_intent_id, match.sender_context_intent_id];
    for (const id of ids) {
      if (id && kindByIntentId[id]) return kindByIntentId[id];
    }
    return null;
  }

  const incoming = matches.filter((row) => row.receiver_id === userId && (rowKind(row) ?? "one_to_one") === kind);
  const outgoing = matches.filter((row) => row.sender_id === userId && (rowKind(row) ?? "one_to_one") === kind);

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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{kind === "group" ? t.groups : t.oneToOne}</h1>
        <Link href="/create" className="inline-flex min-h-11 items-center rounded-full bg-[#ff5a5f] hover:bg-[#e0484d] px-4 text-sm font-medium text-white">
          {t.publish}
        </Link>
      </div>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/portal/one-to-one" className={`inline-flex min-h-11 items-center rounded-full px-3 ${kind === "one_to_one" ? "bg-[#ff5a5f] hover:bg-[#e0484d] text-white" : "bg-white text-slate-600"}`}>
          {t.oneToOne}
        </Link>
        <Link href="/portal/groups" className={`inline-flex min-h-11 items-center rounded-full px-3 ${kind === "group" ? "bg-[#ff5a5f] hover:bg-[#e0484d] text-white" : "bg-white text-slate-600"}`}>
          {t.groups}
        </Link>
        <Link href="/portal/settings" className="inline-flex min-h-11 items-center rounded-full bg-white px-3 text-slate-600">
          {t.settings}
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">{t.hosted}</h2>
        {mine.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t.noPosts}</p> : null}
        <ul className="mt-3 space-y-3">
          {mine.map((intent) => (
            <li key={intent.id} className="rounded-2xl border border-[#eee] bg-white p-4">
              <p className="font-medium text-slate-900">{listingTitle(intent.natural_language_input)}</p>
              {intent.location_filter ? <p className="mt-1 text-sm text-slate-500">{intent.location_filter}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/create?edit=${intent.id}`} className="inline-flex min-h-11 items-center rounded-full border border-[#e6e6e6] px-3 text-sm text-[#c2410c]">
                  {t.editTitle}
                </Link>
                <button type="button" disabled={busyId === intent.id} onClick={() => void toggle(intent)} className="min-h-11 rounded-full px-3 text-sm text-slate-600">
                  {intent.status === "paused" ? t.reopen : t.closePost}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">{t.incoming}</h2>
        {incoming.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t.noIncoming}</p> : null}
        <ul className="mt-3 space-y-3">
          {incoming.map((match) => (
            <li key={match.id} className="rounded-2xl border border-[#eee] bg-white p-4">
              <p className="text-sm leading-6 text-slate-700">{match.introductory_context || statusLabel(match.status, t)}</p>
              <p className="mt-2 text-xs font-medium text-[#ff5a5f]">{statusLabel(match.status, t)}</p>
              {match.status === "Accepted" ? (
                <Link href="/messages" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#ff5a5f]">
                  {t.openChat}
                </Link>
              ) : (
                <p className="mt-2 text-xs text-slate-500">{t.locked}</p>
              )}
              {match.status === "Pending_System" ? (
                <Link href="/console?tab=requests" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#ff5a5f]">
                  {t.advanced}
                </Link>
              ) : null}
              {match.status === "Pending" ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busyId === match.id} onClick={() => void onDecision(match.id, "Accepted")} className="min-h-11 rounded-full bg-[#ff5a5f] hover:bg-[#e0484d] px-4 text-sm text-white">
                    {t.approve}
                  </button>
                  <button type="button" disabled={busyId === match.id} onClick={() => void onDecision(match.id, "Rejected")} className="min-h-11 rounded-full border border-[#e6e6e6] px-4 text-sm text-slate-700">
                    {t.decline}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">{t.outgoing}</h2>
        {outgoing.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t.noOutgoing}</p> : null}
        <ul className="mt-3 space-y-3">
          {outgoing.map((match) => (
            <li key={match.id} className="rounded-2xl border border-[#eee] bg-white p-4">
              <p className="text-sm leading-6 text-slate-700">{match.introductory_context || statusLabel(match.status, t)}</p>
              <p className="mt-2 text-xs font-medium text-[#ff5a5f]">{statusLabel(match.status, t)}</p>
              {match.status === "Accepted" ? (
                <Link href="/messages" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#ff5a5f]">
                  {t.openChat}
                </Link>
              ) : (
                <p className="mt-2 text-xs text-slate-500">{t.locked}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </main>
  );
}
