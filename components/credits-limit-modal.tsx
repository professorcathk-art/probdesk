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
      <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-xl sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">{c.qualityTitle}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-slate-500">{c.qualityBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
            onClick={() => onOpenChange(false)}
          >
            {c.gotIt}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
