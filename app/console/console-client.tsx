"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { IntentRow, SuggestionCard } from "@/actions/intents";
import {
  computeHybridSuggestions,
  createConsoleIntent,
  setIntentMarketplacePublic,
  setIntentStatus,
  updateConsoleIntent,
} from "@/actions/intents";
import type { MatchRow } from "@/actions/matches";
import { respondToMatch } from "@/actions/matches";
import { ConnectModal } from "@/components/connect-modal";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { IntentShareButton } from "@/components/intent-share-button";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { useLanguage } from "@/components/language-provider";
import { MergedMatchChatPanel } from "@/components/match-chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConnectionCredits } from "@/hooks/use-connection-credits";
import {
  clearLandingIntentDraftBackups,
  MIN_INTENT_CHARS,
  readLandingIntentDraftBackup,
} from "@/lib/intent-draft";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

type Props = {
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
  blockedPeerIds: string[];
};

function DualIntentBlurbs({ idA, idB }: { idA: string | null; idB: string | null }) {
  const { strings } = useLanguage();
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const ids = [idA, idB].filter(Boolean) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("intent_requests").select("natural_language_input").in("id", ids);
      if (!cancelled) setLines((data ?? []).map((r) => r.natural_language_input));
    })();
    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  return (
    <div className="space-y-2 blur-[1.5px]">
      {lines.map((line, i) => (
        <p key={i} className="text-sm leading-relaxed text-slate-300">
          {line}
        </p>
      ))}
      {lines.length === 0 ? <p className="text-xs text-slate-500">{strings.console.peerLoading}</p> : null}
    </div>
  );
}

function PeerIdentityCard({ peerUserId }: { peerUserId: string }) {
  const { strings } = useLanguage();
  const [peer, setPeer] = useState<{
    display_name: string | null;
    industry: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, industry, avatar_url, bio, location")
        .eq("user_id", peerUserId)
        .maybeSingle();
      if (!cancelled) setPeer(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [peerUserId]);

  return (
    <div className="flex gap-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
      {peer?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
        <img
          src={peer.avatar_url}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full border border-emerald-400/30 object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-gradient-to-br from-emerald-500/25 to-sky-600/20 blur-[2px]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">{strings.console.peerConnection}</p>
        <p className="mt-2 text-base font-semibold text-white">{peer?.display_name ?? strings.console.peerFallbackName}</p>
        <p className="text-sm text-slate-400">{peer?.industry ?? ""}</p>
        {peer?.location ? <p className="mt-1 text-sm text-slate-500">{peer.location}</p> : null}
        {peer?.bio ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{peer.bio}</p> : null}
      </div>
    </div>
  );
}

export function ConsoleClient({
  userId,
  intents,
  matches,
  blockedPeerIds,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const t = strings.console;
  const cr = strings.credits;

  const { refresh: refreshCredits, outOfCredits } = useConnectionCredits(userId);
  const [creditsTeaserOpen, setCreditsTeaserOpen] = useState(false);

  const blockedPeers = useMemo(() => new Set(blockedPeerIds), [blockedPeerIds]);

  const [suggestionsByIntent, setSuggestionsByIntent] = useState<Record<string, SuggestionCard[]>>({});
  const [busyIntent, setBusyIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectCtx, setConnectCtx] = useState<{
    receiverUserId: string;
    receiverIntentId: string;
    headline: string;
  } | null>(null);

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const openedFromLandingHandoffRef = useRef(false);

  function consumeLandingHandoffDraft() {
    useSessionStore.getState().clearLandingIntent();
    clearLandingIntentDraftBackups();
  }

  useEffect(() => {
    let raw = useSessionStore.getState().landingIntentText?.trim() ?? "";
    if (raw.length < MIN_INTENT_CHARS) {
      raw = readLandingIntentDraftBackup()?.trim() ?? "";
    }
    if (raw.length < MIN_INTENT_CHARS) return;
    openedFromLandingHandoffRef.current = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate create dialog from landing draft once on mount */
    setCreateDraft(raw);
    setCreateLocation("");
    setCreateOpen(true);
  }, []);

  const [editIntent, setEditIntent] = useState<IntentRow | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [postCreateDiscovering, setPostCreateDiscovering] = useState(false);
  const [freshMatchesModal, setFreshMatchesModal] = useState<SuggestionCard[] | null>(null);

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

  /** One card per peer; multiple Accepted rows with the same person merge into a single chat thread. */
  const connectionsByPeer = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of activeConnections) {
      const peer = m.sender_id === userId ? m.receiver_id : m.sender_id;
      const list = map.get(peer) ?? [];
      list.push(m);
      map.set(peer, list);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeConnections, userId]);

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
    setSelectedPeerId(null);
    await router.refresh();
  }

  function openConnect(card: SuggestionCard) {
    if (outOfCredits) {
      setCreditsTeaserOpen(true);
      return;
    }
    setConnectCtx({
      receiverUserId: card.owner_user_id,
      receiverIntentId: card.intent_id,
      headline: "this intent",
    });
    setConnectOpen(true);
  }

  function openConnectAndDismissFresh(card: SuggestionCard) {
    setFreshMatchesModal(null);
    openConnect(card);
  }

  function previewFrom(row: MatchRow | undefined) {
    return row?.ai_context_sender as { headline?: string; summary?: string; signals?: string[] } | undefined;
  }

  async function onCreateIntent() {
    setCreateBusy(true);
    setError(null);
    const res = await createConsoleIntent(createDraft, createLocation.trim() || undefined);
    setCreateBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    openedFromLandingHandoffRef.current = false;
    consumeLandingHandoffDraft();
    const newIntentId = res.intentId;
    setCreateDraft("");
    setCreateLocation("");
    setCreateOpen(false);
    setPostCreateDiscovering(true);
    setError(null);
    const discover = await computeHybridSuggestions(newIntentId);
    setPostCreateDiscovering(false);
    await router.refresh();
    if (discover.ok && discover.suggestions.length > 0) {
      setSuggestionsByIntent((prev) => ({ ...prev, [newIntentId]: discover.suggestions }));
      setFreshMatchesModal(discover.suggestions);
    } else if (!discover.ok) {
      setError(discover.message);
    }
  }

  async function onEditIntent() {
    if (!editIntent) return;
    setEditBusy(true);
    setError(null);
    const res = await updateConsoleIntent(editIntent.id, editDraft, editLocation.trim() || undefined);
    setEditBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setEditIntent(null);
    await router.refresh();
  }

  function openEdit(i: IntentRow) {
    setEditIntent(i);
    setEditDraft(i.natural_language_input);
    setEditLocation(i.location_filter ?? "");
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:gap-10 md:px-6 md:py-16">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{t.kicker}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{t.subtitle}</p>
          </div>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        {postCreateDiscovering ? (
          <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{t.freshMatchesSearching}</p>
        ) : null}

        <Tabs defaultValue="intents" className="gap-6">
          <TabsList className="md:w-full md:max-w-3xl md:flex-wrap">
            <TabsTrigger value="intents">{t.tabIntents}</TabsTrigger>
            <TabsTrigger value="requests">{t.tabRequests}</TabsTrigger>
            <TabsTrigger value="connections">{t.tabConnections}</TabsTrigger>
          </TabsList>

          <TabsContent value="intents" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{t.yourIntents}</h2>
              <Button
                type="button"
                className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                onClick={() => {
                  setCreateDraft("");
                  setCreateLocation("");
                  setCreateOpen(true);
                }}
              >
                {t.createIntent}
              </Button>
            </div>

            <div className="grid gap-6">
              {intents.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-100">{t.noIntentsTitle}</CardTitle>
                    <CardDescription className="text-slate-400">{t.noIntentsDesc}</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                intents.map((intent) => (
                  <Card key={intent.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base text-slate-100">{t.intentCardTitle}</CardTitle>
                          <CardDescription className="text-slate-300">{intent.natural_language_input}</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-white/15 text-slate-200">
                            {intent.location_filter ?? t.locationUnset}
                          </Badge>
                          <Badge variant="outline" className="border-white/15 text-slate-200">
                            {intent.status}
                          </Badge>
                          <IntentShareButton intentId={intent.id} size="icon" variant="outline" />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-white/15 bg-transparent text-slate-200"
                            onClick={() => openEdit(intent)}
                          >
                            {t.edit}
                          </Button>
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
                              {t.listOnSquare}
                            </Label>
                            <p className="mt-1 text-xs text-slate-500">{t.listOnSquareHint}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="galaxy-btn-glow border-white/15 bg-transparent text-slate-100"
                            onClick={() => void togglePaused(intent.id, intent.status === "active" ? "paused" : "active")}
                          >
                            {intent.status === "active" ? t.pauseMatching : t.resumeMatching}
                          </Button>
                          <Button
                            className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
                            disabled={busyIntent === intent.id || intent.status !== "active"}
                            onClick={() => void loadSuggestions(intent.id)}
                          >
                            {busyIntent === intent.id ? t.discovering : t.discoverMatches}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t.matchQueueTitle}</p>
                          <p className="text-xs leading-relaxed text-slate-500">{t.matchQueueDesc}</p>
                        </div>
                        <ScrollArea className="w-full pb-3">
                          <div className="flex w-max max-w-none flex-nowrap gap-4 pb-1">
                            {(suggestionsByIntent[intent.id] ?? []).map((s) => {
                              const blocked = blockedPeers.has(s.owner_user_id);
                              return (
                                <div
                                  key={s.intent_id}
                                  className="w-[min(280px,85vw)] max-w-[min(280px,85vw)] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <LockedAvatarPreview />
                                    <div className="min-w-0">
                                      <p className="text-xs text-slate-500">{t.compatibility}</p>
                                      <p className="text-lg font-semibold text-sky-200">{s.match_score}</p>
                                    </div>
                                  </div>
                                  <p className="mt-3 line-clamp-4 break-words text-sm text-slate-200">{s.natural_language_input}</p>
                                  <p className="mt-3 break-words text-xs leading-relaxed text-slate-400">{s.compatibility_reason}</p>
                                  <Button
                                    size="sm"
                                    className={cn(
                                      "galaxy-btn-glow mt-4 w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
                                      !blocked && outOfCredits && "opacity-50 hover:bg-sky-500/15",
                                    )}
                                    disabled={blocked}
                                    onClick={() => !blocked && openConnect(s)}
                                  >
                                    {blocked ? t.alreadyPending : outOfCredits ? cr.dailyLimitReached : t.requestConnection}
                                  </Button>
                                </div>
                              );
                            })}
                            {(suggestionsByIntent[intent.id] ?? []).length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-sm text-slate-500">
                                {t.matchQueueEmpty}
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
          </TabsContent>

          <TabsContent value="requests" className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t.pendingInboundTitle}</h2>
              <p className="text-sm text-slate-500">{t.pendingInboundDesc}</p>
              <div className="grid gap-4">
                {pendingInbound.length === 0 ? (
                  <Card className="border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                      <Inbox className="h-12 w-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                      <p className="max-w-sm text-sm leading-relaxed text-slate-400">{t.emptyInboundBody}</p>
                      <Link
                        href="/square"
                        className={cn(
                          buttonVariants({ variant: "default" }),
                          "galaxy-btn-glow inline-flex border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
                        )}
                      >
                        {t.browseExplore}
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  pendingInbound.map((m) => {
                    const preview = previewFrom(m);
                    return (
                      <Card key={m.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                        <CardHeader>
                          <CardTitle className="text-base text-slate-100">{t.newIntro}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {t.compatibility} {m.match_score ?? "—"} · {m.compatibility_reason}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.contextMessage}</p>
                            <p className="mt-2 text-slate-200">{m.introductory_context}</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.personaPreview}</p>
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
                              {t.accept}
                            </Button>
                            <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => void onRespond(m.id, "Rejected")}>
                              {t.decline}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t.outboundTitle}</h2>
              <p className="text-sm text-slate-500">{t.outboundDesc}</p>
              {outboundPending.length === 0 ? (
                <p className="text-sm text-slate-500">{t.outboundNone}</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-400">
                  {outboundPending.map((m) => (
                    <li key={m.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                      {t.outboundLine} · {m.compatibility_reason ?? t.outboundAwaiting}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t.curatedTitle}</h2>
              <p className="text-sm text-slate-500">{t.curatedDesc}</p>
              <div className="grid gap-4">
                {systemRecommended.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.noCurated}</p>
                ) : (
                  systemRecommended.map((m) => {
                    const isSender = m.sender_id === userId;
                    const myAck = isSender ? m.system_ack_sender : m.system_ack_receiver;
                    const peerAck = isSender ? m.system_ack_receiver : m.system_ack_sender;
                    return (
                      <Card key={m.id} className="border-indigo-500/20 bg-white/[0.035] backdrop-blur-xl">
                        <CardHeader>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base text-slate-100">{t.curatedPairing}</CardTitle>
                            <Badge variant="outline" className="border-indigo-400/30 text-indigo-100">
                              {t.pendingSystemBadge}
                            </Badge>
                          </div>
                          <CardDescription>{m.introductory_context}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <DualIntentBlurbs idA={m.intent_request_id} idB={m.counterparty_intent_id} />
                          <p className="text-xs text-slate-500">
                            {t.yourAck} {myAck ? t.recorded : t.waiting} · {t.peerAck}{" "}
                            {peerAck ? t.recorded : t.waiting}
                          </p>
                          {myAck && !peerAck ? <p className="text-xs text-indigo-200/90">{t.pendingNote}</p> : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="galaxy-btn-glow border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                              disabled={myAck && !peerAck}
                              onClick={() => void onRespond(m.id, "Accepted")}
                            >
                              {myAck && !peerAck ? t.pendingBtn : t.acceptBtn}
                            </Button>
                            <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => void onRespond(m.id, "Rejected")}>
                              {t.decline}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{t.connectionsTitle}</h2>
            <p className="text-sm text-slate-500">{t.connectionsDesc}</p>
            <div className="grid gap-4">
              {connectionsByPeer.length === 0 ? (
                <Card className="border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl">
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <Users className="h-12 w-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                    <p className="max-w-sm text-sm leading-relaxed text-slate-400">{t.emptyConnectionsBody}</p>
                    <Link
                      href="/square"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "galaxy-btn-glow inline-flex border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
                      )}
                    >
                      {t.browseExplore}
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                connectionsByPeer.map(([peerId, peerMatches]) => {
                  const matchIds = peerMatches.map((m) => m.id);
                  const sendOnMatchId = peerMatches[0]?.id ?? "";
                  const open = selectedPeerId === peerId;
                  const subtitle =
                    peerMatches.length > 1
                      ? t.multiIntroTpl.replace("{n}", String(peerMatches.length))
                      : peerMatches[0]?.compatibility_reason ?? "";
                  return (
                    <Card
                      key={peerId}
                      className={`border-white/10 bg-white/[0.035] backdrop-blur-xl transition-shadow ${open ? "ring-1 ring-sky-500/45 shadow-[0_0_24px_rgba(56,189,248,0.12)]" : ""}`}
                    >
                      <CardHeader>
                        <CardTitle className="text-base text-slate-100">{t.mutualMatch}</CardTitle>
                        <CardDescription className="text-slate-400">{subtitle}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <PeerIdentityCard peerUserId={peerId} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="galaxy-btn-glow border-white/15 text-slate-200"
                          onClick={() => setSelectedPeerId(open ? null : peerId)}
                        >
                          {open ? t.hideMessaging : t.openMessaging}
                        </Button>
                        {open && sendOnMatchId ? (
                          <div className="min-h-0">
                            <MergedMatchChatPanel matchIds={matchIds} sendOnMatchId={sendOnMatchId} userId={userId} />
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && openedFromLandingHandoffRef.current) {
            openedFromLandingHandoffRef.current = false;
            consumeLandingHandoffDraft();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialogNewTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.dialogNewDesc}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={createDraft}
            onChange={(e) => setCreateDraft(e.target.value)}
            placeholder={t.minChars}
            className="min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50"
          />
          <div className="space-y-2">
            <Label htmlFor="create-intent-location" className="text-slate-300">
              {t.locationOptional}
            </Label>
            <Input
              id="create-intent-location"
              value={createLocation}
              onChange={(e) => setCreateLocation(e.target.value)}
              placeholder={t.locationPlaceholderCreate}
              className="border-white/10 bg-white/[0.03] text-slate-50"
            />
            <p className="text-xs text-slate-500">{t.locationHintCreate}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setCreateOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              disabled={createBusy || createDraft.trim().length < 12}
              className="border border-sky-400/35 bg-sky-500/15 text-sky-50"
              onClick={() => void onCreateIntent()}
            >
              {createBusy ? t.createBusy : t.createSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editIntent} onOpenChange={(o) => !o && setEditIntent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialogEditTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.dialogEditDesc}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            placeholder={t.minChars}
            className="min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50"
          />
          <div className="space-y-2">
            <Label htmlFor="edit-intent-location" className="text-slate-300">
              {t.locationLabelEdit}
            </Label>
            <Input
              id="edit-intent-location"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder={t.locationPlaceholderEdit}
              className="border-white/10 bg-white/[0.03] text-slate-50"
            />
            <p className="text-xs text-slate-500">{t.locationHintEdit}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setEditIntent(null)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              disabled={editBusy || editDraft.trim().length < 12}
              className="border border-sky-400/35 bg-sky-500/15 text-sky-50"
              onClick={() => void onEditIntent()}
            >
              {editBusy ? t.saveBusy : t.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={freshMatchesModal !== null}
        onOpenChange={(open) => {
          if (!open) setFreshMatchesModal(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.freshMatchesTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.freshMatchesSubtitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            {(freshMatchesModal ?? []).map((s) => {
              const blocked = blockedPeers.has(s.owner_user_id);
              return (
                <div
                  key={s.intent_id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <LockedAvatarPreview />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{t.compatibility}</p>
                      <p className="text-lg font-semibold text-sky-200">{s.match_score}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-4 flex-1 break-words text-sm text-slate-200">{s.natural_language_input}</p>
                  <p className="mt-3 break-words text-xs leading-relaxed text-slate-400">{s.compatibility_reason}</p>
                  <Button
                    size="sm"
                    className={cn(
                      "galaxy-btn-glow mt-4 w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
                      !blocked && outOfCredits && "opacity-50 hover:bg-sky-500/15",
                    )}
                    disabled={blocked}
                    onClick={() => !blocked && openConnectAndDismissFresh(s)}
                  >
                    {blocked ? t.alreadyPending : outOfCredits ? cr.dailyLimitReached : t.requestConnection}
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-white/15 text-slate-200" onClick={() => setFreshMatchesModal(null)}>
              {t.freshMatchesGotIt}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreditsLimitModal open={creditsTeaserOpen} onOpenChange={setCreditsTeaserOpen} />

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
          onInviteSent={() => void refreshCredits()}
        />
      ) : null}
    </div>
  );
}
