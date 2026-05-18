"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileIdentity } from "@/actions/profile";
import { updateMyProfileIdentity } from "@/actions/profile";
import { signOut } from "@/actions/auth";
import { ConsoleAvatarUpload } from "@/components/console-avatar-upload";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { ProfileAlbumSection } from "@/components/profile-album-section";
import { useLanguage } from "@/components/language-provider";
import { TagInputField, type TagInputFieldHandle } from "@/components/tag-input-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROFILE_CORE_MIN_BIO_LENGTH,
  PROFILE_GENDER_VALUES,
  PROFILE_SUPERPOWER_MAX,
  PROFILE_SUPERPOWER_MIN_PUBLISH,
  type ProfileCoreFieldKey,
  type ProfileGenderValue,
} from "@/lib/profile-basics";
import { PROFILE_AGE_GROUP_VALUES, type ProfileAgeGroupValue } from "@/lib/profile-age-groups";
import { displayGenderLabel } from "@/lib/display-gender";
import { cn } from "@/lib/utils";

type Props = {
  profileAvatarUrl: string | null;
  profileIdentity: ProfileIdentity;
  showProfileRequiredBanner?: boolean;
  coreFieldIssues?: ProfileCoreFieldKey[];
  /** After a successful save, jump here instead of staying on /profile (must be server-sanitized). */
  redirectAfterSave?: string | null;
};

function profileCoreIssueText(
  labels: {
    coreIssueDisplayName: string;
    coreIssueBio: string;
    coreIssueLocation: string;
    coreIssueIndustry: string;
    coreIssueSkillsTags: string;
    coreIssueLanguages: string;
  },
  key: ProfileCoreFieldKey,
): string {
  switch (key) {
    case "display_name":
      return labels.coreIssueDisplayName;
    case "bio":
      return labels.coreIssueBio;
    case "location":
      return labels.coreIssueLocation;
    case "industry":
      return labels.coreIssueIndustry;
    case "skills_tags":
      return labels.coreIssueSkillsTags;
    case "languages":
      return labels.coreIssueLanguages;
    default: {
      const _e: never = key;
      return _e;
    }
  }
}

function ageGroupOptionLabel(
  slug: ProfileAgeGroupValue,
  labels: {
    ageGroup18_24: string;
    ageGroup25_34: string;
    ageGroup35_44: string;
    ageGroup45_54: string;
    ageGroup55_64: string;
    ageGroup65Plus: string;
  },
): string {
  switch (slug) {
    case "18_24":
      return labels.ageGroup18_24;
    case "25_34":
      return labels.ageGroup25_34;
    case "35_44":
      return labels.ageGroup35_44;
    case "45_54":
      return labels.ageGroup45_54;
    case "55_64":
      return labels.ageGroup55_64;
    case "65_plus":
      return labels.ageGroup65Plus;
    default: {
      const _x: never = slug;
      return _x;
    }
  }
}

function genderLabel(
  cx: {
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  },
  value: ProfileGenderValue,
): string {
  return displayGenderLabel(value, cx) ?? value;
}

export function ProfilePageClient({
  profileAvatarUrl,
  profileIdentity,
  showProfileRequiredBanner = false,
  coreFieldIssues = [],
  redirectAfterSave = null,
}: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const p = strings.profilePage;
  const t = strings.console;
  const ob = strings.onboarding;

  const skillsRef = useRef<TagInputFieldHandle>(null);
  const langsRef = useRef<TagInputFieldHandle>(null);

  const [pfName, setPfName] = useState(profileIdentity.display_name ?? "");
  const [pfBio, setPfBio] = useState(profileIdentity.bio ?? "");
  const [pfLoc, setPfLoc] = useState(profileIdentity.location ?? "");
  const [pfInd, setPfInd] = useState(profileIdentity.industry ?? "");
  const [pfSuper, setPfSuper] = useState(profileIdentity.superpower ?? "");
  const [pfGender, setPfGender] = useState(profileIdentity.gender ?? "");
  const [pfAgeGroup, setPfAgeGroup] = useState(profileIdentity.age_group ?? "");
  const [pfContactCh, setPfContactCh] = useState(profileIdentity.preferred_contact_channel ?? "");
  const [pfContactDet, setPfContactDet] = useState(profileIdentity.preferred_contact_detail ?? "");
  const [pfSkills, setPfSkills] = useState<string[]>(profileIdentity.skills_tags ?? []);
  const [pfLangs, setPfLangs] = useState<string[]>(profileIdentity.languages ?? []);
  const [pfIntent, setPfIntent] = useState(profileIdentity.intent_level ?? "");
  const [pfSocial, setPfSocial] = useState(profileIdentity.social_link ?? "");
  const [pfBusy, setPfBusy] = useState(false);
  const [pfNote, setPfNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- sync draft inputs when server passes refreshed profile */
  useEffect(() => {
    setPfName(profileIdentity.display_name ?? "");
    setPfBio(profileIdentity.bio ?? "");
    setPfLoc(profileIdentity.location ?? "");
    setPfInd(profileIdentity.industry ?? "");
    setPfSuper(profileIdentity.superpower ?? "");
    setPfGender(profileIdentity.gender ?? "");
    setPfAgeGroup(profileIdentity.age_group ?? "");
    setPfContactCh(profileIdentity.preferred_contact_channel ?? "");
    setPfContactDet(profileIdentity.preferred_contact_detail ?? "");
    setPfSkills(profileIdentity.skills_tags ?? []);
    setPfLangs(profileIdentity.languages ?? []);
    setPfIntent(profileIdentity.intent_level ?? "");
    setPfSocial(profileIdentity.social_link ?? "");
  }, [
    profileIdentity.display_name,
    profileIdentity.bio,
    profileIdentity.location,
    profileIdentity.industry,
    profileIdentity.superpower,
    profileIdentity.gender,
    profileIdentity.age_group,
    profileIdentity.preferred_contact_channel,
    profileIdentity.preferred_contact_detail,
    profileIdentity.skills_tags,
    profileIdentity.languages,
    profileIdentity.intent_level,
    profileIdentity.social_link,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveProfile() {
    setPfBusy(true);
    setPfNote(null);
    setError(null);
    const skills_tags = skillsRef.current?.flushPending() ?? pfSkills;
    const languages = langsRef.current?.flushPending() ?? pfLangs;
    const res = await updateMyProfileIdentity({
      display_name: pfName,
      bio: pfBio,
      location: pfLoc,
      industry: pfInd,
      superpower: pfSuper,
      gender: pfGender,
      age_group: pfAgeGroup,
      preferred_contact_channel: pfContactCh,
      preferred_contact_detail: pfContactDet,
      skills_tags,
      languages,
      intent_level: pfIntent,
      social_link: pfSocial,
    });
    setPfBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPfNote(t.profileSaved);
    if (redirectAfterSave) {
      router.replace(redirectAfterSave);
      await router.refresh();
      return;
    }
    router.replace("/profile");
    await router.refresh();
  }

  const superLen = pfSuper.trim().length;

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{p.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{p.subtitle}</p>
          <p className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/[0.06] px-4 py-3 text-xs leading-relaxed text-sky-100/95">
            {p.privacyPhotoAlbumBanner}
          </p>
        </header>

        {showProfileRequiredBanner ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
            <p>{p.profileRequiredBanner}</p>
            {coreFieldIssues.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-100/95">
                {coreFieldIssues.map((key) => (
                  <li key={key}>{profileCoreIssueText(p, key)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        <ConsoleAvatarUpload key={profileAvatarUrl ?? "none"} initialUrl={profileAvatarUrl} />

        <ProfileAlbumSection
          paths={profileIdentity.album_storage_paths ?? []}
          onPathsUpdated={() => {
            void router.refresh();
          }}
        />

        <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">{t.profileCardTitle}</CardTitle>
            <CardDescription className="text-slate-400">{t.profileCardDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pfNote ? <p className="text-sm text-emerald-400/95">{pfNote}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="pf-name" className="text-slate-300">
                {t.profileDisplayName}
              </Label>
              <Input
                id="pf-name"
                value={pfName}
                onChange={(e) => setPfName(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-bio" className="text-slate-300">
                {t.profileBio}
              </Label>
              <Textarea
                id="pf-bio"
                value={pfBio}
                onChange={(e) => setPfBio(e.target.value)}
                className="min-h-[100px] border-white/10 bg-white/[0.03] text-slate-50"
              />
              <p className="text-xs leading-relaxed text-slate-500">
                {p.profileBioMinNote.replace(/\{min\}/g, String(PROFILE_CORE_MIN_BIO_LENGTH))}
              </p>
              {pfBio.trim().length > 0 && pfBio.trim().length < PROFILE_CORE_MIN_BIO_LENGTH ? (
                <p className="text-xs leading-relaxed text-amber-400/95">
                  {p.profileBioTooShort
                    .replace(/\{current\}/g, String(pfBio.trim().length))
                    .replace(/\{min\}/g, String(PROFILE_CORE_MIN_BIO_LENGTH))}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-loc" className="text-slate-300">
                {t.profileLocation}
              </Label>
              <Input
                id="pf-loc"
                value={pfLoc}
                onChange={(e) => setPfLoc(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-ind" className="text-slate-300">
                {t.profileIndustry}
              </Label>
              <Input
                id="pf-ind"
                value={pfInd}
                onChange={(e) => setPfInd(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{p.skillsTraitsLabel}</Label>
              <p className="text-xs leading-relaxed text-slate-500">{p.skillsTraitsDesc}</p>
              <TagInputField
                ref={skillsRef}
                tags={pfSkills}
                onChange={setPfSkills}
                maxTags={5}
                placeholder={p.skillsTraitsPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-intent" className="text-slate-300">
                {p.intentLevelLabel}
              </Label>
              <p className="text-xs leading-relaxed text-slate-500">{p.intentLevelDesc}</p>
              <select
                id="pf-intent"
                value={pfIntent}
                onChange={(e) => setPfIntent(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-50 outline-none focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-500/30",
                )}
              >
                <option value="">{p.intentLevelUnset}</option>
                <option value="casual_open">{p.intentCasual}</option>
                <option value="intentional_seeking">{p.intentIntentional}</option>
                <option value="focused_commit">{p.intentFocused}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{p.languagesLabel}</Label>
              <p className="text-xs leading-relaxed text-slate-500">{p.languagesDesc}</p>
              <TagInputField
                ref={langsRef}
                tags={pfLangs}
                onChange={setPfLangs}
                maxTags={5}
                placeholder={p.languagesPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-social" className="text-slate-300">
                {p.socialLinkLabel}
              </Label>
              <p className="text-xs leading-relaxed text-slate-500">{p.socialLinkDesc}</p>
              <Input
                id="pf-social"
                type="url"
                inputMode="url"
                value={pfSocial}
                onChange={(e) => setPfSocial(e.target.value)}
                placeholder={p.socialLinkPlaceholder}
                className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-super" className="text-slate-300">
                {p.superpowerLabel}
              </Label>
              <p className="text-xs leading-relaxed text-slate-500">{p.superpowerDesc}</p>
              <Textarea
                id="pf-super"
                value={pfSuper}
                maxLength={PROFILE_SUPERPOWER_MAX}
                onChange={(e) => setPfSuper(e.target.value)}
                placeholder={p.superpowerPlaceholder}
                className="min-h-[88px] border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                {superLen}/{PROFILE_SUPERPOWER_MAX}
                {superLen > 0 && superLen < PROFILE_SUPERPOWER_MIN_PUBLISH ? (
                  <span className="mt-1 block text-amber-400/95">{p.superpowerPublishHint}</span>
                ) : null}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-gender" className="text-slate-300">
                {t.profileGender}
              </Label>
              <select
                id="pf-gender"
                value={pfGender}
                onChange={(e) => setPfGender(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-50 outline-none focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-500/30",
                )}
              >
                <option value="">{t.genderUnset}</option>
                {PROFILE_GENDER_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {genderLabel(t, v)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-age-group" className="text-slate-300">
                {p.ageGroupLabel}
              </Label>
              <select
                id="pf-age-group"
                value={pfAgeGroup}
                onChange={(e) => setPfAgeGroup(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-50 outline-none focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-500/30",
                )}
              >
                <option value="">{p.ageGroupUnset}</option>
                {PROFILE_AGE_GROUP_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {ageGroupOptionLabel(v, p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-medium text-white">{ob.contactSectionTitle}</p>
              <p className="text-xs leading-relaxed text-slate-500">{ob.contactPrivacyNote}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pf-contact-ch" className="text-slate-200">
                    {ob.contactChannelLabel}
                  </Label>
                  <select
                    id="pf-contact-ch"
                    value={pfContactCh}
                    onChange={(e) => setPfContactCh(e.target.value)}
                    className={cn(
                      "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-50 outline-none focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-500/30",
                    )}
                  >
                    <option value="">{ob.contactChannelUnset}</option>
                    <option value="whatsapp">{ob.contactWhatsApp}</option>
                    <option value="line">{ob.contactLine}</option>
                    <option value="wechat">{ob.contactWeChat}</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pf-contact-det" className="text-slate-200">
                    {ob.contactDetailLabel}
                  </Label>
                  <Input
                    id="pf-contact-det"
                    value={pfContactDet}
                    onChange={(e) => setPfContactDet(e.target.value)}
                    placeholder={ob.contactDetailPlaceholder}
                    className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={pfBusy}
              className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              onClick={() => void saveProfile()}
            >
              {pfBusy ? t.profileSaving : t.profileSave}
            </Button>

            <div className="border-t border-white/10 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400 hover:bg-white/5 hover:text-slate-200"
                onClick={() => void signOut().then(() => router.replace("/"))}
              >
                {p.profileSignOut}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
