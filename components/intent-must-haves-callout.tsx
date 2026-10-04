import { CheckCircle2 } from "lucide-react";
import { isStoredMetaLine } from "@/lib/meetup";
import { cn } from "@/lib/utils";

export function IntentMustHavesCallout({
  heading,
  body,
  compact,
  tone = "mint",
  className,
}: {
  heading: string;
  body: string;
  compact?: boolean;
  tone?: "mint" | "neutral";
  className?: string;
}) {
  const trimmedBody = body
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !isStoredMetaLine(trimmed);
    })
    .join("\n")
    .trim();
  if (!trimmedBody) return null;
  return (
    <div
      className={cn(
        tone === "neutral" ? "flex gap-2 rounded-lg border border-slate-200 bg-slate-50" : "flex gap-2 rounded-lg border border-emerald-100 bg-emerald-50",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        className,
      )}
    >
      <CheckCircle2
        className={cn("mt-0.5 shrink-0", tone === "neutral" ? "text-slate-400" : "text-emerald-600", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      <div className="min-w-0">
        <p className={cn("font-medium uppercase tracking-wide text-slate-500", compact ? "text-[10px]" : "text-[11px]")}>
          {heading}
        </p>
        <p
          className={cn(
            "leading-relaxed text-slate-700",
            compact ? "mt-0.5 text-xs line-clamp-2" : "mt-1 text-sm",
          )}
        >
          {trimmedBody}
        </p>
      </div>
    </div>
  );
}
