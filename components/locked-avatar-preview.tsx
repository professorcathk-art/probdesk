"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { wrap: "h-11 w-11", icon: "h-4 w-4" },
  md: { wrap: "h-12 w-12", icon: "h-5 w-5" },
};

/** Premium blurred placeholder for identities not yet mutually unlocked. */
export function LockedAvatarPreview({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const s = sizes[size];
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-slate-200/25 to-slate-700/30",
        s.wrap,
        className,
      )}
    >
      <div
        className="absolute inset-0 scale-[1.15] bg-gradient-to-br from-sky-400/45 via-indigo-500/35 to-slate-950/90"
        style={{
          filter: "blur(16px) saturate(120%) brightness(0.8)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
        <Lock
          className={cn("animate-pulse text-white/95 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]", s.icon)}
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </div>
  );
}
