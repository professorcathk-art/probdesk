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
import { respondToMatch } from "@/actions/matches";
import { signOut } from "@/actions/auth";
import { ConnectModal } from "@/components/connect-modal";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { MatchChatPanel } from "@/components/match-chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
};

function DualIntentBlurbs({ idA, idB }: { idA: string | null; idB: string | null }) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const ids = [idA, idB].filter(Boolean) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("intent_requests")
        .select("natural_language_input")
        .in("id", ids);
      if (!cancelled) setLines((data ?? []).map((r) => r.natural_language_input));
    })();
    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  return (
    <div className="space-y-2 blur-[1.5px]">
      {lines.map((t, i) => (
        <p key={i} className="text-sm leading-relaxed text-slate-300">
          {t}
        </p>
      ))}
      {lines.length === 0 ? <p className="text-xs text-slate-500">Loading intent snippets…</p> : null}
    </div>
  );
}

function PeerIdentityCard({ peerUserId }: { peerUserId: string }) {
  const [peer, setPeer] = useState<{ display_name: string | null; industry: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("display_name, industry").eq("user_id", peerUserId).maybeSingle();
      if (!cancelled) setPeer(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [peerUserId]);

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">Connection</p>
      <p className="mt-2 text-base font-semibold text-white">{peer?.display_name ?? "Peer"}</p>
      <p className="text-sm text-slate-400">{peer?.industry ?? ""}</p>
    </div>
  );
}

export function ConsoleClient({ userId, intents, matches }: Props) {
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

  const [selectedActiveId, setSelectedActiveId] = useState<string | null>(null);

  const pendingInbound = useMemo(
    () => matches.filter((m) => m.status === "Pending" && m.receiver_id === userId),
    [matches, userId],
  );

  const outboundPending = useMemo(
    () => matches.filter((m) => m.status === "Pending" && m.sender_id === userId),
    [matches, userId],
  );

  const systemRecommended = useMemo(
    () => matches.filter((m) => m.status === "Pending_System" && (m.sender_id === userId || m.receiver_id === userId)),
    [matches, userId],
  );

  const activeConnections = useMemo(() => matches.filter((m) => m.status === "Accepted"), [matches]);

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

  async function onRespond(matchId: string, decision: "Accepted" | "Rejected") {
    const res = await respondToMatch(matchId, decision);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSelectedActiveId(null);
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

  function previewFrom(row: MatchRow | undefined) {
    return row?.ai_context_sender as { headline?: string; summary?: string; signals?: string[] } | undefined;
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:py-20">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Console</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Intent control & connections</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Resolve inbound Square requests, confirm system introductions, and message active connections.
            </p>
          </div>
          <Button
            variant="outline"
            className="galaxy-btn-glow border-white/15 bg-white/[0.03] text-slate-100"
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

        {/* Section A — Pending inbound */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Pending inbound requests</h2>
          <p className="text-sm text-slate-500">Someone connected with you via Square or hybrid queue. Persona stays blurred until you accept.</p>
          <div className="grid gap-4">
            {pendingInbound.length === 0 ? (
              <p className="text-sm text-slate-500">No inbound requests.</p>
            ) : (
              pendingInbound.map((m) => {
                const preview = previewFrom(m);
                return (
                  <Card key={m.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-100">New introduction</CardTitle>
                      <CardDescription className="text-slate-400">
                        Score {m.match_score ?? "—"} · {m.compatibility_reason}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Context message</p>
                        <p className="mt-2 text-slate-200">{m.introductory_context}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Blurred persona preview</p>
                        <div className="mt-2 blur-sm">
                          <p className="font-medium text-slate-100">{preview?.headline}</p>
                          <p className="mt-2 text-slate-300">{preview?.summary}</p>
                          <ul className="mt-2 list-disc pl-5 text-slate-400">
                            {(preview?.signals ?? []).map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="galaxy-btn-glow border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                          onClick={() => void onRespond(m.id, "Accepted")}
                        >
                          Accept
                        </Button>
                        <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => void onRespond(m.id, "Rejected")}>
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Outbound pending */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Outbound requests</h2>
          <p className="text-sm text-slate-500">Waiting on the other party to accept or decline.</p>
          {outboundPending.length === 0 ? (
            <p className="text-sm text-slate-500">None pending.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-400">
              {outboundPending.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  Intro sent · {m.compatibility_reason ?? "Awaiting response"}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* System recommended */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">System recommended</h2>
          <p className="text-sm text-slate-500">Admin-curated cold-start matches — both sides must accept.</p>
          <div className="grid gap-4">
            {systemRecommended.length === 0 ? (
              <p className="text-sm text-slate-500">No system introductions.</p>
            ) : (
              systemRecommended.map((m) => {
                const isSender = m.sender_id === userId;
                const myAck = isSender ? m.system_ack_sender : m.system_ack_receiver;
                const peerAck = isSender ? m.system_ack_receiver : m.system_ack_sender;
                return (
                  <Card key={m.id} className="border-indigo-500/20 bg-white/[0.035] backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base text-slate-100">Curated pairing</CardTitle>
                        <Badge variant="outline" className="border-indigo-400/30 text-indigo-100">
                          Pending_System
                        </Badge>
                      </div>
                      <CardDescription>{m.introductory_context}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DualIntentBlurbs idA={m.intent_request_id} idB={m.counterparty_intent_id} />
                      <p className="text-xs text-slate-500">
                        Your acknowledgement: {myAck ? "Recorded" : "Pending"} · Peer: {peerAck ? "Recorded" : "Waiting"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="galaxy-btn-glow border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                          onClick={() => void onRespond(m.id, "Accepted")}
                        >
                          Accept
                        </Button>
                        <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => void onRespond(m.id, "Rejected")}>
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Active connections */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Active connections</h2>
          <p className="text-sm text-slate-500">Identities unlocked — open a thread to message (refresh manually; no realtime).</p>
          <div className="grid gap-4">
            {activeConnections.length === 0 ? (
              <p className="text-sm text-slate-500">No active connections yet.</p>
            ) : (
              activeConnections.map((m) => {
                const peerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
                const open = selectedActiveId === m.id;
                return (
                  <Card
                    key={m.id}
                    className={`border-white/10 bg-white/[0.035] backdrop-blur-xl transition-shadow ${open ? "ring-1 ring-sky-500/45 shadow-[0_0_24px_rgba(56,189,248,0.12)]" : ""}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-base text-slate-100">Mutual match</CardTitle>
                      <CardDescription className="text-slate-400">{m.compatibility_reason}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PeerIdentityCard peerUserId={peerId} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="galaxy-btn-glow border-white/15 text-slate-200"
                        onClick={() => setSelectedActiveId(open ? null : m.id)}
                      >
                        {open ? "Hide messaging" : "Open messaging"}
                      </Button>
                      {open ? <MatchChatPanel matchId={m.id} userId={userId} /> : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Intents + hybrid queue */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Your intents</h2>
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
                            List this request in the public marketplace (Square)
                          </Label>
                          <p className="mt-1 text-xs text-slate-500">Inbound requests stay anonymous until mutual acceptance.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="galaxy-btn-glow border-white/15 bg-transparent text-slate-100"
                          onClick={() => void togglePaused(intent.id, intent.status === "active" ? "paused" : "active")}
                        >
                          {intent.status === "active" ? "Pause retrieval" : "Resume retrieval"}
                        </Button>
                        <Button
                          className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                          disabled={busyIntent === intent.id || intent.status !== "active"}
                          onClick={() => void loadSuggestions(intent.id)}
                        >
                          {busyIntent === intent.id ? "Refreshing…" : "Refresh system matches"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Hybrid queue (blurred)</p>
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
                                className="galaxy-btn-glow mt-4 w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                                onClick={() => openConnect(s)}
                              >
                                Request connection
                              </Button>
                            </div>
                          ))}
                          {(suggestionsByIntent[intent.id] ?? []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-sm text-slate-500">
                              Run hybrid retrieval to populate candidates.
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
