"use client";

import * as React from "react";
import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import { dismissAiRecommendation } from "@/actions/ai-recommendations";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
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
}) {
  const { variant, intentId, rows, blockedPeerIds, onInvite, onPreview, onAfterDismiss } = props;
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

  return (
    <section
      className={cn(
        "space-y-3",
        variant === "requestsHub" && "rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4 md:p-5",
      )}
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-500">{subtitle}</p>
      </div>

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
            return (
              <li key={row.id}>
                <Card className="border-white/10 bg-black/25 backdrop-blur-xl">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                    <div className="shrink-0 pt-0.5">
                      <LockedAvatarPreview size="sm" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-sky-400/35 text-sky-100">
                          {c.aiRecBadge}
                        </Badge>
                        <Badge variant="outline" className="border-white/15 text-slate-400">
                          {sourceLabel}
                        </Badge>
                        <span className="text-[11px] tabular-nums text-slate-500">
                          {c.matchFitScore}: {row.score}
                        </span>
                      </div>
                      {variant === "requestsHub" ? (
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          {c.aiRecForIntent}:{" "}
                          <span className="font-normal normal-case text-slate-300">
                            {truncateText(row.intent_preview, 160)}
                          </span>
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/15 text-slate-200"
                          onClick={() => onPreview(row.candidate_profile_id)}
                        >
                          {c.aiRecPreview}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:bg-white/5"
                          disabled={dismissing === row.id}
                          onClick={() => void handleDismiss(row.id)}
                        >
                          {dismissing === row.id ? "…" : c.aiRecDismiss}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="border border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-40"
                          disabled={blocked}
                          onClick={() => onInvite(row)}
                        >
                          {c.aiRecInvite}
                        </Button>
                      </div>
                      {blocked ? <p className="text-xs text-amber-200/90">{c.aiRecBlockedPeer}</p> : null}
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
