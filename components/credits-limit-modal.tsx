"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreditsLimitModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { strings } = useLanguage();
  const c = strings.credits;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950/95 text-slate-50 shadow-[0_0_60px_rgba(56,189,248,0.08)] backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">{c.qualityTitle}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-slate-400">{c.qualityBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
            onClick={() => onOpenChange(false)}
          >
            {c.gotIt}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
