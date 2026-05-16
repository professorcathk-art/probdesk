"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ContactPageClient() {
  const { strings } = useLanguage();
  const C = strings.contactPage;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "validation">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot.trim()) {
      setStatus("success");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          subject,
          message,
          website: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus(res.status === 400 ? "validation" : "error");
        return;
      }
      setStatus("success");
      setEmail("");
      setName("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <div className="mb-8 space-y-3 sm:mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400/90">Vennode</p>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {C.title}
        </h1>
        <p className="text-sm leading-relaxed text-slate-400 sm:text-base">{C.intro}</p>
        <p className="text-xs text-slate-500 sm:text-sm">{C.replyHint}</p>
      </div>

      {status === "success" ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 sm:px-5 sm:py-5"
        >
          {C.success}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <div className="grid gap-2">
            <Label htmlFor="contact-email" className="text-slate-200">
              {C.emailLabel}
            </Label>
            <Input
              id="contact-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={C.emailPlaceholder}
              className="min-h-11 border-white/15 bg-black/30 text-base text-slate-100 placeholder:text-slate-500 sm:min-h-10 sm:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-name" className="text-slate-200">
              {C.nameLabel}
            </Label>
            <Input
              id="contact-name"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={C.namePlaceholder}
              className="min-h-11 border-white/15 bg-black/30 text-base text-slate-100 placeholder:text-slate-500 sm:min-h-10 sm:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-subject" className="text-slate-200">
              {C.subjectLabel}
            </Label>
            <Input
              id="contact-subject"
              type="text"
              name="subject"
              required
              minLength={2}
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={C.subjectPlaceholder}
              className="min-h-11 border-white/15 bg-black/30 text-base text-slate-100 placeholder:text-slate-500 sm:min-h-10 sm:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-message" className="text-slate-200">
              {C.messageLabel}
            </Label>
            <Textarea
              id="contact-message"
              name="message"
              required
              minLength={20}
              maxLength={8000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={C.messagePlaceholder}
              className="min-h-[140px] resize-y border-white/15 bg-black/30 text-base text-slate-100 placeholder:text-slate-500 sm:text-sm"
            />
          </div>

          {(status === "error" || status === "validation") && (
            <p role="alert" className="text-sm text-red-400">
              {status === "validation" ? C.errorValidation : C.errorGeneric}
            </p>
          )}

          <Button
            type="submit"
            disabled={status === "sending"}
            size="lg"
            className={cn(
              "min-h-11 w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 sm:w-auto sm:min-h-9",
            )}
          >
            {status === "sending" ? C.sending : C.submit}
          </Button>
        </form>
      )}
    </main>
  );
}
