"use client";

import { useState } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverUserId: string;
  receiverIntentId: string;
  headline: string;
};

export function ConnectModal({ open, onOpenChange, receiverUserId, receiverIntentId, headline }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    setBusy(true);
    setError(null);
    const res = await initiateConnection({
      receiverUserId,
      receiverIntentId,
      introductory_context: message.trim(),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setMessage("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950/90 text-slate-50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Send a context message</DialogTitle>
          <DialogDescription className="text-slate-400">
            Explain why you fit {headline}. This is double-blind until mutual acceptance.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Signal credibility, constraints, and what you bring — concise and respectful."
          className="min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="text-slate-300 hover:bg-white/5" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || message.trim().length < 16}
            className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
            onClick={onSend}
          >
            {busy ? "Sending…" : "Request connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
