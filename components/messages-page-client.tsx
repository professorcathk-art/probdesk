"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import type { MessengerThreadDTO } from "@/actions/messenger";
import { markMessengerMatchesRead } from "@/actions/messenger";
import { listMergedMatchMessages, sendMatchMessage } from "@/actions/matches";
import type { MessageRow } from "@/actions/matches";
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

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const idsKey = selected ? [...selected.matchIds].sort().join(",") : "";

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
  }, [selected]);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedPeerId]);

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
    router.refresh();
  }

  const showList = isMd || !mobileChatFocus;
  const showChat = isMd || mobileChatFocus;

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-[0_0_48px_rgba(56,189,248,0.06)] backdrop-blur-xl md:flex-row md:rounded-3xl">
      <aside
        className={cn(
          "flex min-h-0 w-full flex-col border-white/10 md:w-[min(360px,38%)] md:max-w-md md:shrink-0 md:border-r",
          !showList && "hidden md:flex",
        )}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-white">{p.title}</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {threads.length === 0 ? (
            <div className="flex flex-col gap-2 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-200">{p.emptyTitle}</p>
              <p className="text-sm leading-relaxed text-slate-500">{p.emptyBody}</p>
              <Link
                href="/square"
                className={cn(
                  "galaxy-btn-glow mx-auto mt-2 inline-flex h-10 items-center justify-center rounded-md border border-sky-400/35 bg-sky-500/15 px-4 text-sm font-medium text-sky-50 hover:bg-sky-500/25",
                )}
              >
                {c.browseExplore}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {threads.map((t) => {
                const open = t.peerId === selectedPeerId;
                const label = t.peerDisplayName?.trim() || c.peerFallbackName;
                return (
                  <li key={t.peerId}>
                    <button
                      type="button"
                      onClick={() => openThread(t.peerId)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]",
                        open ? "bg-white/[0.08]" : "bg-transparent",
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] text-slate-400">
                          {t.peerAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL
                            <img src={t.peerAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-5 w-5 opacity-80" strokeWidth={1.75} aria-hidden />
                          )}
                        </div>
                        {t.unread ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-100">{label}</p>
                        <p className="truncate text-xs text-slate-500">{t.peerIndustry?.trim() || p.industryUnset}</p>
                        {t.lastMessagePreview ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.lastMessagePreview}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-black/20",
          !showChat && "hidden md:flex",
        )}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <UserRound className="h-14 w-14 text-slate-700" strokeWidth={1.15} aria-hidden />
            <p className="max-w-xs text-sm text-slate-500">{p.pickThread}</p>
          </div>
        ) : (
          <>
            <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl md:px-5 md:py-4">
              {!isMd && mobileChatFocus ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0 text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileChatFocus(false)}
                  aria-label={p.back}
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden />
                </Button>
              ) : (
                <span className="mt-0.5 w-10 shrink-0 md:hidden" aria-hidden />
              )}
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04]">
                  {selected.peerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.peerAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-5 w-5 text-slate-400" strokeWidth={1.75} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{selected.peerDisplayName?.trim() || c.peerFallbackName}</p>
                  <p className="truncate text-xs text-slate-500">{selected.peerIndustry?.trim() || p.industryUnset}</p>
                  {selected.matchedIntentTitle ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-sky-200/85">
                      <span className="font-medium text-sky-300/90">{p.matchedOn}</span> {selected.matchedIntentTitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden border-white/15 text-slate-200 hover:bg-white/[0.06] sm:inline-flex"
                onClick={() => void loadMessages()}
              >
                {p.refresh}
              </Button>
            </header>

            {matchParamInvalid ? (
              <p className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100/95 md:px-5">
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
                              ? "border border-sky-400/30 bg-sky-600/25 text-sky-50"
                              : "border border-white/10 bg-white/[0.06] text-slate-200",
                          )}
                        >
                          <p>{msg.content}</p>
                          <p className={cn("mt-1 text-[10px] tabular-nums opacity-70", mine ? "text-sky-100/80" : "text-slate-500")}>
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

            <footer className="sticky bottom-0 z-10 border-t border-white/10 bg-slate-950/85 p-4 backdrop-blur-xl md:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={p.sendPlaceholder}
                  rows={3}
                  className="min-h-[88px] flex-1 resize-none border-white/10 bg-white/[0.04] text-slate-50 placeholder:text-slate-600"
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
                  className="galaxy-btn-glow shrink-0 border border-sky-400/35 bg-sky-500/15 px-6 text-sky-50 hover:bg-sky-500/25 sm:mb-0.5"
                  onClick={() => void onSend()}
                >
                  {busy ? p.sending : p.send}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
