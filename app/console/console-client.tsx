"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
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
import { InviteQuotaPill } from "@/components/invite-quota-pill";
import { IntentCardRequestsList } from "@/components/intent-card-requests-list";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { IntentShareButton } from "@/components/intent-share-button";
import { IntentSnippet } from "@/components/intent-snippet";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { PeerIdentityCard } from "@/components/peer-identity-card";
import { useLanguage } from "@/components/language-provider";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConnectionCredits } from "@/hooks/use-connection-credits";
import {
  clearLandingIntentDraftBackups,
  MIN_INTENT_CHARS,
  readLandingIntentDraftBackup,
} from "@/lib/intent-draft";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

type Props = {
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
  blockedPeerIds: string[];
  initialConsoleTab?: "intents" | "requests" | "connections";
  /** Post-login cue from `/console?cue=` — stripped client-side after handling. */
  initialConsoleCue?: "pulseCreateIntent" | "openIntentDraft" | null;
  quotaSnapshot: {
    activeIntentCount: number;
    maxActiveIntents: number;
    unlimitedIntents: boolean;
  };
  profileReadyForInvites?: boolean;
};

export function ConsoleClient({
  userId,
  intents,
  matches,
  blockedPeerIds,
  initialConsoleTab = "intents",
  initialConsoleCue = null,
  quotaSnapshot,
  profileReadyForInvites = true,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const t = strings.console;
  const cr = strings.credits;

  const { refresh: refreshCredits, outOfCredits } = useConnectionCredits(userId);
  const [creditsTeaserOpen, setCreditsTeaserOpen] = useState(false);

  const intentAtCap =
    !quotaSnapshot.unlimitedIntents &&
    quotaSnapshot.activeIntentCount >= quotaSnapshot.maxActiveIntents;

  function localizeConsoleFailure(res: { ok: false; message: string; code?: string }) {
    if (res.code === "MAX_ACTIVE_INTENTS" || res.message === "MAX_ACTIVE_INTENTS") {
      return t.intentLimitMessage;
    }
    return res.message;
  }

  const blockedPeers = useMemo(() => new Set(blockedPeerIds), [blockedPeerIds]);

  const [busyIntent, setBusyIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectCtx, setConnectCtx] = useState<{
    receiverUserId: string;
    receiverIntentId: string;
    headline: string;
    senderContextIntentId: string | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"intents" | "requests" | "connections">(() => initialConsoleTab);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createMustHaves, setCreateMustHaves] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const openedFromLandingHandoffRef = useRef(false);
  const [pulseCreateBtn, setPulseCreateBtn] = useState(false);

  function consumeLandingHandoffDraft() {
    useSessionStore.getState().clearLandingIntent();
    clearLandingIntentDraftBackups();
  }

  useEffect(() => {
    let raw = useSessionStore.getState().landingIntentText?.trim() ?? "";
    if (raw.length < MIN_INTENT_CHARS) {
      raw = readLandingIntentDraftBackup()?.trim() ?? "";
    }
    const forceOpenCue = initialConsoleCue === "openIntentDraft";
    if (raw.length < MIN_INTENT_CHARS && !forceOpenCue) return;
    if (raw.length < MIN_INTENT_CHARS) return;

    openedFromLandingHandoffRef.current = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate create dialog from landing / post-login cue */
    setCreateDraft(raw);
    setCreateMustHaves("");
    setCreateLocation("");
    setCreateOpen(true);
    setActiveTab("intents");
  }, [initialConsoleCue]);

  useEffect(() => {
    if (initialConsoleCue !== "pulseCreateIntent") return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- cue-driven tab highlight after landing/login */
    setActiveTab("intents");
    if (intents.length === 0) setPulseCreateBtn(true);
    const tid = window.setTimeout(() => setPulseCreateBtn(false), 14000);
    return () => window.clearTimeout(tid);
  }, [initialConsoleCue, intents.length]);

  useEffect(() => {
    if (!initialConsoleCue) return;
    const u = new URL(window.location.href);
    if (!u.searchParams.has("cue")) return;
    u.searchParams.delete("cue");
    window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
  }, [initialConsoleCue]);

  const [editIntent, setEditIntent] = useState<IntentRow | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMustHaves, setEditMustHaves] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [postCreateDiscovering, setPostCreateDiscovering] = useState(false);
  const [freshMatchesModal, setFreshMatchesModal] = useState<SuggestionCard[] | null>(null);
  const [freshMatchesIntentId, setFreshMatchesIntentId] = useState<string | null>(null);

  const outboundInvitesToOthers = useMemo(() => {
    const mine = new Set(intents.map((i) => i.id));
    return matches
      .filter(
        (m) =>
          m.sender_id === userId &&
          Boolean(m.intent_request_id) &&
          !mine.has(m.intent_request_id!) &&
          (m.status === "Pending" || m.status === "Accepted" || m.status === "Rejected"),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [matches, userId, intents]);

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
      setError(localizeConsoleFailure(res));
      return;
    }
    router.refresh();
  }

  /** Same pipeline & modal UI as post-create AI suggestions (`computeHybridSuggestions`). */
  async function loadSuggestions(intentId: string) {
    setBusyIntent(intentId);
    setError(null);
    const res = await computeHybridSuggestions(intentId);
    setBusyIntent(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setFreshMatchesIntentId(intentId);
    setFreshMatchesModal(res.suggestions);
  }

  async function onRespond(matchId: string, decision: "Accepted" | "Rejected") {
    const res = await respondToMatch(matchId, decision);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await router.refresh();
  }

  function openConnect(card: SuggestionCard, senderContextIntentId?: string | null) {
    if (!profileReadyForInvites) {
      router.push(`/profile?required=profile&after=${encodeURIComponent("/console")}`);
      return;
    }
    if (outOfCredits) {
      setCreditsTeaserOpen(true);
      return;
    }
    setConnectCtx({
      receiverUserId: card.owner_user_id,
      receiverIntentId: card.intent_id,
      headline: t.connectHeadlineSuggestion,
      senderContextIntentId: senderContextIntentId ?? null,
    });
    setConnectOpen(true);
  }

  function openConnectAndDismissFresh(card: SuggestionCard) {
    const senderIntent = freshMatchesIntentId;
    setFreshMatchesModal(null);
    setFreshMatchesIntentId(null);
    openConnect(card, senderIntent);
  }

  async function onCreateIntent() {
    setCreateBusy(true);
    setError(null);
    const res = await createConsoleIntent(
      createDraft,
      createLocation.trim() || undefined,
      createMustHaves.trim() || undefined,
    );
    setCreateBusy(false);
    if (!res.ok) {
      setError(localizeConsoleFailure(res));
      return;
    }
    openedFromLandingHandoffRef.current = false;
    consumeLandingHandoffDraft();
    const newIntentId = res.intentId;
    setCreateDraft("");
    setCreateLocation("");
    setCreateMustHaves("");
    setCreateOpen(false);
    setPostCreateDiscovering(true);
    setError(null);
    const discover = await computeHybridSuggestions(newIntentId);
    setPostCreateDiscovering(false);
    await router.refresh();
    if (discover.ok && discover.suggestions.length > 0) {
      setFreshMatchesIntentId(newIntentId);
      setFreshMatchesModal(discover.suggestions);
    } else if (!discover.ok) {
      setError(discover.message);
    }
  }

  async function onEditIntent() {
    if (!editIntent) return;
    setEditBusy(true);
    setError(null);
    const res = await updateConsoleIntent(
      editIntent.id,
      editDraft,
      editLocation.trim() || undefined,
      editMustHaves.trim() || undefined,
    );
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
    setEditMustHaves(i.must_haves ?? "");
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
            <div className="mt-4">
              <InviteQuotaPill userId={userId} quota={quotaSnapshot} />
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        {postCreateDiscovering ? (
          <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{t.freshMatchesSearching}</p>
        ) : null}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="gap-6">
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
                disabled={intentAtCap}
                title={intentAtCap ? t.intentLimitMessage : undefined}
                className={cn(
                  "galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40",
                  pulseCreateBtn && "animate-pulse ring-2 ring-sky-400/55 shadow-[0_0_22px_rgba(56,189,248,0.28)]",
                )}
                onClick={() => {
                  setCreateDraft("");
                  setCreateLocation("");
                  setCreateMustHaves("");
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
                          <IntentMustHavesCallout
                            className="mt-3"
                            heading={t.mustHavesCardHeading}
                            body={intent.must_haves ?? ""}
                          />
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
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t.intentDashboard.sectionTitle}</p>
                          <p className="text-xs leading-relaxed text-slate-500">{t.intentDashboard.sectionHint}</p>
                        </div>
                        <IntentCardRequestsList
                          intentId={intent.id}
                          userId={userId}
                          matches={matches}
                          onRespond={(id, dec) => void onRespond(id, dec)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t.outboundTitle}</h2>
              <p className="text-sm text-slate-500">{t.outboundDesc}</p>
              {outboundInvitesToOthers.length === 0 ? (
                <Card className="border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl">
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <p className="max-w-sm text-sm leading-relaxed text-slate-400">{t.outboundNone}</p>
                  </CardContent>
                </Card>
              ) : (
                <ul className="grid gap-4">
                  {outboundInvitesToOthers.map((m) => {
                    const statusBadge =
                      m.status === "Accepted"
                        ? {
                            label: t.intentDashboard.tagStatusAccepted,
                            className: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
                          }
                        : m.status === "Rejected"
                          ? {
                              label: t.intentDashboard.tagStatusDeclined,
                              className: "border-slate-500/40 text-slate-400",
                            }
                          : {
                              label: t.statusPendingBadge,
                              className: "border-amber-400/35 text-amber-100",
                            };
                    return (
                    <li key={m.id}>
                      <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                        <CardHeader className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base text-slate-100">{t.outboundLine}</CardTitle>
                            <Badge variant="outline" className={statusBadge.className}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.contextMessage}</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">{m.introductory_context}</p>
                          </div>
                          <IntentSnippet intentId={m.intent_request_id} label={t.outboundListingLabel} />
                          {typeof m.match_score === "number" ? (
                            <p className="text-xs tabular-nums text-slate-500">
                              {t.matchFitScore}: {m.match_score}
                            </p>
                          ) : null}
                          {m.status === "Accepted" ? (
                            <Link
                              href={`/messages?matchId=${encodeURIComponent(m.id)}`}
                              className={cn(
                                buttonVariants({ variant: "default", size: "sm" }),
                                "galaxy-btn-glow inline-flex w-full justify-center border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto",
                              )}
                            >
                              {t.messagePeerCta}
                            </Link>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{t.connectionsTitle}</h2>
            {t.connectionsDesc ? <p className="text-sm text-slate-500">{t.connectionsDesc}</p> : null}
            <div className="grid gap-4">
              {connectionsByPeer.length === 0 ? (
                <Card className="border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl">
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <Users className="h-12 w-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                    <p className="max-w-sm text-sm leading-relaxed text-slate-400">{t.emptyConnectionsBody}</p>
                  </CardContent>
                </Card>
              ) : (
                connectionsByPeer.map(([peerId, peerMatches]) => {
                  const sendOnMatchId = peerMatches[0]?.id ?? "";
                  const subtitle =
                    peerMatches.length > 1
                      ? t.multiIntroTpl.replace("{n}", String(peerMatches.length))
                      : peerMatches[0]?.introductory_context?.trim() || "";
                  return (
                    <Card key={peerId} className="border-white/10 bg-white/[0.035] backdrop-blur-xl transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-base text-slate-100">{t.mutualMatch}</CardTitle>
                        <CardDescription className="line-clamp-3 text-slate-400">{subtitle || "—"}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <PeerIdentityCard peerUserId={peerId} showViewProfileButton />
                        {sendOnMatchId ? (
                          <Link
                            href={`/messages?matchId=${encodeURIComponent(sendOnMatchId)}`}
                            className={cn(
                              buttonVariants({ variant: "default", size: "sm" }),
                              "galaxy-btn-glow inline-flex w-full justify-center border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto",
                            )}
                          >
                            {t.messagePeerCta}
                          </Link>
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
            <p className="text-xs leading-relaxed text-sky-300/85">{t.intentExploreIdentityPreviewNote}</p>
          </DialogHeader>
          <Textarea
            value={createDraft}
            onChange={(e) => setCreateDraft(e.target.value)}
            placeholder={t.minChars}
            className="min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50"
          />
          <div className="space-y-2">
            <Label htmlFor="create-intent-must-haves" className="text-slate-300">
              {t.mustHavesLabel}
            </Label>
            <p className="text-xs text-slate-500">{t.mustHavesDesc}</p>
            <Textarea
              id="create-intent-must-haves"
              value={createMustHaves}
              onChange={(e) => setCreateMustHaves(e.target.value)}
              placeholder={t.mustHavesPlaceholder}
              className="min-h-[88px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-600"
            />
          </div>
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
          {intentAtCap ? (
            <p className="text-xs leading-relaxed text-amber-400/95">{t.intentLimitMessage}</p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setCreateOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              disabled={createBusy || createDraft.trim().length < 12 || intentAtCap}
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
            <p className="text-xs leading-relaxed text-sky-300/85">{t.intentExploreIdentityPreviewNote}</p>
          </DialogHeader>
          <Textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            placeholder={t.minChars}
            className="min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50"
          />
          <div className="space-y-2">
            <Label htmlFor="edit-intent-must-haves" className="text-slate-300">
              {t.mustHavesLabel}
            </Label>
            <p className="text-xs text-slate-500">{t.mustHavesDesc}</p>
            <Textarea
              id="edit-intent-must-haves"
              value={editMustHaves}
              onChange={(e) => setEditMustHaves(e.target.value)}
              placeholder={t.mustHavesPlaceholder}
              className="min-h-[88px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-600"
            />
          </div>
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
          if (!open) {
            setFreshMatchesModal(null);
            setFreshMatchesIntentId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.freshMatchesTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.freshMatchesSubtitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            {(freshMatchesModal ?? []).length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
                {t.intentDashboard.discoverCarouselEmpty}
              </div>
            ) : (
              (freshMatchesModal ?? []).map((s) => {
              const blocked = blockedPeers.has(s.owner_user_id);
              return (
                <div
                  key={s.intent_id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <LockedAvatarPreview />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{t.matchFitScore}</p>
                      <p className="text-lg font-semibold text-sky-200">{s.match_score}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-4 flex-1 break-words text-sm text-slate-200">{s.natural_language_input}</p>
                  <Button
                    size="sm"
                    className={cn(
                      "galaxy-btn-glow mt-4 min-h-11 w-full touch-manipulation border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:min-h-10",
                      !blocked && outOfCredits && "opacity-50 hover:bg-sky-500/15",
                    )}
                    disabled={blocked}
                    onClick={() => !blocked && openConnectAndDismissFresh(s)}
                  >
                    {blocked ? t.alreadyPending : outOfCredits ? cr.dailyLimitReached : t.requestConnection}
                  </Button>
                </div>
              );
            })
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 text-slate-200"
              onClick={() => {
                setFreshMatchesModal(null);
                setFreshMatchesIntentId(null);
              }}
            >
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
          senderContextIntentId={connectCtx.senderContextIntentId ?? undefined}
          onInviteSent={() => void refreshCredits()}
          profileIncompleteResumeAfter="/console"
        />
      ) : null}
    </div>
  );
}
