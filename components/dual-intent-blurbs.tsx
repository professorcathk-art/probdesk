"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";

export function DualIntentBlurbs({ idA, idB }: { idA: string | null; idB: string | null }) {
  const { strings } = useLanguage();
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const ids = [idA, idB].filter(Boolean) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("intent_requests").select("natural_language_input").in("id", ids);
      if (!cancelled) setLines((data ?? []).map((r) => r.natural_language_input));
    })();
    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  return (
    <div className="space-y-2 blur-[1.5px]">
      {lines.map((line, i) => (
        <p key={i} className="text-sm leading-relaxed text-slate-300">
          {line}
        </p>
      ))}
      {lines.length === 0 ? <p className="text-xs text-slate-500">{strings.console.peerLoading}</p> : null}
    </div>
  );
}
