"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntentRow, SuggestionCard } from "@/actions/intents";
import {
  computeHybridSuggestions,
  createConsoleIntent,
  deleteMyIntent,
  setIntentMarketplacePublic,
  setIntentStatus,
  updateConsoleIntent,
} from "@/actions/intents";
import type { MatchRow } from "@/actions/matches";
import { respondToMatch } from "@/actions/matches";
import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import { AiRecommendationsConsole } from "@/components/ai-recommendations-console";
import { ConnectModal } from "@/components/connect-modal";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { InviteQuotaPill } from "@/components/invite-quota-pill";
import {
  IntentCardRequestsList,
  intentManageTabNeedsAttention,
  filterDedupOutboundOverlappingAiSaved,
  filterMatchesForIntentCard,
} from "@/components/intent-card-requests-list";
import { IntentMustHavesCallout } from "@/components/intent-must-haves-callout";
import { IntentShareButton } from "@/components/intent-share-button";
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
import { SenderPreviewBlock } from "@/components/sender-preview-block";
import { SuggestionProfilePreviewDialog } from "@/components/suggestion-profile-preview-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConnectionCredits } from "@/hooks/use-connection-credits";
import {
  clearLandingIntentDraftBackups,
  MIN_INTENT_CHARS,
  readLandingIntentDraftBackup,
} from "@/lib/intent-draft";
import { aiRecommendationOutboundOverlap } from "@/lib/ai-recommendation-outbound-overlap";
import { aiRecommendationToSuggestionCard } from "@/lib/ai-recommendation-to-suggestion-card";
import { displayProfileAgeGroup } from "@/lib/display-age-group";
import { peerGenderLabelFromSlug } from "@/lib/peer-profile-labels";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

/** Connections-tab dot: matches newer than (mount time − window); cutoff fixed at first render for stable purity. */
const CONNECTION_TAB_RECENCY_MS = 72 * 60 * 60 * 1000;

type Props = {
  userId: string;
  intents: IntentRow[];
  matches: MatchRow[];
  blockedPeerIds: string[];
  aiRecommendations: AiRecommendationListItem[];
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
  aiRecommendations,
  initialConsoleTab = "intents",
  initialConsoleCue = null,
  quotaSnapshot,
  profileReadyForInvites = true,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const t = strings.console;
  const pr = strings.profilePage;
  const cr = strings.credits;

  function peerGenderLabel(raw: string | null): string | null {
    return peerGenderLabelFromSlug(raw, {
      genderWoman: t.genderWoman,
      genderMan: t.genderMan,
      genderNonBinary: t.genderNonBinary,
      genderPreferNotSay: t.genderPreferNotSay,
      genderOther: t.genderOther,
    });
  }

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

  const intentExpansionKey = useMemo(() => intents.map((i) => i.id).join("|"), [intents]);
  const [intentDetailExpandedById, setIntentDetailExpandedById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    /* Sync default fold state whenever intent IDs change — user toggles persist until an id disappears. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge refetched intents with per-id fold overrides
    setIntentDetailExpandedById((prev) => {
      const next = { ...prev };
      intents.forEach((intent, idx) => {
        if (next[intent.id] === undefined) {
          next[intent.id] = intents.length <= 1 || idx === 0;
        }
      });
      for (const k of Object.keys(next)) {
        if (!intents.some((i) => i.id === k)) delete next[k];
      }
      return next;
    });
  }, [intentExpansionKey, intents]);

  const [busyIntent, setBusyIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectCtx, setConnectCtx] = useState<{
    receiverUserId: string;
    receiverIntentId: string | null;
    headline: string;
    senderContextIntentId: string | null;
    initialIntro: string;
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
  const [intentDeleteTarget, setIntentDeleteTarget] = useState<IntentRow | null>(null);
  const [deleteIntentBusy, setDeleteIntentBusy] = useState(false);
  const [deleteIntentError, setDeleteIntentError] = useState<string | null>(null);

  const [postCreateDiscovering, setPostCreateDiscovering] = useState(false);
  const [freshMatchesModal, setFreshMatchesModal] = useState<SuggestionCard[] | null>(null);
  const [freshMatchesIntentId, setFreshMatchesIntentId] = useState<string | null>(null);
  const [previewPeerId, setPreviewPeerId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const outboundInvitesToOthers = useMemo(() => {
    const mine = new Set(intents.map((i) => i.id));
    return matches
      .filter(
        (m) =>
          m.sender_id === userId &&
          !mine.has(m.intent_request_id ?? "") &&
          (m.status === "Pending" || m.status === "Accepted" || m.status === "Rejected"),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [matches, userId, intents]);

  const inboundProfileDiscovery = useMemo(() => {
    return matches
      .filter((m) => {
        if (m.receiver_id !== userId) return false;
        if (m.status !== "Pending") return false;
        if (m.counterparty_intent_id) return false;
        /** Explore tap on your listing — keep out of hub (handled under each request card). */
        const exploreListingInvite =
          Boolean(m.intent_request_id) && !m.sender_context_intent_id;
        if (exploreListingInvite) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [matches, userId]);

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

  const [connectionsAttentionCutoff] = useState(() => Date.now() - CONNECTION_TAB_RECENCY_MS);

  const intentsTabAttention = useMemo(
    () => intents.some((i) => intentManageTabNeedsAttention(i.id, userId, matches)),
    [intents, userId, matches],
  );

  const requestsTabAttention = useMemo(
    () =>
      inboundProfileDiscovery.length > 0 ||
      outboundInvitesToOthers.some((m) => m.status === "Pending") ||
      aiRecommendations.length > 0,
    [inboundProfileDiscovery, outboundInvitesToOthers, aiRecommendations.length],
  );

  const connectionsTabAttention = useMemo(() => {
    return connectionsByPeer.some(([, rows]) =>
      rows.some((m) => new Date(m.created_at).getTime() >= connectionsAttentionCutoff),
    );
  }, [connectionsByPeer, connectionsAttentionCutoff]);

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
    const ctxIntentId = senderContextIntentId ?? null;
    const intentRow = ctxIntentId ? intents.find((i) => i.id === ctxIntentId) : undefined;
    const initialIntro = intentRow?.natural_language_input?.trim() ?? "";
    setConnectCtx({
      receiverUserId: card.owner_user_id,
      receiverIntentId: card.intent_id,
      headline: t.connectHeadlineSuggestion,
      senderContextIntentId: ctxIntentId,
      initialIntro,
    });
    setConnectOpen(true);
  }

  function openConnectAndDismissFresh(card: SuggestionCard) {
    const senderIntent = freshMatchesIntentId;
    setFreshMatchesModal(null);
    setFreshMatchesIntentId(null);
    openConnect(card, senderIntent);
  }

  function openInviteFromAiRecommendation(row: AiRecommendationListItem) {
    openConnect(aiRecommendationToSuggestionCard(row), row.intent_id);
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
    if (discover.ok) {
      setFreshMatchesIntentId(newIntentId);
      setFreshMatchesModal(discover.suggestions);
    } else {
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

  async function confirmDeleteIntent() {
    if (!intentDeleteTarget) return;
    setDeleteIntentBusy(true);
    setDeleteIntentError(null);
    const id = intentDeleteTarget.id;
    const res = await deleteMyIntent(id);
    setDeleteIntentBusy(false);
    if (!res.ok) {
      setDeleteIntentError(res.message);
      return;
    }
    setIntentDeleteTarget(null);
    if (editIntent?.id === id) setEditIntent(null);
    if (busyIntent === id) setBusyIntent(null);
    if (freshMatchesIntentId === id) {
      setFreshMatchesModal(null);
      setFreshMatchesIntentId(null);
    }
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

        {!quotaSnapshot.unlimitedIntents && intentAtCap ? (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/[0.1] px-4 py-3 text-sm leading-relaxed text-amber-100 md:text-[15px]">
            {t.intentLimitReachedBanner}
          </div>
        ) : null}

        {postCreateDiscovering ? (
          <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{t.freshMatchesSearching}</p>
        ) : null}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="gap-6">
          <TabsList className="grid min-w-0 w-full grid-cols-3 gap-1 [&_[data-slot=tabs-trigger]]:justify-center [&_[data-slot=tabs-trigger]]:px-2 sm:[&_[data-slot=tabs-trigger]]:px-4">
            <TabsTrigger
              value="intents"
              className="gap-2"
              aria-label={intentsTabAttention ? `${t.tabIntents} — ${t.manageTabBadgeAria}` : t.tabIntents}
            >
              <span>{t.tabIntents}</span>
              {intentsTabAttention ? (
                <span
                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                  aria-hidden
                />
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="gap-2 max-md:w-full md:max-w-none"
              aria-label={requestsTabAttention ? `${t.tabRequests} — ${t.manageTabBadgeAria}` : t.tabRequests}
            >
              <span>{t.tabRequests}</span>
              {requestsTabAttention ? (
                <span
                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                  aria-hidden
                />
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="connections"
              className="gap-2"
              aria-label={connectionsTabAttention ? `${t.tabConnections} — ${t.manageTabBadgeAria}` : t.tabConnections}
            >
              <span>{t.tabConnections}</span>
              {connectionsTabAttention ? (
                <span
                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                  aria-hidden
                />
              ) : null}
            </TabsTrigger>
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
                intents.map((intent, intentIndex) => {
                  const intentExpanded =
                    intents.length <= 1 || (intentDetailExpandedById[intent.id] ?? intentIndex === 0);

                  return (
                  <Card key={intent.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                    <CardHeader className="gap-4 px-4 pb-2 pt-6 sm:px-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                        <div className="flex min-w-0 w-full gap-3 md:flex-1">
                          {intents.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setIntentDetailExpandedById((prev) => {
                                  const expanded =
                                    intents.length <= 1 || (prev[intent.id] ?? intentIndex === 0);
                                  return { ...prev, [intent.id]: !expanded };
                                })
                              }
                              className="mt-1 shrink-0 self-start rounded-xl p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                              aria-expanded={intentExpanded}
                              aria-label={t.intentFoldToggleAria}
                            >
                              {intentExpanded ? (
                                <ChevronDown className="h-5 w-5" aria-hidden />
                              ) : (
                                <ChevronRight className="h-5 w-5" aria-hidden />
                              )}
                            </button>
                          ) : null}
                          <div className="min-w-0 flex-1 space-y-3">
                            <CardTitle className="text-base text-slate-100">{t.intentCardTitle}</CardTitle>
                            <CardDescription
                              className={cn(
                                "w-full max-w-none whitespace-normal text-sm leading-relaxed text-slate-300",
                                intents.length > 1 && !intentExpanded && "line-clamp-2 md:line-clamp-3",
                              )}
                            >
                              {intent.natural_language_input}
                            </CardDescription>
                            {intentExpanded ? (
                              <IntentMustHavesCallout
                                className="w-full max-w-none"
                                heading={t.mustHavesCardHeading}
                                body={intent.must_haves ?? ""}
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end md:w-auto md:justify-end">
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
                            className="min-h-11 border-white/15 bg-transparent text-slate-200 sm:min-h-9"
                            onClick={() => openEdit(intent)}
                          >
                            {t.edit}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 border-red-500/50 bg-red-500/12 text-red-100 hover:bg-red-500/18 hover:text-white sm:min-h-9"
                            onClick={() => {
                              setDeleteIntentError(null);
                              setIntentDeleteTarget(intent);
                            }}
                          >
                            {t.deleteIntent}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {intentExpanded ? (
                    <CardContent className="space-y-6 px-4 pb-6 sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                          <Button
                            variant="outline"
                            className="galaxy-btn-glow min-h-11 w-full touch-manipulation border-white/15 bg-transparent text-slate-100 sm:w-auto sm:min-h-10"
                            onClick={() => void togglePaused(intent.id, intent.status === "active" ? "paused" : "active")}
                          >
                            {intent.status === "active" ? t.pauseMatching : t.resumeMatching}
                          </Button>
                          <Button
                            className="galaxy-btn-glow min-h-11 w-full touch-manipulation border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto sm:min-h-10"
                            disabled={busyIntent === intent.id || intent.status !== "active"}
                            onClick={() => void loadSuggestions(intent.id)}
                          >
                            {busyIntent === intent.id ? t.discovering : t.discoverMatches}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-white/10 pt-6">
                        {(() => {
                          const invitationRowsRaw = filterMatchesForIntentCard(
                            intent.id,
                            userId,
                            matches,
                          ).filter((m) => m.status !== "Rejected");
                          const aiRowsForIntent = aiRecommendations.filter((r) => r.intent_id === intent.id);
                          const aiVisibleForIntentCount = aiRowsForIntent.filter(
                            (r) =>
                              !aiRecommendationOutboundOverlap(
                                matches,
                                userId,
                                intent.id,
                                r.candidate_profile_id,
                              ),
                          ).length;
                          const aiPeerIdsWithVisibleSuggestion = new Set(
                            aiRowsForIntent
                              .filter(
                                (r) =>
                                  !aiRecommendationOutboundOverlap(
                                    matches,
                                    userId,
                                    intent.id,
                                    r.candidate_profile_id,
                                  ),
                              )
                              .map((r) => r.candidate_profile_id),
                          );
                          const invitationRows = filterDedupOutboundOverlappingAiSaved(
                            invitationRowsRaw,
                            intent.id,
                            userId,
                            aiPeerIdsWithVisibleSuggestion,
                          );
                          const unifiedEmpty = invitationRows.length === 0 && aiVisibleForIntentCount === 0;
                          return (
                            <>
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-white">{t.aiRecIntentMergedTitle}</h3>
                                <p className="text-xs leading-relaxed text-slate-500">{t.aiRecIntentMergedHint}</p>
                              </div>
                              {unifiedEmpty ? (
                                <div className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-10 text-center">
                                  <p className="text-sm leading-relaxed text-slate-500">{t.aiRecIntentMergedEmpty}</p>
                                </div>
                              ) : (
                                <div className="space-y-5">
                                  {invitationRows.length > 0 ? (
                                    <IntentCardRequestsList
                                      intentId={intent.id}
                                      userId={userId}
                                      matches={matches}
                                      shapedInviteRows={invitationRows}
                                      onRespond={(id, dec) => void onRespond(id, dec)}
                                    />
                                  ) : null}
                                  <AiRecommendationsConsole
                                    variant="intentStrip"
                                    hideHeader
                                    intentId={intent.id}
                                    rows={aiRecommendations}
                                    matches={matches}
                                    userId={userId}
                                    blockedPeerIds={blockedPeers}
                                    onInvite={(row) => openInviteFromAiRecommendation(row)}
                                    onPreview={(uid) => {
                                      setPreviewPeerId(uid);
                                      setPreviewOpen(true);
                                    }}
                                    onAfterDismiss={() => void router.refresh()}
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                    ) : null}
                  </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-10">
            <AiRecommendationsConsole
              variant="requestsHub"
              rows={aiRecommendations}
              matches={matches}
              userId={userId}
              blockedPeerIds={blockedPeers}
              onInvite={(row) => openInviteFromAiRecommendation(row)}
              onPreview={(uid) => {
                setPreviewPeerId(uid);
                setPreviewOpen(true);
              }}
              onAfterDismiss={() => void router.refresh()}
            />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t.inboundDiscoveryTitle}</h2>
              <p className="text-sm text-slate-500">{t.inboundDiscoveryDesc}</p>
              {inboundProfileDiscovery.length === 0 ? (
                <Card className="border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl">
                  <CardContent className="py-10 text-center text-sm text-slate-500">{t.noInbound}</CardContent>
                </Card>
              ) : (
                <ul className="grid gap-4">
                  {inboundProfileDiscovery.map((m) => (
                    <li key={m.id}>
                      <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
                        <CardHeader className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-sky-400/35 text-sky-100">
                              {t.inboundDiscoveryBadge}
                            </Badge>
                            <Badge variant="outline" className="border-amber-400/35 text-amber-100">
                              {t.statusPendingBadge}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <SenderPreviewBlock match={m} />
                          {typeof m.match_score === "number" ? (
                            <p className="text-xs tabular-nums text-slate-500">
                              {t.matchFitScore}: {m.match_score}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button
                              size="sm"
                              className="min-h-11 w-full touch-manipulation border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 sm:w-auto sm:min-h-10"
                              onClick={() => void onRespond(m.id, "Accepted")}
                            >
                              {t.accept}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="min-h-11 w-full touch-manipulation text-slate-400 hover:bg-white/5 sm:w-auto sm:min-h-10"
                              onClick={() => void onRespond(m.id, "Rejected")}
                            >
                              {t.decline}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
                          {typeof m.match_score === "number" ? (
                            <p className="text-xs tabular-nums text-slate-500">
                              {t.matchFitScore}: {m.match_score}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11 w-full touch-manipulation border-white/[0.15] bg-white/[0.04] text-slate-50 hover:bg-white/[0.08] sm:w-auto sm:min-h-10"
                              onClick={() => {
                                setPreviewPeerId(m.receiver_id);
                                setPreviewOpen(true);
                              }}
                            >
                              {t.aiRecPreview}
                            </Button>
                            {m.status === "Accepted" ? (
                              <Link
                                href={`/messages?matchId=${encodeURIComponent(m.id)}`}
                                className={cn(
                                  buttonVariants({ variant: "default", size: "sm" }),
                                  "galaxy-btn-glow inline-flex min-h-11 w-full justify-center border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto sm:min-h-10",
                                )}
                              >
                                {t.messagePeerCta}
                              </Link>
                            ) : null}
                          </div>
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
            {t.locationHintEdit.trim() ? (
              <p className="text-xs text-slate-500">{t.locationHintEdit}</p>
            ) : null}
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
        open={intentDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIntentDeleteTarget(null);
            setDeleteIntentError(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.deleteIntentConfirmTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.deleteIntentConfirmDesc}</DialogDescription>
          </DialogHeader>
          {intentDeleteTarget?.natural_language_input?.trim() ? (
            <blockquote className="rounded-lg border border-white/12 bg-black/25 px-3 py-2.5 text-xs leading-snug text-slate-300 max-sm:leading-relaxed [&]:line-clamp-4 [&]:[display:-webkit-box] [&]:[-webkit-line-clamp:4] [&]:[-webkit-box-orient:vertical] [&]:overflow-hidden">
              {intentDeleteTarget.natural_language_input.trim()}
            </blockquote>
          ) : null}
          {deleteIntentError ? (
            <p className="text-sm leading-snug text-red-300">{deleteIntentError}</p>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="order-3 w-full border-white/20 sm:order-1 sm:w-auto"
              disabled={deleteIntentBusy}
              onClick={() => {
                setIntentDeleteTarget(null);
                setDeleteIntentError(null);
              }}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="order-2 w-full bg-red-600 hover:bg-red-600/90 sm:order-2 sm:ml-auto sm:w-auto"
              disabled={deleteIntentBusy}
              onClick={() => void confirmDeleteIntent()}
            >
              {deleteIntentBusy ? t.deleteIntentBusy : t.deleteIntentConfirmCta}
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
        <DialogContent className="max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] overflow-y-auto overscroll-contain border-white/10 bg-slate-950/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-slate-50 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.freshMatchesTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{t.freshMatchesSubtitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-3">
            {(freshMatchesModal ?? []).length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm leading-relaxed text-slate-400">
                {t.freshMatchesEmptyState}
              </div>
            ) : (
              (freshMatchesModal ?? []).map((s) => {
                const blocked = blockedPeers.has(s.owner_user_id);
                const gLabel = peerGenderLabel(s.peer_gender);
                const ageLbl = displayProfileAgeGroup(s.peer_age_group, pr);
                const kw = (s.peer_skills_tags ?? []).filter(Boolean);
                const langs = (s.peer_languages ?? []).filter(Boolean);
                return (
                  <div
                    key={`${s.discovery_source}-${s.owner_user_id}-${s.intent_id ?? "profile"}`}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 px-4 py-5 backdrop-blur-xl"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <LockedAvatarPreview />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Badge variant="outline" className="border-white/15 text-[10px] font-normal text-slate-400">
                          {s.discovery_source === "profile" ? t.suggestionBadgeProfile : t.suggestionBadgeIntent}
                        </Badge>
                        <p className="text-base font-semibold leading-snug text-white">{t.suggestionAnonymousTitle}</p>
                        {ageLbl ? (
                          <p className="text-xs text-slate-400">
                            {pr.ageGroupLabel}: {ageLbl}
                          </p>
                        ) : null}
                        {gLabel ? (
                          <p className="text-xs text-slate-400">
                            {t.profileGender}: {gLabel}
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500">{t.matchFitScore}</p>
                        <p className="text-lg font-semibold text-sky-200">{s.match_score}</p>
                      </div>
                    </div>
                    {s.peer_bio?.trim() ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                          {t.suggestionTheirBio}
                        </p>
                        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-200">{s.peer_bio.trim()}</p>
                      </div>
                    ) : null}
                    {kw.length > 0 ? (
                      <p className="mt-3 text-xs leading-relaxed text-slate-400">
                        <span className="font-medium text-slate-500">{t.peerProfileSkills}: </span>
                        {kw.join(", ")}
                      </p>
                    ) : null}
                    {langs.length > 0 ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        <span className="font-medium text-slate-500">{t.peerProfileLanguages}: </span>
                        {langs.join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-5 flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-11 w-full touch-manipulation border-white/15 bg-transparent text-slate-100 hover:bg-white/[0.06] sm:min-h-10"
                        onClick={() => {
                          setPreviewPeerId(s.owner_user_id);
                          setPreviewOpen(true);
                        }}
                      >
                        {t.previewProfileOpen}
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          "galaxy-btn-glow min-h-11 w-full touch-manipulation border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:min-h-10",
                          !blocked && outOfCredits && "opacity-50 hover:bg-sky-500/15",
                        )}
                        disabled={blocked}
                        onClick={() => !blocked && openConnectAndDismissFresh(s)}
                      >
                        {blocked ? t.alreadyPending : outOfCredits ? cr.dailyLimitReached : t.requestConnection}
                      </Button>
                    </div>
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

      <SuggestionProfilePreviewDialog
        peerUserId={previewPeerId}
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewPeerId(null);
        }}
      />

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
          initialIntro={connectCtx.initialIntro}
          onInviteSent={() => void refreshCredits()}
          profileIncompleteResumeAfter="/console"
        />
      ) : null}
    </div>
  );
}
