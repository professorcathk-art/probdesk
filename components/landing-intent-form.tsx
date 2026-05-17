"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { MIN_INTENT_CHARS, persistLandingIntentDraft } from "@/lib/intent-draft";
import { setEntryCookieClient } from "@/lib/entry-cookie";
import { useSessionStore } from "@/stores/session-store";

export function LandingIntentForm() {
  const router = useRouter();
  const { strings } = useLanguage();
  const L = strings.landing;
  const setLandingIntentText = useSessionStore((s) => s.setLandingIntentText);
  const [value, setValue] = useState("");
  const [tooShort, setTooShort] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (text.length < MIN_INTENT_CHARS) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    setLandingIntentText(text);
    persistLandingIntentDraft(text);
    setEntryCookieClient({ v: 1, kind: "start_matching" });
    router.push("/login?flow=start_matching");
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
        <label className="sr-only" htmlFor="intent">
          Describe your intent
        </label>
        <Input
          id="intent"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (tooShort) setTooShort(false);
          }}
          placeholder={L.intentPlaceholder}
          aria-invalid={tooShort}
          className="h-14 border-0 bg-transparent px-4 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
        />
      </div>
      {tooShort ? (
        <p role="alert" className="text-sm text-amber-400/95">
          {L.intentTooShort}
        </p>
      ) : null}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-slate-400">{L.intentHelper}</p>
        <Button
          type="submit"
          size="lg"
          className="w-full border border-sky-400/35 bg-sky-500/15 px-8 text-sky-50 shadow-[0_0_28px_rgba(56,189,248,0.28)] hover:bg-sky-500/25 sm:w-auto"
        >
          {L.intentCta}
        </Button>
      </div>
    </form>
  );
}
