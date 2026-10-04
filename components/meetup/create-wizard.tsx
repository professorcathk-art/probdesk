"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserRound } from "lucide-react";
import { polishMeetupDetails } from "@/actions/meetup-polish";
import { createConsoleIntent, setIntentMarketplacePublic, updateConsoleIntent, type IntentRow } from "@/actions/intents";
import { useLanguage } from "@/components/language-provider";
import {
  composeMeetupPost,
  composeMustHaves,
  formatListingPrice,
  meetupKindFrom,
  priceFromMustHaves,
  PRICE_CURRENCIES,
  type ListingPrice,
  splitMeetupPost,
  TITLE_MAX_UNITS,
  titleUnits,
  whenFromMustHaves,
  whoFromMustHaves,
  type MeetupKind,
} from "@/lib/meetup";
import { meetupCopy } from "@/lib/meetup-copy";
import { CoverPicker, uploadPostCover } from "@/components/meetup/cover-picker";

function parseTags(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);
}

export function CreateWizard({ editing }: { editing: IntentRow | null }) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const parsed = editing ? splitMeetupPost(editing.natural_language_input) : null;
  const [step, setStep] = useState(editing ? 1 : 0);
  const [kind, setKind] = useState<MeetupKind>(editing ? meetupKindFrom(editing.natural_language_input, editing.must_haves) : "one_to_one");
  const [title, setTitle] = useState(parsed?.title ?? "");
  const [details, setDetails] = useState(parsed?.details ?? "");
  const initialPrice = priceFromMustHaves(editing?.must_haves);
  const [place, setPlace] = useState(editing?.location_filter ?? "");
  const [priceRole, setPriceRole] = useState<ListingPrice["role"]>(initialPrice.role);
  const [priceAmount, setPriceAmount] = useState(initialPrice.role === "none" ? "" : initialPrice.amount);
  const [priceCurrency, setPriceCurrency] = useState(initialPrice.currency);
  const [when, setWhen] = useState(editing ? whenFromMustHaves(editing.must_haves) : "");
  const [expectations, setExpectations] = useState(editing ? whoFromMustHaves(editing.must_haves) : "");
  const [tagsText, setTagsText] = useState(parsed?.tags.join(", ") ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(editing?.coverUrl ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(editing?.coverUrl ?? null);
  const [showProfile, setShowProfile] = useState(editing ? Boolean(editing.showProfile) : true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [polishing, setPolishing] = useState(false);

  const progress = useMemo(() => [t.stepType, t.stepDetails, t.stepPreview], [t.stepDetails, t.stepPreview, t.stepType]);
  const tags = parseTags(tagsText);

  function onTitle(value: string) {
    if (titleUnits(value) <= TITLE_MAX_UNITS || value.length < title.length) setTitle(value);
  }

  function goPreview() {
    if (title.trim().length < 2 || titleUnits(title) > TITLE_MAX_UNITS) {
      setError(titleUnits(title) > TITLE_MAX_UNITS ? t.needTitleLength : t.needTitle);
      return;
    }
    if (details.trim().length < 12) {
      setError(t.needBody);
      return;
    }
    if (!place.trim()) {
      setError(t.needPlace);
      return;
    }
    if (kind === "group" && !when.trim()) {
      setError(t.needWhen);
      return;
    }
    if (expectations.trim().length < 2) {
      setError(t.needWho);
      return;
    }
    if (priceRole !== "none" && !/^\d+(\.\d{1,2})?$/.test(priceAmount.trim())) {
      setError(t.priceNeedAmount);
      return;
    }
    if (priceRole !== "none" && Number(priceAmount) <= 0) {
      setError(t.priceNeedAmount);
      return;
    }
    setError(null);
    setStep(2);
  }

  async function polish() {
    setError(null);
    setPolishing(true);
    const res = await polishMeetupDetails(details, lang);
    setPolishing(false);
    if (!res.ok) {
      setError(res.message === "short" ? t.polishShort : t.polishFailed);
      return;
    }
    setDetails(res.text);
  }

  async function publish() {
    const text = composeMeetupPost({ title, details, tags });
    if (text.length < 12) {
      setError(t.needBody);
      return;
    }
    setBusy(true);
    setError(null);
    let nextCover = coverUrl;
    if (coverFile) {
      const uploaded = await uploadPostCover(coverFile);
      if (!uploaded.ok) {
        setBusy(false);
        setError(uploaded.message === "type" ? t.coverType : uploaded.message === "size" ? t.coverSize : t.coverFailed);
        return;
      }
      nextCover = uploaded.url;
    }
    const must = composeMustHaves(kind, expectations, kind === "group" ? when : "", {
      role: priceRole,
      amount: priceAmount.trim(),
      currency: priceCurrency,
    });
    if (editing) {
      const updated = await updateConsoleIntent(editing.id, text, place, must, nextCover, showProfile);
      if (!updated.ok) {
        setBusy(false);
        setError(updated.message);
        return;
      }
    } else {
      const created = await createConsoleIntent(text, place, must, nextCover, showProfile);
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

  const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:ring-2 focus:ring-[#ff5a5f]/25";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{editing ? t.editTitle : t.createTitle}</h1>
      <ol className="mt-4 flex gap-2">
        {progress.map((label, index) => (
          <li key={label} className={`min-h-11 flex-1 rounded-full px-3 py-2 text-center text-xs font-medium ${index === step ? "bg-[#ff5a5f] text-white" : "bg-white text-slate-500"}`}>
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
          <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-lg bg-[#ff5a5f] px-4 text-sm font-medium text-white hover:bg-[#e0484d] sm:col-span-2">
            {t.next}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-[#eee] bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-800">
            {t.title}
            <input value={title} onChange={(event) => onTitle(event.target.value)} className={`${fieldClass} h-11`} />
            <span className="mt-1 block text-xs text-slate-500">{t.titleHint}</span>
          </label>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="meetup-details" className="text-sm font-medium text-slate-800">{t.details}</label>
              <button type="button" disabled={polishing} onClick={() => void polish()} className="min-h-10 rounded-full border border-rose-200 px-3 text-sm font-medium text-[#e0484d] disabled:opacity-60">
                {polishing ? t.polishing : t.aiPolish}
              </button>
            </div>
            <textarea id="meetup-details" value={details} onChange={(event) => setDetails(event.target.value)} className={`${fieldClass} min-h-36 py-2`} />
          </div>
          <label className="block text-sm font-medium text-slate-800">
            {t.place}
            <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder={t.online} className={`${fieldClass} h-11`} />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{t.price}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <select value={priceRole} onChange={(event) => setPriceRole(event.target.value as ListingPrice["role"])} className={`${fieldClass} h-11`}>
                <option value="none">{t.priceNone}</option>
                <option value="pay">{t.pricePay}</option>
                <option value="receive">{t.priceReceive}</option>
              </select>
              <input
                inputMode="decimal"
                value={priceAmount}
                disabled={priceRole === "none"}
                onChange={(event) => setPriceAmount(event.target.value)}
                placeholder={t.priceAmount}
                aria-label={t.priceAmount}
                className={`${fieldClass} h-11 disabled:bg-slate-50`}
              />
              <select
                value={priceCurrency}
                disabled={priceRole === "none"}
                onChange={(event) => setPriceCurrency(event.target.value)}
                aria-label={t.priceCurrency}
                className={`${fieldClass} h-11 disabled:bg-slate-50`}
              >
                {PRICE_CURRENCIES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{t.priceHint}</p>
          </fieldset>
          <CoverPicker
            label={t.cover}
            hint={t.coverHint}
            addLabel={t.coverAdd}
            changeLabel={t.coverChange}
            removeLabel={t.coverRemove}
            previewUrl={coverPreview}
            onFile={(file) => {
              setCoverFile(file);
              setCoverPreview((current) => {
                if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                return URL.createObjectURL(file);
              });
              setError(null);
            }}
            onClear={() => {
              setCoverFile(null);
              setCoverUrl(null);
              setCoverPreview((current) => {
                if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                return null;
              });
            }}
          />
          <label className="block text-sm font-medium text-slate-800">
            {t.hashtags}
            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder={t.hashtagsHint} className={`${fieldClass} h-11`} />
          </label>
          {kind === "group" ? (
            <label className="block text-sm font-medium text-slate-800">
              {t.when}
              <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={`${fieldClass} h-11`} />
            </label>
          ) : null}
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
            <input
              type="checkbox"
              checked={showProfile}
              onChange={(event) => setShowProfile(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff5a5f]"
            />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                {t.showProfile}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#e0484d]">{t.showProfileRecommend}</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{t.showProfileHint}</span>
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-800">
            {t.who}
            <textarea value={expectations} onChange={(event) => setExpectations(event.target.value)} className={`${fieldClass} min-h-24 py-2`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(0)} className="min-h-11 rounded-full px-4 text-sm text-slate-600">{t.back}</button>
            <button type="button" onClick={goPreview} className="min-h-11 rounded-lg bg-[#ff5a5f] px-4 text-sm font-medium text-white hover:bg-[#e0484d]">{t.next}</button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-[#eee] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t.previewLead}</p>
          <dl className="space-y-3 text-sm">
            {coverPreview ? (
              <div>
                <dt className="text-slate-500">{t.cover}</dt>
                <dd className="mt-1 h-28 w-40 overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview or uploaded cover */}
                  <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                </dd>
              </div>
            ) : null}
            <div><dt className="text-slate-500">{t.title}</dt><dd className="font-medium text-slate-900">{title}</dd></div>
            <div><dt className="text-slate-500">{t.details}</dt><dd className="whitespace-pre-wrap text-slate-800">{details}</dd></div>
            <div><dt className="text-slate-500">{t.place}</dt><dd className="text-slate-800">{place}</dd></div>
            <div>
              <dt className="text-slate-500">{t.price}</dt>
              <dd className="text-slate-800">
                {formatListingPrice(lang, { role: priceRole, amount: priceAmount, currency: priceCurrency }) ?? t.priceNone}
              </dd>
              {priceRole !== "none" ? <dd className="mt-1 text-xs text-slate-500">{t.priceHint}</dd> : null}
            </div>
            {tags.length > 0 ? <div><dt className="text-slate-500">{t.hashtags}</dt><dd className="text-slate-800">{tags.map((tag) => `#${tag}`).join(" ")}</dd></div> : null}
            {kind === "group" ? <div><dt className="text-slate-500">{t.when}</dt><dd className="text-slate-800">{when.replace("T", " ")}</dd></div> : null}
            <div><dt className="text-slate-500">{t.who}</dt><dd className="whitespace-pre-wrap text-slate-800">{expectations}</dd></div>
            <div><dt className="text-slate-500">{t.showProfile}</dt><dd className="text-slate-800">{showProfile ? t.profilePublic : t.profileAnonymous}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-full px-4 text-sm text-slate-600">{t.back}</button>
            <button type="button" disabled={busy} onClick={() => void publish()} className="min-h-11 rounded-lg bg-[#ff5a5f] px-4 text-sm font-medium text-white hover:bg-[#e0484d] disabled:opacity-60">
              {busy ? t.saving : t.publishNow}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </main>
  );
}
