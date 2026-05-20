"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initiateConnection } from "@/actions/matches";
import { CreditsLimitModal } from "@/components/credits-limit-modal";
import { useLanguage } from "@/components/language-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverUserId: string;
  receiverIntentId: string | null;
  headline: string;
  /** When set (Manage discovery), stored on the match for grouping under your intent card. */
  senderContextIntentId?: string | null;
  /** Prefill introductory message (e.g. sender's request text). */
  initialIntro?: string;
  onInviteSent?: () => void;
  /** After completing profile, return here (internal path + query). Used when server returns PROFILE_INCOMPLETE. */
  profileIncompleteResumeAfter?: string;
};

export function ConnectModal({
  open,
  onOpenChange,
  receiverUserId,
  receiverIntentId,
  headline,
  senderContextIntentId,
  initialIntro = "",
  onInviteSent,
  profileIncompleteResumeAfter,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const cm = strings.connectModal;

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage(initialIntro.trim());
    setError(null);
  }, [open, initialIntro]);

  async function onSend() {
    setBusy(true);
    setError(null);
    const res = await initiateConnection({
      receiverUserId,
      receiverIntentId: receiverIntentId ?? undefined,
      introductory_context: message.trim(),
      senderContextIntentId: senderContextIntentId ?? undefined,
    });
    setBusy(false);
    if (!res.ok) {
      if ("error" in res && res.error === "PROFILE_INCOMPLETE") {
        const after = profileIncompleteResumeAfter ?? "/square";
        router.push(`/profile?required=profile&after=${encodeURIComponent(after)}`);
        onOpenChange(false);
        return;
      }
      if ("error" in res && res.error === "OUT_OF_CREDITS") {
        setCreditsModalOpen(true);
        return;
      }
      setError("message" in res ? res.message : "Something went wrong.");
      return;
    }
    setMessage("");
    onInviteSent?.();
    onOpenChange(false);
  }

  return (
    <>
      <CreditsLimitModal open={creditsModalOpen} onOpenChange={setCreditsModalOpen} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto border-white/10 bg-slate-950/90 text-slate-50 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{cm.title}</DialogTitle>
            <DialogDescription className="space-y-2 text-slate-400">
              <span className="block leading-relaxed">{cm.subtitle}</span>
              {headline.trim() ? (
                <span className="block text-sm text-slate-500">{headline}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={cm.placeholder}
            className="min-h-[120px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500 sm:min-h-[140px]"
          />
          <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] px-4 py-3">
            <p className="text-sm font-medium text-sky-100">{cm.previewNoticeTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{cm.previewNoticeBody}</p>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => onOpenChange(false)}>
              {cm.cancel}
            </Button>
            <Button
              disabled={busy || message.trim().length < 16}
              className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              onClick={() => void onSend()}
            >
              {busy ? cm.sendBusy : cm.confirmSend}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
