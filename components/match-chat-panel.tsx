"use client";

import { useCallback, useEffect, useState } from "react";
import { listMatchMessages, listMergedMatchMessages, sendMatchMessage } from "@/actions/matches";
import type { MessageRow } from "@/actions/matches";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  matchId: string;
  userId: string;
};

export function MatchChatPanel({ matchId, userId }: Props) {
  const { strings } = useLanguage();
  const c = strings.console;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await listMatchMessages(matchId);
    if (!res.ok) {
      setMessages([]);
      setError(res.message);
      return;
    }
    setMessages(res.messages);
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listMatchMessages(matchId);
      if (cancelled) return;
      if (!res.ok) {
        setMessages([]);
        setError(res.message);
        return;
      }
      setMessages(res.messages);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function onSend() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    const res = await sendMatchMessage(matchId, draft);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDraft("");
    await load();
  }

  return (
    <div className="flex max-h-[min(70vh,440px)] min-h-0 flex-col space-y-4 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{c.messagesCombined}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/15 bg-transparent text-slate-200 hover:bg-white/[0.06]"
          onClick={() => void load()}
        >
          {c.refreshMessages}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-500">{c.noMessages}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] text-slate-500">{msg.sender_id === userId ? c.chatYou : c.chatPeer}</p>
              <p className="text-slate-200">{msg.content}</p>
            </div>
          ))
        )}
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={c.sendPlaceholder}
        className="min-h-[88px] border-white/10 bg-white/[0.03] text-slate-50"
      />
      <Button
        type="button"
        disabled={busy || draft.trim().length < 1}
        className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
        onClick={() => void onSend()}
      >
        {busy ? c.sending : c.send}
      </Button>
    </div>
  );
}

type MergedProps = {
  matchIds: string[];
  /** New messages post here so history stays in one chronological thread (oldest accepted match). */
  sendOnMatchId: string;
  userId: string;
};

export function MergedMatchChatPanel({ matchIds, sendOnMatchId, userId }: MergedProps) {
  const { strings } = useLanguage();
  const c = strings.console;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsKey = [...matchIds].sort().join(",");

  const load = useCallback(async () => {
    setError(null);
    const res = await listMergedMatchMessages(matchIds);
    if (!res.ok) {
      setMessages([]);
      setError(res.message);
      return;
    }
    setMessages(res.messages);
  }, [matchIds]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listMergedMatchMessages(matchIds);
      if (cancelled) return;
      if (!res.ok) {
        setMessages([]);
        setError(res.message);
        return;
      }
      setMessages(res.messages);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, matchIds]);

  async function onSend() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    const res = await sendMatchMessage(sendOnMatchId, draft);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDraft("");
    await load();
  }

  return (
    <div className="flex max-h-[min(70vh,440px)] min-h-0 flex-col space-y-4 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
          {c.messagesCombined}
          {matchIds.length > 1 ? c.messagesMergedSuffix : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/15 bg-transparent text-slate-200 hover:bg-white/[0.06]"
          onClick={() => void load()}
        >
          {c.refreshMessages}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-500">{c.noMessages}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] text-slate-500">{msg.sender_id === userId ? c.chatYou : c.chatPeer}</p>
              <p className="text-slate-200">{msg.content}</p>
            </div>
          ))
        )}
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={c.sendPlaceholder}
        className="min-h-[88px] border-white/10 bg-white/[0.03] text-slate-50"
      />
      <Button
        type="button"
        disabled={busy || draft.trim().length < 1}
        className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
        onClick={() => void onSend()}
      >
        {busy ? c.sending : c.send}
      </Button>
    </div>
  );
}
