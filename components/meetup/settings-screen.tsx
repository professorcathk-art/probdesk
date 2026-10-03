"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/actions/auth";
import { updateMyProfileIdentity, type ProfileIdentity } from "@/actions/profile";
import { useLanguage } from "@/components/language-provider";
import { INTEREST_SUGGESTIONS, meetupCopy } from "@/lib/meetup-copy";
import { PROFILE_AGE_GROUP_VALUES } from "@/lib/profile-age-groups";
import { PROFILE_GENDER_VALUES } from "@/lib/profile-basics";

export function SettingsScreen({ identity }: { identity: ProfileIdentity }) {
  const { lang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const [displayName, setDisplayName] = useState(identity.display_name ?? "");
  const [location, setLocation] = useState(identity.location ?? "");
  const [industry, setIndustry] = useState(identity.industry ?? "");
  const [bio, setBio] = useState(identity.bio ?? "");
  const [superpower, setSuperpower] = useState(identity.superpower ?? "");
  const [gender, setGender] = useState(identity.gender ?? "");
  const [age, setAge] = useState(identity.age_group ?? "");
  const [tags, setTags] = useState<string[]>(identity.skills_tags ?? []);
  const [languages, setLanguages] = useState((identity.languages ?? []).join(", "));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggle(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 8)));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    const skills = tags.map((tag) => tag.trim()).filter(Boolean);
    if (skills.length < 3) {
      setError(t.needTags);
      setSaved(false);
      return;
    }
    const langs = languages
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateMyProfileIdentity({
      display_name: displayName,
      bio,
      location,
      industry,
      superpower,
      gender,
      age_group: age,
      attraction_orientation: identity.attraction_orientation ?? "",
      preferred_contact_channel: identity.preferred_contact_channel ?? "",
      preferred_contact_detail: identity.preferred_contact_detail ?? "",
      skills_tags: skills,
      languages: langs.length > 0 ? langs : ["中文"],
      social_link: identity.social_link ?? "",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t.settings}</h1>
      <p className="mt-2 text-sm text-slate-500">{t.settingsLead}</p>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/portal/one-to-one" className="inline-flex min-h-11 items-center rounded-full bg-white px-3 text-slate-600">
          {t.oneToOne}
        </Link>
        <Link href="/portal/groups" className="inline-flex min-h-11 items-center rounded-full bg-white px-3 text-slate-600">
          {t.groups}
        </Link>
      </div>
      <form onSubmit={onSave} className="mt-6 space-y-4 rounded-2xl shadow-sm border border-[#e6e6e6] bg-white p-5">
        <label className="block text-sm font-medium text-slate-800">
          {t.nickname}
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.city}
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Hong Kong" className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.industry}
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.age}
          <select value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] bg-white px-3 text-base">
            <option value="">{lang === "zh" ? "先不填" : "Skip"}</option>
            {PROFILE_AGE_GROUP_VALUES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_plus", "+").replace("_", "–")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.gender}
          <select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] bg-white px-3 text-base">
            <option value="">{lang === "zh" ? "請選擇" : "Choose"}</option>
            {PROFILE_GENDER_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-sm font-medium text-slate-800">{t.interests}</p>
          <p className="mt-1 text-xs text-slate-500">{t.tagsHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={`min-h-11 rounded-full px-3 text-sm ${tags.includes(tag) ? "bg-[#ff5a5f] text-white" : "bg-[#fff1ea] text-[#c2410c]"}`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={custom} onChange={(event) => setCustom(event.target.value)} className="h-11 min-w-0 flex-1 rounded-2xl border border-[#e6e6e6] px-3 text-base" />
            <button
              type="button"
              className="min-h-11 rounded-full border border-[#ffd7c4] px-3 text-sm"
              onClick={() => {
                const next = custom.trim();
                if (!next) return;
                toggle(next);
                setCustom("");
              }}
            >
              {lang === "zh" ? "加入" : "Add"}
            </button>
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-800">
          {t.languages}
          <input value={languages} onChange={(event) => setLanguages(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-[#e6e6e6] px-3 text-base" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.bio}
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-[#e6e6e6] px-3 py-2 text-base" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {t.superpower}
          <textarea value={superpower} onChange={(event) => setSuperpower(event.target.value)} className="mt-1 min-h-20 w-full rounded-2xl border border-[#e6e6e6] px-3 py-2 text-base" />
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[#ff5a5f] px-4 text-sm font-medium text-white disabled:opacity-60">
          {busy ? t.saving : t.save}
        </button>
        {saved ? <p className="text-sm text-emerald-700">{t.saved}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
      <section className="mt-6 rounded-2xl shadow-sm border border-[#e6e6e6] bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t.account}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/profile" className="inline-flex min-h-11 items-center rounded-full border border-[#ffd7c4] px-4 text-sm text-[#c2410c]">
            {t.fullProfile}
          </Link>
          <button
            type="button"
            className="min-h-11 rounded-full px-4 text-sm text-slate-700"
            onClick={() => {
              void signOut().then(() => {
                router.replace("/");
                router.refresh();
              });
            }}
          >
            {t.signOut}
          </button>
        </div>
      </section>
    </main>
  );
}
