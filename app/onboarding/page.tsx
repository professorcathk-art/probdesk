"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { bootstrapIntentFromLanding, completeOnboarding } from "@/actions/intents";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInputField, type TagInputFieldHandle } from "@/components/tag-input-field";
import { useLanguage } from "@/components/language-provider";
import {
  clearLandingIntentDraftBackups,
  MIN_INTENT_CHARS,
  readLandingIntentDraftBackup,
} from "@/lib/intent-draft";
import { PROFILE_CORE_MIN_BIO_LENGTH, PROFILE_GENDER_VALUES, PROFILE_SUPERPOWER_MAX, PROFILE_SUPERPOWER_MIN_PUBLISH, type ProfileGenderValue } from "@/lib/profile-basics";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

function onboardingGenderLabel(
  cx: {
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  },
  value: ProfileGenderValue,
): string {
  switch (value) {
    case "woman":
      return cx.genderWoman;
    case "man":
      return cx.genderMan;
    case "non_binary":
      return cx.genderNonBinary;
    case "prefer_not_say":
      return cx.genderPreferNotSay;
    case "other":
      return cx.genderOther;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { strings } = useLanguage();
  const ob = strings.onboarding;
  const cx = strings.console;
  const pr = strings.profilePage;
  const landingIntentText = useSessionStore((s) => s.landingIntentText);
  const clearLandingIntent = useSessionStore((s) => s.clearLandingIntent);
  const setLandingIntentText = useSessionStore((s) => s.setLandingIntentText);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [draftIntent, setDraftIntent] = useState<string | undefined>(undefined);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skillsRef = useRef<TagInputFieldHandle>(null);
  const langsRef = useRef<TagInputFieldHandle>(null);

  const [profile, setProfile] = useState({
    display_name: "",
    industry: "",
    superpower: "",
    location: "",
    bio: "",
    gender: "",
    preferred_contact_channel: "" as "" | "whatsapp" | "line" | "wechat",
    preferred_contact_detail: "",
    skills_tags: [] as string[],
    languages: [] as string[],
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

  const canBootstrap = useMemo(() => resolvedDraft.trim().length >= MIN_INTENT_CHARS, [resolvedDraft]);

  useEffect(() => {
    if (checkingAuth) return;
    try {
      const backup = readLandingIntentDraftBackup();
      if (backup) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- merge OAuth/sessionStorage timing */
        setDraftIntent((prev) => prev ?? backup);
        if (!useSessionStore.getState().landingIntentText) {
          setLandingIntentText(backup);
        }
        clearLandingIntentDraftBackups();
      }
    } catch {
      /* private mode */
    }
  }, [checkingAuth, setLandingIntentText]);

  async function runBootstrap() {
    setBusy(true);
    setError(null);
    const res = await bootstrapIntentFromLanding(resolvedDraft);
    setBusy(false);
    if (!res.ok) {
      if ("code" in res && res.code === "MAX_ACTIVE_INTENTS") {
        setError(ob.intentLimitBootstrap);
        return;
      }
      setError(res.message);
      return;
    }
    setIntentId(res.intentId);
    setQuestions(res.questions);
    if (res.locationHint) {
      setProfile((p) => (p.location ? p : { ...p, location: res.locationHint ?? "" }));
    }
    clearLandingIntent();
    clearLandingIntentDraftBackups();
  }

  async function onFinish() {
    if (!intentId) return;
    setBusy(true);
    setError(null);
    const answerPayload = Object.fromEntries(
      questions.map((q, idx) => [q, answers[idx] ?? ""]).filter(([, v]) => v.trim().length > 0),
    );
    const skills_tags = skillsRef.current?.flushPending() ?? profile.skills_tags;
    const languages = langsRef.current?.flushPending() ?? profile.languages;
    const res = await completeOnboarding({
      intentId,
      answers: answerPayload,
      profile: { ...profile, skills_tags, languages },
    });
    setBusy(false);
    if (!res.ok) {
      if ("code" in res && res.code === "PROFILE_INCOMPLETE") {
        setError(ob.profileIncompleteHint);
        return;
      }
      setError(res.message);
      return;
    }
    router.replace("/console");
    router.refresh();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen text-slate-900">
        <main className="mx-auto max-w-3xl px-6 py-24 text-slate-500">{ob.authChecking}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900">
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 md:py-24">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff5a5f]">{ob.kicker}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{ob.title}</h1>
          <p className="text-sm leading-relaxed text-slate-400">{ob.sub}</p>
        </header>

        {!intentId ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 backdrop-blur-xl">
            <Label htmlFor="draft" className="text-slate-700">
              {ob.intentSectionTitle}
            </Label>
            <Textarea
              id="draft"
              value={resolvedDraft}
              onChange={(e) => setDraftIntent(e.target.value)}
              className="mt-3 min-h-[140px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
              placeholder={ob.intentPlaceholder}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={!canBootstrap || busy}
                onClick={runBootstrap}
                className="bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
              >
                {busy ? ob.processing : ob.parseEmbedCta}
              </Button>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "ghost" }), "text-slate-600 hover:bg-slate-100")}
              >
                {ob.editLandingLink}
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-8 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 backdrop-blur-xl">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">{ob.enrichmentTitle}</h2>
              <div className="space-y-5">
                {questions.map((q, idx) => (
                  <div key={`${idx}-${q.slice(0, 24)}`} className="space-y-2">
                    <Label className="text-slate-700">{q}</Label>
                    <Input
                      value={answers[idx] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                      className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{ob.profileGridTitle}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">{cx.profileDisplayName}</Label>
                  <Input
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    className="border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{cx.profileLocation}</Label>
                  <Input
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{cx.profileIndustry}</Label>
                  <Input
                    value={profile.industry}
                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                    className="border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{pr.superpowerLabel}</Label>
                  <p className="text-xs leading-relaxed text-slate-500">{pr.superpowerDesc}</p>
                  <Textarea
                    value={profile.superpower}
                    maxLength={PROFILE_SUPERPOWER_MAX}
                    onChange={(e) => setProfile({ ...profile, superpower: e.target.value })}
                    placeholder={pr.superpowerPlaceholder}
                    className="min-h-[88px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">
                    {profile.superpower.trim().length}/{PROFILE_SUPERPOWER_MAX}
                    {profile.superpower.trim().length > 0 &&
                    profile.superpower.trim().length < PROFILE_SUPERPOWER_MIN_PUBLISH ? (
                      <span className="mt-1 block text-amber-400/95">{pr.superpowerPublishHint}</span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{ob.genderLabel}</Label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className={cn(
                      "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a5f]/30",
                    )}
                  >
                    <option value="">{cx.genderUnset}</option>
                    {PROFILE_GENDER_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {onboardingGenderLabel(cx, v)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{cx.profileBio}</Label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="border-slate-200 bg-white text-slate-900"
                  />
                  <p className="text-xs text-slate-500">
                    {ob.bioMinHint.replace(/\{min\}/g, String(PROFILE_CORE_MIN_BIO_LENGTH))}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{pr.skillsTraitsLabel}</Label>
                  <p className="text-xs leading-relaxed text-slate-500">{pr.skillsTraitsDesc}</p>
                  <TagInputField
                    ref={skillsRef}
                    tags={profile.skills_tags}
                    onChange={(tags) => setProfile((p) => ({ ...p, skills_tags: tags }))}
                    maxTags={5}
                    placeholder={pr.skillsTraitsPlaceholder}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{pr.languagesLabel}</Label>
                  <p className="text-xs leading-relaxed text-slate-500">{pr.languagesDesc}</p>
                  <TagInputField
                    ref={langsRef}
                    tags={profile.languages}
                    onChange={(tags) => setProfile((p) => ({ ...p, languages: tags }))}
                    maxTags={5}
                    placeholder={pr.languagesPlaceholder}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">{ob.contactSectionTitle}</p>
              <p className="text-xs leading-relaxed text-slate-500">{ob.contactPrivacyNote}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">{ob.contactChannelLabel}</Label>
                  <select
                    value={profile.preferred_contact_channel}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        preferred_contact_channel: e.target.value as typeof p.preferred_contact_channel,
                      }))
                    }
                    className={cn(
                      "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a5f]/30",
                    )}
                  >
                    <option value="">{ob.contactChannelUnset}</option>
                    <option value="whatsapp">{ob.contactWhatsApp}</option>
                    <option value="line">{ob.contactLine}</option>
                    <option value="wechat">{ob.contactWeChat}</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">{ob.contactDetailLabel}</Label>
                  <Input
                    value={profile.preferred_contact_detail}
                    onChange={(e) => setProfile((p) => ({ ...p, preferred_contact_detail: e.target.value }))}
                    placeholder={ob.contactDetailPlaceholder}
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="bg-[#ff5a5f] text-white hover:bg-[#e0484d]"
            >
              {busy ? ob.saving : ob.activateCta}
            </Button>
          </section>
        )}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </main>
    </div>
  );
}
