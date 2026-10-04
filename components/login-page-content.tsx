"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
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
  const { lang, strings } = useLanguage();
  const L = strings.login;
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

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

  function requireAgree() {
    if (agreed) return true;
    setError(L.agreeRequired);
    return false;
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAgree()) return;
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
    if (!requireAgree()) return;
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
    if (!requireAgree()) return;
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
    <div className="min-h-screen">
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5a5f]">{L.kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#222]">{L.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#757575]">{L.sub}</p>
        </div>

        <div className="rounded-2xl border border-[#eee] bg-white p-5 shadow-sm sm:p-6">
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
                if (event.target.checked) setError(null);
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff5a5f]"
            />
            <span className="text-xs leading-5 text-slate-600">
              {L.agreeLead}{" "}
              <Link href="/policy" className="font-medium text-[#e0484d] hover:underline" onClick={(event) => event.stopPropagation()}>
                {L.agreeTerms}
              </Link>{" "}
              {L.agreeAnd}{" "}
              <Link href="/privacy" className="font-medium text-[#e0484d] hover:underline" onClick={(event) => event.stopPropagation()}>
                {L.agreePrivacy}
              </Link>
              {lang === "zh" ? "。" : ". "}
              {L.agreeBody}
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg border-[#e6e6e6] bg-white text-[#222] hover:bg-[#fafafa]"
            onClick={() => void onGoogle()}
            disabled={busy}
          >
            {L.googleCta}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
            <div className="h-px flex-1 bg-[#eee]" />
            {L.divider}
            <div className="h-px flex-1 bg-[#eee]" />
          </div>

          {step === "email" ? (
            <form className="space-y-4" onSubmit={(e) => void onSendCode(e)}>
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-medium text-[#555]">
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
                  className="h-11 rounded-lg border-[#e6e6e6] bg-white text-[#222] placeholder:text-[#aaa]"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-lg bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
              >
                {busy ? L.otpSending : L.otpSendCode}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={(e) => void onVerifyOtp(e)}>
              <div className="rounded-xl bg-[#fff1ea] px-4 py-3 text-sm text-[#9a3412]">
                <p>{L.otpSentTo}</p>
                <p className="mt-1 font-medium text-[#222]">{maskedEmail}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="login-otp" className="text-xs font-medium text-[#555]">
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
                  className="h-12 rounded-lg border-[#e6e6e6] bg-white text-center font-mono text-xl tracking-[0.2em] text-[#222]"
                />
                <p className="text-xs leading-relaxed text-slate-500">{L.otpHint}</p>
              </div>
              <Button
                type="submit"
                disabled={busy || digitsOnlyOtp(otp).length !== 8}
                className="h-11 w-full rounded-lg bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
              >
                {busy ? L.otpVerifying : L.otpVerify}
              </Button>
              <div className="flex flex-col gap-2 border-t border-[#eee] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-[#ff5a5f] underline-offset-4 hover:underline disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void onResend()}
                >
                  {L.otpResend}
                </button>
                <button
                  type="button"
                  className="text-sm text-[#757575] underline-offset-4 hover:text-[#222] hover:underline"
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
              <p className="text-[#c2410c]">{info}</p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        </div>

        <p className="text-center text-sm text-[#757575]">
          <Link href="/" className="font-medium text-[#222] underline-offset-4 hover:underline">
            {L.backLanding}
          </Link>
        </p>
      </main>
    </div>
  );
}
