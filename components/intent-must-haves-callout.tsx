import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntentMustHavesCallout({
  heading,
  body,
  compact,
  className,
}: {
  heading: string;
  body: string;
  compact?: boolean;
  className?: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06]",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        className,
      )}
    >
      <CheckCircle2
        className={cn("mt-0.5 shrink-0 text-emerald-400/75", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      <div className="min-w-0">
        <p className={cn("font-medium uppercase tracking-wide text-slate-500", compact ? "text-[10px]" : "text-[11px]")}>
          {heading}
        </p>
        <p
          className={cn(
            "leading-relaxed text-slate-400",
            compact ? "mt-0.5 text-xs line-clamp-2" : "mt-1 text-sm",
          )}
        >
          {trimmedBody}
        </p>
      </div>
    </div>
  );
}
