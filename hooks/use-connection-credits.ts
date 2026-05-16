"use client";

import { useCallback, useEffect, useState } from "react";
import { getConnectionCreditsRemaining } from "@/actions/matches";

/** Loads remaining outbound invites for the signed-in user (UTC daily reset). */
export function useConnectionCredits(userId: string | null | undefined) {
  const [credits, setCredits] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      return;
    }
    const res = await getConnectionCreditsRemaining();
    if ("error" in res) {
      setCredits(null);
      return;
    }
    setCredits(res.credits);
  }, [userId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- fetch server-backed credits when userId changes */
    void refresh();
  }, [refresh]);

  const outOfCredits = credits !== null && credits <= 0;

  return { credits, refresh, outOfCredits };
}
