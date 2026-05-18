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

export function LoginPageContent() {
  const { strings } = useLanguage();
  const L = strings.login;
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
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

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      /** Browser client keeps PKCE verifier in cookies @supabase/ssr expects — Server Actions cannot. */
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setInfo(L.inboxInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in is temporarily unavailable.");
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

          <form className="space-y-4" onSubmit={(e) => void onMagicLink(e)}>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={L.emailPlaceholder}
              className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={busy}
              className="w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
            >
              {L.magicSubmit}
            </Button>
          </form>

          {info ? (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-sky-300/90">{info}</p>
              <p className="leading-relaxed text-slate-500">{L.sameBrowserHint}</p>
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
