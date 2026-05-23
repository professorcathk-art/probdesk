"use client";

import * as React from "react";
import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import type { MatchRow } from "@/actions/matches";
import { dismissAiRecommendation } from "@/actions/ai-recommendations";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { displayProfileAgeGroup } from "@/lib/display-age-group";
import { peerGenderLabelFromSlug } from "@/lib/peer-profile-labels";
import { cn } from "@/lib/utils";

function truncateText(s: string | null | undefined, max: number): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function AiRecommendationsConsole(props: {
  variant: "intentStrip" | "requestsHub";
  intentId?: string;
  rows: AiRecommendationListItem[];
  matches: MatchRow[];
  userId: string;
  blockedPeerIds: Set<string>;
  onInvite: (row: AiRecommendationListItem) => void;
  onPreview: (peerUserId: string) => void;
  onAfterDismiss: () => void;
  /** When merged into the intent card header, omit duplicate section title/description. */
  hideHeader?: boolean;
}) {
  const { variant, intentId, rows, matches, userId, blockedPeerIds, onInvite, onPreview, onAfterDismiss, hideHeader } =
    props;
  const { strings } = useLanguage();
  const c = strings.console;

  const filtered =
    variant === "intentStrip" && intentId
      ? rows.filter((r) => r.intent_id === intentId)
      : variant === "requestsHub"
        ? rows
        : [];

  const [dismissing, setDismissing] = React.useState<string | null>(null);
  const [dismissConfirmRow, setDismissConfirmRow] = React.useState<AiRecommendationListItem | null>(null);
  const [dismissError, setDismissError] = React.useState<string | null>(null);

  if (filtered.length === 0 && variant === "intentStrip") return null;

  async function runDismissRecommendation(id: string) {
    setDismissError(null);
    setDismissing(id);
    const res = await dismissAiRecommendation(id);
    setDismissing(null);
    if (!res.ok) {
      setDismissError(res.message);
      return;
    }
    setDismissConfirmRow(null);
    onAfterDismiss();
  }

  const title = variant === "requestsHub" ? c.aiRecHubTitle : c.aiRecSectionTitle;
  const subtitle = variant === "requestsHub" ? c.aiRecHubSubtitle : c.aiRecSectionHint;

  const prLabels = strings.profilePage;

  return (
    <section
      className={cn(
        "space-y-3",
        variant === "requestsHub" && "rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4 md:p-5",
      )}
    >
      {!hideHeader ? (
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs leading-relaxed text-slate-500">{subtitle}</p>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card className="border-dashed border-white/12 bg-black/20">
          <CardContent className="py-8 text-center text-sm text-slate-500">
            {variant === "requestsHub" ? c.aiRecEmptyHub : c.aiRecEmptyForIntent}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((row) => {
            const pendingOutboundFromThisRequest = matches.some(
              (m) =>
                m.sender_id === userId &&
                m.receiver_id === row.candidate_profile_id &&
                m.sender_context_intent_id === row.intent_id &&
                !m.counterparty_intent_id &&
                m.status === "Pending",
            );
            const blockedByPolicy = blockedPeerIds.has(row.candidate_profile_id);
            const duplicateInviteBlocked = blockedByPolicy && !pendingOutboundFromThisRequest;
            const inviteDisabled = duplicateInviteBlocked || pendingOutboundFromThisRequest;
            const gLabel = peerGenderLabelFromSlug(row.peer_gender, {
              genderWoman: c.genderWoman,
              genderMan: c.genderMan,
              genderNonBinary: c.genderNonBinary,
              genderPreferNotSay: c.genderPreferNotSay,
              genderOther: c.genderOther,
            });
            const ageLbl = displayProfileAgeGroup(row.peer_age_group, {
              ageGroup18_24: prLabels.ageGroup18_24,
              ageGroup25_29: prLabels.ageGroup25_29,
              ageGroup30_34: prLabels.ageGroup30_34,
              ageGroup35_39: prLabels.ageGroup35_39,
              ageGroup40_44: prLabels.ageGroup40_44,
              ageGroup45_49: prLabels.ageGroup45_49,
              ageGroup50_54: prLabels.ageGroup50_54,
              ageGroup55_64: prLabels.ageGroup55_64,
              ageGroup65Plus: prLabels.ageGroup65Plus,
            });
            const loc = row.peer_location?.trim() ?? "";
            const bio = row.peer_bio?.trim() ?? "";
            const kw = (row.peer_skills_tags ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 8);
            const langs = (row.peer_languages ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 4);
            const industry = row.peer_industry?.trim() ?? "";
            const superpower = row.peer_superpower?.trim() ?? "";

            const metaBits: string[] = [];
            if (gLabel) metaBits.push(`${c.profileGender}: ${gLabel}`);
            if (ageLbl) metaBits.push(`${c.peerProfileAgeGroup}: ${ageLbl}`);
            if (loc) metaBits.push(`${c.peerProfileLocation}: ${loc}`);

            const hasRichPreview =
              metaBits.length > 0 ||
              Boolean(bio) ||
              Boolean(industry) ||
              Boolean(superpower) ||
              kw.length > 0 ||
              langs.length > 0;

            return (
              <li key={row.id}>
                <Card
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10",
                    "bg-gradient-to-br from-slate-950/98 via-slate-950/88 to-indigo-950/30",
                    "shadow-[0_28px_56px_-28px_rgba(15,23,42,0.88)] backdrop-blur-xl",
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-y-4 left-0 w-px rounded-full bg-gradient-to-b from-sky-400 via-sky-400/55 to-transparent"
                    aria-hidden
                  />
                  <CardContent className="space-y-2.5 p-4 sm:p-5">
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="shrink-0 pt-0.5">
                          <LockedAvatarPreview size="md" />
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-sky-400/45 bg-sky-500/14 text-[11px] font-medium text-sky-100 shadow-[0_0_22px_-6px_rgba(56,189,248,0.45)]"
                          >
                            {c.aiRecBadge}
                          </Badge>
                          {row.source === "background_supply" ? (
                            <Badge variant="outline" className="border-white/14 text-[11px] font-normal text-slate-400">
                              {c.aiRecSourceBackground}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-lg bg-black/40 px-2.5 py-1.5 ring-1 ring-white/12">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.matchFitScore}</p>
                        <p className="min-w-[2.5rem] text-center text-lg font-semibold tabular-nums tracking-tight text-sky-200">
                          {row.score}
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      {!hasRichPreview ? (
                        <p className="text-xs leading-snug text-slate-500">{c.aiRecPeekHint}</p>
                      ) : null}

                      {metaBits.length > 0 ? (
                        <p className="text-xs font-medium leading-snug text-slate-300">{metaBits.join(" · ")}</p>
                      ) : null}

                      {bio ? (
                        <div className="rounded-lg bg-white/[0.04] px-2.5 py-2 ring-1 ring-white/10">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.peerProfileBio}</p>
                          <p className="mt-1 line-clamp-3 text-xs leading-snug text-slate-100">{bio}</p>
                        </div>
                      ) : null}

                      {industry || superpower ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          {industry ? (
                            <span className="min-w-0">
                              <span className="font-medium text-slate-500">{c.peerProfileIndustry}: </span>
                              {truncateText(industry, 76)}
                            </span>
                          ) : null}
                          {superpower ? (
                            <span className="min-w-0">
                              <span className="font-medium text-slate-500">{c.peerProfileSuperpower}: </span>
                              {truncateText(superpower, 76)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {kw.length > 0 || langs.length > 0 ? (
                        <div className="space-y-1.5">
                          {kw.length > 0 ? (
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {c.peerProfileSkills}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {kw.map((tag) => (
                                  <Badge
                                    key={`${row.id}-k-${tag}`}
                                    variant="secondary"
                                    className="rounded-md border-white/[0.12] bg-white/[0.08] px-1.5 py-0 text-[11px] font-normal text-slate-100 hover:bg-white/[0.08]"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {langs.length > 0 ? (
                            <p className="text-xs leading-snug text-slate-400">
                              <span className="font-medium text-slate-500">{c.peerProfileLanguages}: </span>
                              {langs.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="w-full space-y-2 border-t border-white/10 pt-3">
                        <Button
                          type="button"
                          size="sm"
                          disabled={inviteDisabled}
                          className="h-10 w-full border border-emerald-400/42 bg-emerald-500/[0.22] font-medium text-emerald-50 shadow-sm shadow-emerald-950/25 hover:bg-emerald-500/30 disabled:opacity-40"
                          onClick={() => onInvite(row)}
                        >
                          {c.aiRecInvite}
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 border-white/[0.15] bg-white/[0.04] text-slate-50 hover:bg-white/[0.08]"
                            onClick={() => onPreview(row.candidate_profile_id)}
                          >
                            {c.aiRecPreview}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-9 border border-red-500/55 bg-red-600/85 text-[13px] text-white hover:bg-red-600 disabled:opacity-50"
                            disabled={dismissing === row.id}
                            onClick={() => {
                              setDismissError(null);
                              setDismissConfirmRow(row);
                            }}
                          >
                            {c.aiRecDismiss}
                          </Button>
                        </div>
                      </div>
                      {pendingOutboundFromThisRequest ? (
                        <p className="text-xs leading-snug text-sky-200/90">{c.aiRecInvitePendingReply}</p>
                      ) : duplicateInviteBlocked ? (
                        <p className="text-xs leading-snug text-amber-200/90">{c.aiRecBlockedPeer}</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={dismissConfirmRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDismissConfirmRow(null);
            setDismissError(null);
          }
        }}
      >
        <DialogContent className="border-white/15 bg-slate-950 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.aiRecDismissConfirmTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{c.aiRecDismissConfirmDesc}</DialogDescription>
          </DialogHeader>
          {dismissError ? <p className="text-sm leading-snug text-red-300">{dismissError}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              onClick={() => {
                setDismissConfirmRow(null);
                setDismissError(null);
              }}
            >
              {c.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={dismissConfirmRow != null && dismissing === dismissConfirmRow.id}
              onClick={() => dismissConfirmRow && void runDismissRecommendation(dismissConfirmRow.id)}
            >
              {dismissConfirmRow != null && dismissing === dismissConfirmRow.id ? "…" : c.aiRecDismissConfirmCta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
