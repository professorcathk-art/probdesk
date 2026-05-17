"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  intentId: string;
  className?: string;
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
};

async function writeTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Copies `${origin}/explore/${intentId}` for growth loop sharing (deep link). */
export function IntentShareButton({ intentId, className, variant = "outline", size = "sm" }: Props) {
  const { strings } = useLanguage();
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onShare() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/explore/${encodeURIComponent(intentId)}`;
    const ok = await writeTextToClipboard(url);
    setState(ok ? "copied" : "error");
    window.setTimeout(() => setState("idle"), ok ? 2200 : 2800);
  }

  const label =
    state === "copied"
      ? strings.common.copied
      : state === "error"
        ? strings.common.copyFailed
        : strings.common.share;

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        className={cn("border-white/15 text-slate-200", className)}
        aria-label={strings.console.shareIntent}
        title={strings.console.shareIntent}
        onClick={() => void onShare()}
      >
        {state === "copied" ? (
          <Check className="h-4 w-4 text-emerald-400" aria-hidden />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn("gap-2 border-white/15 text-slate-200", className)}
      onClick={() => void onShare()}
    >
      {state === "copied" ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      ) : (
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {label}
    </Button>
  );
}
