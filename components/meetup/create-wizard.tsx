"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserRound } from "lucide-react";
import { createConsoleIntent, setIntentMarketplacePublic, updateConsoleIntent, type IntentRow } from "@/actions/intents";
import { useLanguage } from "@/components/language-provider";
import { draftMeetupCopy, meetupKindFrom, stampMustHaves, whoFromMustHaves, type MeetupKind } from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";

export function CreateWizard({ editing }: { editing: IntentRow | null }) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const initialKind = editing ? meetupKindFrom(editing.natural_language_input, editing.must_haves) : "one_to_one";
  const initialTitle = editing?.natural_language_input.split("\n").find((line) => line.trim()) ?? "";
  const [step, setStep] = useState(editing ? 1 : 0);
  const [kind, setKind] = useState<MeetupKind>(initialKind);
  const [title, setTitle] = useState(initialTitle);
  const [place, setPlace] = useState(editing?.location_filter ?? "");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState(editing ? whoFromMustHaves(editing.must_haves) : "");
  const [body, setBody] = useState(editing?.natural_language_input ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const progress = useMemo(() => [t.stepType, t.stepDetails, t.stepPreview], [t.stepDetails, t.stepPreview, t.stepType]);

  function goDetails() {
    setError(null);
    setStep(1);
  }

  function goPreview() {
    if (title.trim().length < 2) {
      setError(t.needTitle);
      return;
    }
    if (!place.trim()) {
      setError(t.needPlace);
      return;
    }
    if (kind === "group" && !when.trim() && !editing) {
      setError(t.needWhen);
      return;
    }
    if (who.trim().length < 2) {
      setError(t.needWho);
      return;
    }
    setError(null);
    if (!body.trim()) {
      setBody(draftMeetupCopy({ lang, kind, title, place, when, who }));
    }
    setStep(2);
  }

  function writeWithHelper(polish: boolean) {
    const next = draftMeetupCopy({ lang, kind, title, place, when, who });
    setBody(polish && body.trim() ? `${body.trim()}\n\n${next}` : next);
  }

  async function publish() {
    const text = body.trim();
    if (text.length < 12) {
      setError(t.needBody);
      return;
    }
    setBusy(true);
    setError(null);
    const must = stampMustHaves(kind, who);
    if (editing) {
      const updated = await updateConsoleIntent(editing.id, text, place, must);
      if (!updated.ok) {
        setBusy(false);
        setError(updated.message);
        return;
      }
    } else {
      const created = await createConsoleIntent(text, place, must);
      if (!created.ok) {
        setBusy(false);
        setError(created.message);
        return;
      }
      const pub = await setIntentMarketplacePublic(created.intentId, true);
      if (!pub.ok) {
        setBusy(false);
        setError(pub.message);
        return;
      }
    }
    router.push(kind === "group" ? "/portal/groups" : "/portal/one-to-one");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{editing ? t.editTitle : t.createTitle}</h1>
      <ol className="mt-4 flex gap-2">
        {progress.map((label, index) => (
          <li
            key={label}
            className={`min-h-11 flex-1 rounded-full px-3 py-2 text-center text-xs font-medium ${index === step ? "bg-[#ff5a5f] text-white" : "bg-white text-slate-500"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setKind("one_to_one")} className={`rounded-2xl border p-5 text-left shadow-sm ${kind === "one_to_one" ? "border-[#ff5a5f] bg-rose-50" : "border-slate-200 bg-white"}`}>
            <UserRound className="mb-3 h-5 w-5 text-[#ff5a5f]" aria-hidden />
            <p className="font-semibold text-slate-900">{t.oneToOne}</p>
            <p className="mt-1 text-sm text-slate-500">{t.oneToOneHint}</p>
          </button>
          <button type="button" onClick={() => setKind("group")} className={`rounded-2xl border p-5 text-left shadow-sm ${kind === "group" ? "border-[#ff5a5f] bg-rose-50" : "border-slate-200 bg-white"}`}>
            <Users className="mb-3 h-5 w-5 text-[#ff5a5f]" aria-hidden />
            <p className="font-semibold text-slate-900">{t.groups}</p>
            <p className="mt-1 text-sm text-slate-500">{t.groupsHint}</p>
          </button>
          <button type="button" onClick={goDetails} className="min-h-11 rounded-lg bg-[#ff5a5f] hover:bg-[#e0484d] px-4 text-sm font-medium text-white sm:col-span-2">
            {t.next}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 space-y-4 rounded-2xl shadow-sm border border-[#eee] bg-white p-5">
          <label className="block text-sm font-medium text-slate-800">
            {t.title}
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:ring-2 focus:ring-[#ff5a5f]/25" />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            {t.place}
            <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder={t.online} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
          </label>
          {kind === "group" ? (
            <label className="block text-sm font-medium text-slate-800">
              {t.when}
              <input value={when} onChange={(event) => setWhen(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
            </label>
          ) : null}
          <label className="block text-sm font-medium text-slate-800">
            {t.who}
            <textarea value={who} onChange={(event) => setWho(event.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-[#e6e6e6] px-3 py-2 text-base" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(0)} className="min-h-11 rounded-full px-4 text-sm text-slate-600">
              {t.back}
            </button>
            <button type="button" onClick={goPreview} className="min-h-11 rounded-lg bg-[#ff5a5f] hover:bg-[#e0484d] px-4 text-sm font-medium text-white">
              {t.next}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-4 rounded-2xl shadow-sm border border-[#eee] bg-white p-5">
          <p className="text-sm text-slate-500">{t.aiNote}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => writeWithHelper(false)} className="min-h-11 rounded-full border border-rose-200 px-4 text-sm font-medium text-[#e0484d]">
              {t.aiDraft}
            </button>
            <button type="button" onClick={() => writeWithHelper(true)} className="min-h-11 rounded-full border border-rose-200 px-4 text-sm font-medium text-[#e0484d]">
              {t.aiPolish}
            </button>
          </div>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-48 w-full rounded-2xl border border-[#e6e6e6] px-3 py-2 text-base" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-full px-4 text-sm text-slate-600">
              {t.back}
            </button>
            <button type="button" disabled={busy} onClick={() => void publish()} className="min-h-11 rounded-lg bg-[#ff5a5f] hover:bg-[#e0484d] px-4 text-sm font-medium text-white disabled:opacity-60">
              {busy ? t.saving : t.publishNow}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </main>
  );
}
