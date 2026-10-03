"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import type { MessengerThreadDTO } from "@/actions/messenger";
import { markMessengerMatchesRead } from "@/actions/messenger";
import { listMergedMatchMessages, sendMatchMessage, type MessageRow } from "@/actions/matches";
import { SYSTEM_CONNECTED_MESSAGE_CONTENT } from "@/lib/system-messages";
import { AcceptedPeerProfileDialog } from "@/components/accepted-peer-profile-dialog";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  threads: MessengerThreadDTO[];
  initialPeerId: string | null;
  matchParamInvalid: boolean;
};

export function MessagesPageClient({ userId, threads, initialPeerId, matchParamInvalid }: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const p = strings.messagesPage;
  const c = strings.console;

  const pickInitialPeer = () => {
    if (initialPeerId && threads.some((t) => t.peerId === initialPeerId)) return initialPeerId;
    return threads[0]?.peerId ?? null;
  };

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(pickInitialPeer);
  const [mobileChatFocus, setMobileChatFocus] = useState(() =>
    Boolean(initialPeerId && threads.some((t) => t.peerId === initialPeerId)),
  );

  const [isMd, setIsMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setIsMd(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const selected = threads.find((t) => t.peerId === selectedPeerId) ?? null;

  const [peerProfileDialUserId, setPeerProfileDialUserId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const idsKey = selected ? [...selected.matchIds].sort().join(",") : "";

  const pendingThreadBottomRef = useRef(false);

  useEffect(() => {
    pendingThreadBottomRef.current = true;
  }, [idsKey]);

  const loadMessages = useCallback(async () => {
    if (!selected) {
      setMessages([]);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    const res = await listMergedMatchMessages(selected.matchIds);
    if (!res.ok) {
      setMessages([]);
      setLoadError(res.message);
      return;
    }
    setMessages(res.messages);
  }, [selected, setMessages, setLoadError]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selected) {
        setMessages([]);
        return;
      }
      const res = await listMergedMatchMessages(selected.matchIds);
      if (cancelled) return;
      if (!res.ok) {
        setMessages([]);
        setLoadError(res.message);
        return;
      }
      setMessages(res.messages);
      setLoadError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, selected]);

  useEffect(() => {
    if (!selectedPeerId) return;
    const thread = threads.find((t) => t.peerId === selectedPeerId);
    if (!thread) return;
    void markMessengerMatchesRead(thread.matchIds);
  }, [selectedPeerId, threads]);

  useLayoutEffect(() => {
    if (!pendingThreadBottomRef.current) return;
    if (!selected) {
      pendingThreadBottomRef.current = false;
      return;
    }
    if (messages.length === 0) {
      pendingThreadBottomRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
    pendingThreadBottomRef.current = false;
  }, [messages, selected, idsKey]);

  function openThread(peerId: string) {
    setSelectedPeerId(peerId);
    if (!isMd) setMobileChatFocus(true);
  }

  async function onSend() {
    if (!selected || !draft.trim()) return;
    setBusy(true);
    setLoadError(null);
    const res = await sendMatchMessage(selected.sendOnMatchId, draft);
    setBusy(false);
    if (!res.ok) {
      setLoadError(res.message);
      return;
    }
    setDraft("");
    await loadMessages();
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    router.refresh();
  }

  const showList = isMd || !mobileChatFocus;
  const showChat = isMd || mobileChatFocus;

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:flex-row">
      <aside
        className={cn(
          "flex min-h-0 w-full flex-col border-slate-200 md:w-[min(360px,38%)] md:max-w-md md:shrink-0 md:border-r",
          !showList && "hidden md:flex",
        )}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-900">{p.title}</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {threads.length === 0 ? (
            <div className="flex flex-col gap-2 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">{p.emptyTitle}</p>
              <p className="text-sm leading-relaxed text-slate-500">{p.emptyBody}</p>
              <Link
                href="/square"
                className={cn(
                  "mx-auto mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-[#ff5a5f] px-4 text-sm font-medium text-white hover:bg-[#e0484d]",
                )}
              >
                {c.browseExplore}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {threads.map((t) => {
                const open = t.peerId === selectedPeerId;
                const label = t.peerDisplayName?.trim() || c.peerFallbackName;
                return (
                  <li key={t.peerId}>
                    <div
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                        open ? "bg-rose-50" : "bg-transparent",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={p.peerAvatarPreviewAria}
                        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a5f] focus-visible:ring-offset-2"
                        onClick={() => setPeerProfileDialUserId(t.peerId)}
                      >
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                          {t.peerAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL
                            <img src={t.peerAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-5 w-5 opacity-80" strokeWidth={1.75} aria-hidden />
                          )}
                        </div>
                        {t.unread ? (
                          <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff5a5f]" />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => openThread(t.peerId)}
                        className="min-w-0 flex-1 rounded-xl py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a5f]"
                      >
                        <p className="truncate font-medium text-slate-900">{label}</p>
                        <p className="truncate text-xs text-slate-500">{t.peerIndustry?.trim() || p.industryUnset}</p>
                        {t.lastMessagePreview ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.lastMessagePreview}</p>
                        ) : null}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50",
          !showChat && "hidden md:flex",
        )}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <UserRound className="h-14 w-14 text-slate-300" strokeWidth={1.15} aria-hidden />
            <p className="max-w-xs text-sm text-slate-500">{p.pickThread}</p>
          </div>
        ) : (
          <>
            <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4">
              {!isMd && mobileChatFocus ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setMobileChatFocus(false)}
                  aria-label={p.back}
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden />
                </Button>
              ) : (
                <span className="mt-0.5 w-10 shrink-0 md:hidden" aria-hidden />
              )}
              <div className="flex min-w-0 flex-1 gap-3">
                <button
                  type="button"
                  aria-label={p.peerAvatarPreviewAria}
                  className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a5f] focus-visible:ring-offset-2"
                  onClick={() => setPeerProfileDialUserId(selected.peerId)}
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {selected.peerAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.peerAvatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5 text-slate-400" strokeWidth={1.75} aria-hidden />
                    )}
                  </div>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{selected.peerDisplayName?.trim() || c.peerFallbackName}</p>
                  <p className="truncate text-xs text-slate-500">{selected.peerIndustry?.trim() || p.industryUnset}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden border-slate-200 text-slate-700 hover:bg-slate-50 sm:inline-flex"
                onClick={() => void loadMessages()}
              >
                {p.refresh}
              </Button>
            </header>

            {matchParamInvalid ? (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 md:px-5">
                {p.invalidMatchHint}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
              {loadError ? <p className="text-center text-sm text-red-400">{loadError}</p> : null}
              {!loadError && messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">{c.noMessages}</p>
              ) : (
                <div className="flex flex-col gap-3 pb-2">
                  {messages.map((msg) => {
                    const isConnBroadcast =
                      msg.is_system === true || msg.content === SYSTEM_CONNECTED_MESSAGE_CONTENT;
                    if (isConnBroadcast) {
                      return (
                        <div key={msg.id} className="flex w-full justify-center py-0.5">
                          <div className="max-w-[min(92%,420px)] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-xs leading-relaxed text-emerald-800">
                            {p.systemConnectedBroadcast}
                          </div>
                        </div>
                      );
                    }
                    const mine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[min(92%,420px)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                            mine
                              ? "bg-[#ff5a5f] text-white"
                              : "border border-slate-200 bg-white text-slate-800",
                          )}
                        >
                          <p>{msg.content}</p>
                          <p className={cn("mt-1 text-[10px] tabular-nums", mine ? "text-white/80" : "text-slate-400")}>
                            {new Date(msg.created_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white p-4 md:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={p.sendPlaceholder}
                  rows={3}
                  className="min-h-[88px] flex-1 resize-none rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ff5a5f]/25"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={busy || draft.trim().length < 1}
                  className="h-11 shrink-0 rounded-lg bg-[#ff5a5f] px-5 text-white hover:bg-[#e0484d] sm:mb-0.5"
                  onClick={() => void onSend()}
                >
                  {busy ? p.sending : p.send}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>

      <AcceptedPeerProfileDialog
        peerUserId={peerProfileDialUserId}
        open={peerProfileDialUserId != null}
        onOpenChange={(o) => {
          if (!o) setPeerProfileDialUserId(null);
        }}
      />
    </div>
  );
}
