"use client";

import { UserRound } from "lucide-react";
import type { MatchRow } from "@/actions/matches";
import { useLanguage } from "@/components/language-provider";

type PreviewPayload = { headline?: string; summary?: string; signals?: string[] };

export function SenderPreviewBlock({ match }: { match: MatchRow }) {
  const { strings } = useLanguage();
  const c = strings.console;
  const preview = match.ai_context_sender as PreviewPayload | undefined;
  const headline = preview?.headline?.trim() || c.senderPreviewFallbackHeadline;
  const summary = preview?.summary?.trim() || "";
  const signals = Array.isArray(preview?.signals) ? preview!.signals!.filter(Boolean).slice(0, 6) : [];

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">{c.senderPreviewBadge}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{c.senderPreviewHint}</p>
      <div className="mt-4 flex gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-slate-500"
          aria-hidden
        >
          <UserRound className="h-6 w-6 opacity-70" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-medium leading-snug text-slate-50">{headline}</p>
          {summary ? <p className="text-sm leading-relaxed text-slate-300">{summary}</p> : null}
          {signals.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
              {signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
