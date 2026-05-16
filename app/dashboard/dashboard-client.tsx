"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntentRow, SuggestionCard } from "@/actions/intents";
import {
  computeHybridSuggestions,
  setIntentMarketplacePublic,
  setIntentStatus,
} from "@/actions/intents";
import type { MatchRow } from "@/actions/matches";
import { listMatchMessages, respondToMatch, sendMatchMessage } from "@/actions/matches";
import { signOut } from "@/actions/auth";
import { ConnectModal } from "@/components/connect-modal";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
};

export function DashboardClient({ userId, intents, matches }: Props) {
  const router = useRouter();

  const [suggestionsByIntent, setSuggestionsByIntent] = useState<Record<string, SuggestionCard[]>>({});
  const [busyIntent, setBusyIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectCtx, setConnectCtx] = useState<{
    receiverUserId: string;
    receiverIntentId: string;
    headline: string;
  } | null>(null);

  const [msgDraft, setMsgDraft] = useState("");
  const [msgMatchId, setMsgMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; body: string; created_at: string }[]>([]);

  const sortedMatches = useMemo(() => matches, [matches]);

  async function refreshFromServer() {
    router.refresh();
  }

  async function toggleMarketplace(intentId: string, next: boolean) {
    const res = await setIntentMarketplacePublic(intentId, next);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function togglePaused(intentId: string, status: "active" | "paused") {
    const res = await setIntentStatus(intentId, status);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function loadSuggestions(intentId: string) {
    setBusyIntent(intentId);
    setError(null);
    const res = await computeHybridSuggestions(intentId);
    setBusyIntent(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSuggestionsByIntent((prev) => ({ ...prev, [intentId]: res.suggestions }));
  }

  async function openMessages(matchId: string) {
    setMsgMatchId(matchId);
    setMsgDraft("");
    const res = await listMatchMessages(matchId);
    if (!res.ok) {
      setMessages([]);
      setError(res.message);
      return;
    }
    setMessages(res.messages as { id: string; sender_id: string; body: string; created_at: string }[]);
  }

  async function sendChat() {
    if (!msgMatchId || !msgDraft.trim()) return;
    const res = await sendMatchMessage(msgMatchId, msgDraft);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setMsgDraft("");
    await openMessages(msgMatchId);
    await refreshFromServer();
  }

  async function onRespond(matchId: string, decision: "Accepted" | "Rejected") {
    const res = await respondToMatch(matchId, decision);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await router.refresh();
  }

  function openConnect(card: SuggestionCard) {
    setConnectCtx({
      receiverUserId: card.owner_user_id,
      receiverIntentId: card.intent_id,
      headline: "this intent",
    });
    setConnectOpen(true);
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <SiteNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:py-20">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Operator console</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Intent control & match queue</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Toggle Square visibility per intent, refresh hybrid retrieval, and resolve double-blind introductions.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/15 bg-white/[0.03] text-slate-100"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
          >
            Sign out
          </Button>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Active intents</h2>
          <div className="grid gap-6">
            {intents.length === 0 ? (
              <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-slate-100">No intents yet</CardTitle>
                  <CardDescription className="text-slate-400">Complete onboarding to activate hybrid retrieval.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              intents.map((intent) => (
                <Card key={intent.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base text-slate-100">Intent</CardTitle>
                        <CardDescription className="text-slate-300">{intent.natural_language_input}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-white/15 text-slate-200">
                          {intent.location_filter ?? "Location unset"}
                        </Badge>
                        <Badge variant="outline" className="border-white/15 text-slate-200">
                          {intent.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                        <Checkbox
                          id={`sq-${intent.id}`}
                          checked={intent.is_marketplace_public}
                          onCheckedChange={(v) => void toggleMarketplace(intent.id, Boolean(v))}
                        />
                        <div>
                          <Label htmlFor={`sq-${intent.id}`} className="text-slate-100">
                            List this request on the public marketplace (Square)
                          </Label>
                          <p className="mt-1 text-xs text-slate-500">
                            Inbound requests stay anonymous until mutual acceptance.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="border-white/15 bg-transparent text-slate-100"
                          onClick={() => void togglePaused(intent.id, intent.status === "active" ? "paused" : "active")}
                        >
                          {intent.status === "active" ? "Pause retrieval" : "Resume retrieval"}
                        </Button>
                        <Button
                          className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                          disabled={busyIntent === intent.id || intent.status !== "active"}
                          onClick={() => void loadSuggestions(intent.id)}
                        >
                          {busyIntent === intent.id ? "Refreshing…" : "Refresh system matches"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        System queue (blurred identities)
                      </p>
                      <ScrollArea className="w-full whitespace-nowrap pb-3">
                        <div className="flex w-max gap-4 pb-1">
                          {(suggestionsByIntent[intent.id] ?? []).map((s) => (
                            <div
                              key={s.intent_id}
                              className="w-[280px] shrink-0 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-sky-500/40 to-indigo-600/30 blur-[3px]" />
                                <div>
                                  <p className="text-xs text-slate-500">Match score</p>
                                  <p className="text-lg font-semibold text-sky-200">{s.match_score}</p>
                                </div>
                              </div>
                              <p className="mt-3 line-clamp-4 text-sm text-slate-200">{s.natural_language_input}</p>
                              <p className="mt-3 text-xs leading-relaxed text-slate-400">{s.compatibility_reason}</p>
                              <Button
                                size="sm"
                                className="mt-4 w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                                onClick={() => openConnect(s)}
                              >
                                Request connection
                              </Button>
                            </div>
                          ))}
                          {(suggestionsByIntent[intent.id] ?? []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-sm text-slate-500">
                              Run hybrid retrieval to populate candidates (exact location + embeddings).
                            </div>
                          ) : null}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Connections</h2>
          <div className="grid gap-4">
            {sortedMatches.map((m) => {
              const isReceiver = m.receiver_id === userId;
              const isSender = m.sender_id === userId;
              const preview = m.ai_context_sender as {
                headline?: string;
                summary?: string;
                signals?: string[];
              } | null;

              return (
                <Card key={m.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-base text-slate-100">
                        {isReceiver ? "Inbound introduction" : "Outbound introduction"}
                      </CardTitle>
                      <Badge variant="outline" className="border-white/15 text-slate-200">
                        {m.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                      Score {m.match_score ?? "—"} · {m.compatibility_reason}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-200">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Context message</p>
                      <p className="mt-2 leading-relaxed text-slate-200">{m.introductory_context}</p>
                    </div>
                    {isReceiver && m.status === "Pending" ? (
                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">AI-sanitized sender preview</p>
                        <p className="mt-2 font-medium text-slate-100">{preview?.headline}</p>
                        <p className="mt-2 text-slate-300">{preview?.summary}</p>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
                          {(preview?.signals ?? []).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            className="border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                            onClick={() => void onRespond(m.id, "Accepted")}
                          >
                            Accept
                          </Button>
                          <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => void onRespond(m.id, "Rejected")}>
                            Decline
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {isSender && m.status === "Pending" ? (
                      <p className="text-slate-500">Awaiting their decision — identities stay blind.</p>
                    ) : null}

                    {m.status === "Accepted" ? (
                      <AcceptedMatchPanel match={m} userId={userId} />
                    ) : null}

                    {m.status === "Accepted" ? (
                      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Messenger</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sky-200 hover:bg-white/5"
                            onClick={() => {
                              if (msgMatchId === m.id) {
                                setMsgMatchId(null);
                                setMessages([]);
                                setMsgDraft("");
                              } else {
                                void openMessages(m.id);
                              }
                            }}
                          >
                            {msgMatchId === m.id ? "Hide thread" : "Open thread"}
                          </Button>
                        </div>
                        {msgMatchId === m.id ? (
                          <>
                            <div className="max-h-52 space-y-2 overflow-y-auto text-sm">
                              {messages.map((msg) => (
                                <div key={msg.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <p className="text-[11px] text-slate-500">
                                    {msg.sender_id === userId ? "You" : "Peer"}
                                  </p>
                                  <p className="text-slate-200">{msg.body}</p>
                                </div>
                              ))}
                            </div>
                            <Textarea
                              value={msgDraft}
                              onChange={(e) => setMsgDraft(e.target.value)}
                              placeholder="Say something intentional…"
                              className="border-white/10 bg-white/[0.03] text-slate-50"
                            />
                            <Button
                              className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                              onClick={() => void sendChat()}
                              disabled={msgDraft.trim().length < 2}
                            >
                              Send
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
            {sortedMatches.length === 0 ? (
              <p className="text-sm text-slate-500">No connections yet — Square or system queue first.</p>
            ) : null}
          </div>
        </section>
      </main>

      {connectCtx ? (
        <ConnectModal
          open={connectOpen}
          onOpenChange={(o) => {
            setConnectOpen(o);
            if (!o) void refreshFromServer();
          }}
          receiverUserId={connectCtx.receiverUserId}
          receiverIntentId={connectCtx.receiverIntentId}
          headline={connectCtx.headline}
        />
      ) : null}
    </div>
  );
}

function AcceptedMatchPanel({ match, userId }: { match: MatchRow; userId: string }) {
  const peerId = match.sender_id === userId ? match.receiver_id : match.sender_id;
  const [peer, setPeer] = useState<{ display_name: string | null; industry: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("display_name, industry").eq("user_id", peerId).maybeSingle();
      if (!cancelled) setPeer(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId]);

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">Unlocked identity</p>
      <p className="mt-2 text-base font-semibold text-white">{peer?.display_name ?? "Peer"}</p>
      <p className="text-sm text-slate-400">{peer?.industry ?? "Industry shared post-acceptance"}</p>
    </div>
  );
}
