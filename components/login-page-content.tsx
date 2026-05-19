"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setEntryCookieClient } from "@/lib/entry-cookie";
import { setRedirectAfterCookieClient } from "@/lib/redirect-after-login-cookie";

function digitsOnlyOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function maskEmailForDisplay(raw: string): string {
  const t = raw.trim();
  const at = t.indexOf("@");
  if (at <= 0) return t;
  const local = t.slice(0, at);
  const domain = t.slice(at);
  const vis = local.slice(0, Math.min(2, local.length));
  return `${vis}${local.length > 2 ? "***" : ""}${domain}`;
}

export function LoginPageContent() {
  const { strings } = useLanguage();
  const L = strings.login;
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const flow = searchParams.get("flow");
    const connectIntent = searchParams.get("connectIntent");
    const after = searchParams.get("after");
    const callbackErr = searchParams.get("error");
    if (callbackErr) {
      try {
        setError(decodeURIComponent(callbackErr));
      } catch {
        setError(callbackErr);
      }
    }
    if (after) setRedirectAfterCookieClient(after);

    if (flow === "enter") setEntryCookieClient({ v: 1, kind: "enter" });
    else if (flow === "start_matching") setEntryCookieClient({ v: 1, kind: "start_matching" });
    else if (flow === "pending_connect" && connectIntent && /^[0-9a-f-]{36}$/i.test(connectIntent)) {
      setEntryCookieClient({ v: 1, kind: "pending_connect", receiverIntentId: connectIntent });
    }
  }, [searchParams]);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const trimmed = email.trim();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
        },
      });
      if (otpErr) {
        setError(otpErr.message);
        return;
      }
      setStep("code");
      setOtp("");
      setInfo(L.otpSentInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = digitsOnlyOtp(otp);
    if (code.length !== 8) {
      setError(L.otpInvalidLength);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (verErr) {
        setError(verErr.message);
        setBusy(false);
        return;
      }
      window.location.assign(`${window.location.origin}/auth/complete`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpErr) setError(otpErr.message);
      else setInfo(L.otpResentInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.ok || !res.url) {
      setError(res.ok ? "Missing redirect URL" : res.message);
      return;
    }
    window.location.assign(res.url);
  }

  const maskedEmail = maskEmailForDisplay(email);

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">{L.kicker}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{L.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{L.sub}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
            onClick={() => void onGoogle()}
            disabled={busy}
          >
            {L.googleCta}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
            <div className="h-px flex-1 bg-white/10" />
            {L.divider}
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {step === "email" ? (
            <form className="space-y-4" onSubmit={(e) => void onSendCode(e)}>
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {L.emailLabel}
                </label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={L.emailPlaceholder}
                  className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              >
                {busy ? L.otpSending : L.otpSendCode}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={(e) => void onVerifyOtp(e)}>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300">
                <p>{L.otpSentTo}</p>
                <p className="mt-1 font-medium text-white">{maskedEmail}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="login-otp" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {L.otpLabel}
                </label>
                <Input
                  id="login-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(digitsOnlyOtp(e.target.value))}
                  placeholder={L.otpPlaceholder}
                  className="border-white/10 bg-white/[0.03] text-center font-mono text-xl tracking-[0.2em] text-slate-50 placeholder:text-slate-600 placeholder:tracking-normal sm:text-2xl sm:tracking-[0.26em] md:text-3xl md:tracking-[0.3em]"
                />
                <p className="text-xs leading-relaxed text-slate-500">{L.otpHint}</p>
              </div>
              <Button
                type="submit"
                disabled={busy || digitsOnlyOtp(otp).length !== 8}
                className="w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              >
                {busy ? L.otpVerifying : L.otpVerify}
              </Button>
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-sm text-sky-400/90 underline-offset-4 hover:underline disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void onResend()}
                >
                  {L.otpResend}
                </button>
                <button
                  type="button"
                  className="text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                  disabled={busy}
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setInfo(null);
                    setError(null);
                  }}
                >
                  {L.otpUseDifferentEmail}
                </button>
              </div>
            </form>
          )}

          {info ? (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-sky-300/90">{info}</p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link href="/" className="text-slate-300 underline-offset-4 hover:underline">
            {L.backLanding}
          </Link>
        </p>
      </main>
    </div>
  );
}
