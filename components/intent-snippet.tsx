"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function IntentSnippet({ intentId, label }: { intentId: string | null; label: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId) {
      setText(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("intent_requests")
        .select("natural_language_input")
        .eq("id", intentId)
        .maybeSingle();
      if (!cancelled) setText(data?.natural_language_input ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [intentId]);

  if (!intentId) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{text ?? "…"}</p>
    </div>
  );
}
