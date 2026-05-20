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
            const sourceLabel = row.source === "background_supply" ? c.aiRecSourceBackground : c.aiRecSourceSync;
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

            return (
              <li key={row.id}>
                <Card className="overflow-hidden rounded-2xl border border-white/12 bg-black/30 shadow-sm backdrop-blur-xl">
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex gap-4">
                      <div className="shrink-0 pt-0.5">
                        <LockedAvatarPreview size="md" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-sky-400/40 bg-sky-500/10 text-[11px] font-medium text-sky-100">
                              {c.aiRecBadge}
                            </Badge>
                            <Badge variant="outline" className="border-white/15 text-[11px] font-normal text-slate-400">
                              {sourceLabel}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{c.matchFitScore}</p>
                            <p className="text-lg font-semibold tabular-nums text-sky-300">{row.score}</p>
                          </div>
                        </div>

                        {metaBits.length > 0 ? (
                          <p className="text-xs leading-relaxed text-slate-300">{metaBits.join(" · ")}</p>
                        ) : null}

                        {bio ? (
                          <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/10">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.peerProfileBio}</p>
                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-200">{bio}</p>
                          </div>
                        ) : null}

                        {(industry || superpower) ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            {industry ? (
                              <span>
                                <span className="font-medium text-slate-500">{c.peerProfileIndustry}: </span>
                                {truncateText(industry, 72)}
                              </span>
                            ) : null}
                            {superpower ? (
                              <span>
                                <span className="font-medium text-slate-500">{c.peerProfileSuperpower}: </span>
                                {truncateText(superpower, 72)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {(kw.length > 0 || langs.length > 0) ? (
                          <div className="space-y-2">
                            {kw.length > 0 ? (
                              <div>
                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  {c.peerProfileSkills}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {kw.map((tag) => (
                                    <Badge
                                      key={`${row.id}-k-${tag}`}
                                      variant="secondary"
                                      className="rounded-md border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-slate-200 hover:bg-white/[0.06]"
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

                        {variant === "requestsHub" && row.intent_preview.trim() ? (
                          <p className="rounded-lg bg-white/[0.02] px-3 py-2 text-[11px] leading-snug text-slate-400 ring-1 ring-white/10">
                            <span className="font-medium text-slate-500">{c.aiRecForIntent}: </span>
                            {truncateText(row.intent_preview, 220)}
                          </p>
                        ) : null}

                        <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-10 w-full border-white/15 text-slate-200 sm:flex-1 sm:min-h-9"
                            onClick={() => onPreview(row.candidate_profile_id)}
                          >
                            {c.aiRecPreview}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-10 w-full text-slate-400 hover:bg-white/[0.06] sm:w-auto sm:min-h-9"
                            disabled={dismissing === row.id}
                            onClick={() => void handleDismiss(row.id)}
                          >
                            {dismissing === row.id ? "…" : c.aiRecDismiss}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-10 w-full border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-40 sm:flex-1 sm:min-h-9"
                            disabled={blocked}
                            onClick={() => onInvite(row)}
                          >
                            {c.aiRecInvite}
                          </Button>
                        </div>
                        {blocked ? <p className="text-xs text-amber-200/90">{c.aiRecBlockedPeer}</p> : null}
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
