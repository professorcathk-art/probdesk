"use client";

import { useConnectionCredits } from "@/hooks/use-connection-credits";
import { useLanguage } from "@/components/language-provider";

type Quota = {
  activeIntentCount: number;
  maxActiveIntents: number;
  unlimitedIntents: boolean;
};

/** Compact invite / request quota for Manage and Explore headers. */
export function InviteQuotaPill({ userId, quota }: { userId: string | null; quota: Quota | null }) {
  const { strings } = useLanguage();
  const t = strings.console;
  const { credits, unlimited: adminDailyUnlimited, loading, dailyCap } = useConnectionCredits(userId);

  if (!userId || !quota) return null;

  if (quota.unlimitedIntents) {
    return (
      <div className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-violet-100">
        {t.quotaAdminBypass}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-medium">
        <span className="text-slate-500">{t.quotaActiveRequests}</span>
        <span className="tabular-nums text-slate-100">
          {quota.activeIntentCount}/{quota.maxActiveIntents}
        </span>
      </span>
      {!loading && credits !== null && !adminDailyUnlimited ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-100/95">
          <span className="text-sky-200/70">{t.quotaInvitesToday}</span>
          <span className="tabular-nums text-sky-50">
            {credits}/{dailyCap}
          </span>
        </span>
      ) : null}
    </div>
  );
}
