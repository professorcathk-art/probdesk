"use client";

import { Share2 } from "lucide-react";
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

/** Copies `${origin}/square?intent=${intentId}` for growth loop sharing. */
export function IntentShareButton({ intentId, className, variant = "outline", size = "sm" }: Props) {
  const { strings } = useLanguage();
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onShare() {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/square?intent=${encodeURIComponent(intentId)}`;
      await navigator.clipboard.writeText(url);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2800);
    }
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
        <Share2 className="h-4 w-4" />
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
      <Share2 className="h-4 w-4 shrink-0" />
      {label}
    </Button>
  );
}
