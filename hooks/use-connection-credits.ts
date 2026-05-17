"use client";

import { useCallback, useEffect, useState } from "react";
import { getConnectionCreditsRemaining } from "@/actions/matches";
import { DAILY_OUTBOUND_INVITE_CREDITS } from "@/lib/limits";

export type ConnectionCreditsState = {
  credits: number | null;
  unlimited: boolean;
  dailyCap: number;
  loading: boolean;
};

/** Loads remaining outbound invites for the signed-in user (UTC daily reset). Admins are unlimited. */
export function useConnectionCredits(userId: string | null | undefined) {
  const [credits, setCredits] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setUnlimited(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getConnectionCreditsRemaining();
    setLoading(false);
    if ("error" in res) {
      setCredits(null);
      setUnlimited(false);
      return;
    }
    setUnlimited(res.unlimited);
    setCredits(res.credits);
  }, [userId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- fetch server-backed credits when userId changes */
    void refresh();
  }, [refresh]);

  const outOfCredits = !unlimited && credits !== null && credits <= 0;

  return {
    credits,
    unlimited,
    dailyCap: DAILY_OUTBOUND_INVITE_CREDITS,
    loading,
    refresh,
    outOfCredits,
  };
}
