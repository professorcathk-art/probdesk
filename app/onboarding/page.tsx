"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { bootstrapIntentFromLanding, completeOnboarding } from "@/actions/intents";
import { createClient } from "@/lib/supabase/client";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

export default function OnboardingPage() {
  const router = useRouter();
  const landingIntentText = useSessionStore((s) => s.landingIntentText);
  const clearLandingIntent = useSessionStore((s) => s.clearLandingIntent);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [draftIntent, setDraftIntent] = useState<string | undefined>(undefined);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    display_name: "",
    industry: "",
    available_time: "",
    location: "",
    bio: "",
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      setCheckingAuth(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const resolvedDraft = draftIntent ?? landingIntentText ?? "";

  const canBootstrap = useMemo(() => resolvedDraft.trim().length >= 12, [resolvedDraft]);

  async function runBootstrap() {
    setBusy(true);
    setError(null);
    const res = await bootstrapIntentFromLanding(resolvedDraft);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setIntentId(res.intentId);
    setQuestions(res.questions);
    if (res.locationHint) {
      setProfile((p) => (p.location ? p : { ...p, location: res.locationHint ?? "" }));
    }
    clearLandingIntent();
  }

  async function onFinish() {
    if (!intentId) return;
    setBusy(true);
    setError(null);
    const answerPayload = Object.fromEntries(
      questions.map((q, idx) => [q, answers[idx] ?? ""]).filter(([, v]) => v.trim().length > 0),
    );
    const res = await completeOnboarding({
      intentId,
      answers: answerPayload,
      profile,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.replace("/console");
  }

  if (checkingAuth) {
    return (
      <div className="relative min-h-screen text-slate-50">
        <GalaxyBackdrop />
        <main className="mx-auto max-w-3xl px-6 py-24 text-slate-400">Authenticating…</main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 md:py-24">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Progressive onboarding</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Shape your intent with precision</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            We parse once with a fast model, embed with <span className="text-slate-200">text-embedding-3-small</span>,
            then ask three enrichment questions before activating hybrid retrieval.
          </p>
        </header>

        {!intentId ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
            <Label htmlFor="draft" className="text-slate-200">
              Intent statement
            </Label>
            <Textarea
              id="draft"
              value={resolvedDraft}
              onChange={(e) => setDraftIntent(e.target.value)}
              className="mt-3 min-h-[140px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
              placeholder="Paste your landing intent if needed."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={!canBootstrap || busy}
                onClick={runBootstrap}
                className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              >
                {busy ? "Processing…" : "Parse + embed intent"}
              </Button>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "ghost" }), "text-slate-300 hover:bg-white/5")}
              >
                Edit on landing
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Three enrichment questions</h2>
              <div className="space-y-5">
                {questions.map((q, idx) => (
                  <div key={`${idx}-${q.slice(0, 24)}`} className="space-y-2">
                    <Label className="text-slate-200">{q}</Label>
                    <Input
                      value={answers[idx] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                      className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-200">Display name</Label>
                <Input
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="border-white/10 bg-white/[0.03] text-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Location</Label>
                <Input
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="border-white/10 bg-white/[0.03] text-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Industry</Label>
                <Input
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  className="border-white/10 bg-white/[0.03] text-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Availability</Label>
                <Input
                  value={profile.available_time}
                  onChange={(e) => setProfile({ ...profile, available_time: e.target.value })}
                  className="border-white/10 bg-white/[0.03] text-slate-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-200">Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="border-white/10 bg-white/[0.03] text-slate-50"
                />
              </div>
            </div>

            <Button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
            >
              {busy ? "Saving…" : "Activate console"}
            </Button>
          </section>
        )}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </main>
    </div>
  );
}
