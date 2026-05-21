"use client";

import * as React from "react";
import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import { dismissAiRecommendation } from "@/actions/ai-recommendations";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  blockedPeerIds: Set<string>;
  onInvite: (row: AiRecommendationListItem) => void;
  onPreview: (peerUserId: string) => void;
  onAfterDismiss: () => void;
  /** When merged into the intent card header, omit duplicate section title/description. */
  hideHeader?: boolean;
}) {
  const { variant, intentId, rows, blockedPeerIds, onInvite, onPreview, onAfterDismiss, hideHeader } = props;
  const { strings } = useLanguage();
  const c = strings.console;

  const filtered =
    variant === "intentStrip" && intentId
      ? rows.filter((r) => r.intent_id === intentId)
      : variant === "requestsHub"
        ? rows
        : [];

  const [dismissing, setDismissing] = React.useState<string | null>(null);

  if (filtered.length === 0 && variant === "intentStrip") return null;

  async function handleDismiss(id: string) {
    setDismissing(id);
    await dismissAiRecommendation(id);
    setDismissing(null);
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
            const blocked = blockedPeerIds.has(row.candidate_profile_id);
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
                  <CardContent className="space-y-3 p-4 pl-5 sm:p-6 sm:pl-7">
                    <div className="flex gap-4">
                      <div className="shrink-0 pt-1">
                        <LockedAvatarPreview size="md" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
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
                          <div className="rounded-xl bg-black/40 px-3 py-1.5 ring-1 ring-white/12">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.matchFitScore}</p>
                            <p className="min-w-[2.75rem] text-center text-xl font-semibold tabular-nums tracking-tight text-sky-200">
                              {row.score}
                            </p>
                          </div>
                        </div>

                        {row.intent_preview.trim() ? (
                          <div className="rounded-xl bg-sky-500/[0.075] px-3 py-2.5 ring-1 ring-sky-400/30">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/95">{c.aiRecForIntent}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-100">{truncateText(row.intent_preview, 220)}</p>
                          </div>
                        ) : null}

                        {!hasRichPreview && !row.intent_preview.trim() ? (
                          <p className="border-l-2 border-sky-500/45 py-0.5 pl-3 text-xs leading-relaxed text-slate-500">{c.aiRecPeekHint}</p>
                        ) : null}

                        {metaBits.length > 0 ? (
                          <p className="text-xs font-medium leading-relaxed text-slate-300">{metaBits.join(" · ")}</p>
                        ) : null}

                        {bio ? (
                          <div className="rounded-xl bg-white/[0.045] px-3 py-2.5 ring-1 ring-white/12">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.peerProfileBio}</p>
                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-100">{bio}</p>
                          </div>
                        ) : null}

                        {industry || superpower ? (
                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-400">
                            {industry ? (
                              <span>
                                <span className="font-medium text-slate-500">{c.peerProfileIndustry}: </span>
                                {truncateText(industry, 76)}
                              </span>
                            ) : null}
                            {superpower ? (
                              <span>
                                <span className="font-medium text-slate-500">{c.peerProfileSuperpower}: </span>
                                {truncateText(superpower, 76)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {kw.length > 0 || langs.length > 0 ? (
                          <div className="space-y-2">
                            {kw.length > 0 ? (
                              <div>
                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  {c.peerProfileSkills}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {kw.map((tag) => (
                                    <Badge
                                      key={`${row.id}-k-${tag}`}
                                      variant="secondary"
                                      className="rounded-md border-white/[0.12] bg-white/[0.08] px-2 py-0.5 text-[11px] font-normal text-slate-100 hover:bg-white/[0.08]"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {langs.length > 0 ? (
                              <p className="text-xs text-slate-400">
                                <span className="font-medium text-slate-500">{c.peerProfileLanguages}: </span>
                                {langs.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 w-full border-white/[0.15] bg-white/[0.04] text-slate-50 hover:bg-white/[0.08] sm:min-h-10"
                            onClick={() => onPreview(row.candidate_profile_id)}
                          >
                            {c.aiRecPreview}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-11 w-full text-[13px] text-slate-500 underline-offset-[3px] hover:bg-transparent hover:text-slate-400 hover:underline sm:min-h-10"
                            disabled={dismissing === row.id}
                            onClick={() => void handleDismiss(row.id)}
                          >
                            {dismissing === row.id ? "…" : c.aiRecDismiss}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-11 w-full border border-emerald-400/42 bg-emerald-500/[0.22] font-medium text-emerald-50 shadow-sm shadow-emerald-950/25 hover:bg-emerald-500/30 disabled:opacity-40 sm:min-h-10"
                            disabled={blocked}
                            onClick={() => onInvite(row)}
                          >
                            {c.aiRecInvite}
                          </Button>
                        </div>
                        {blocked ? <p className="text-xs leading-relaxed text-amber-200/90">{c.aiRecBlockedPeer}</p> : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
