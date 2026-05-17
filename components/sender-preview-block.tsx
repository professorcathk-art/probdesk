"use client";

import type { MatchRow } from "@/actions/matches";
import { PeerIdentityCard } from "@/components/peer-identity-card";
import { LockedAvatarPreview } from "@/components/locked-avatar-preview";
import { useLanguage } from "@/components/language-provider";

export function SenderPreviewBlock({ match }: { match: MatchRow }) {
  const { strings } = useLanguage();
  const c = strings.console;
  const preview = match.ai_context_sender as { headline?: string; summary?: string; signals?: string[] } | undefined;

  if (match.sender_discloses_profile) {
    return (
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-400/85">{c.senderSharedProfileBadge}</p>
        <PeerIdentityCard peerUserId={match.sender_id} showViewProfileButton revealSensitiveDetails={false} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{c.senderPreviewProtected}</p>
      <div className="mt-3 flex gap-3">
        <LockedAvatarPreview />
        <div className="min-w-0 flex-1 blur-[1.5px]">
          <p className="font-medium text-slate-100">{preview?.headline ?? "—"}</p>
          <p className="mt-2 text-sm text-slate-300">{preview?.summary ?? ""}</p>
          <ul className="mt-2 list-disc pl-5 text-slate-400">
            {(preview?.signals ?? []).slice(0, 4).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
