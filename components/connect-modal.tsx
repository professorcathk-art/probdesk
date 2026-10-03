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
import { CONNECT_INTRO_MIN_CHARS } from "@/lib/connect-intro-min";
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

  const trimmedLen = message.trim().length;
  const belowIntroMin = trimmedLen < CONNECT_INTRO_MIN_CHARS;

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
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-900">{cm.title}</DialogTitle>
            <DialogDescription className="space-y-2 text-slate-500">
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
            className="min-h-[120px] rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ff5a5f]/25 sm:min-h-[140px]"
          />
          {belowIntroMin ? (
            <p className="text-xs leading-relaxed text-amber-700" role="status" aria-live="polite">
              {cm.introMinCharsHint
                .replaceAll("{current}", String(trimmedLen))
                .replaceAll("{min}", String(CONNECT_INTRO_MIN_CHARS))}
            </p>
          ) : null}
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{cm.previewNoticeTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{cm.previewNoticeBody}</p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="text-slate-600 hover:bg-slate-100" onClick={() => onOpenChange(false)}>
              {cm.cancel}
            </Button>
            <Button
              disabled={busy || belowIntroMin}
              className="rounded-lg bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
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
