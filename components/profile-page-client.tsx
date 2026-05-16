"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileIdentity } from "@/actions/profile";
import { updateMyProfileIdentity } from "@/actions/profile";
import { ConsoleAvatarUpload } from "@/components/console-avatar-upload";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  profileAvatarUrl: string | null;
  profileIdentity: ProfileIdentity;
};

export function ProfilePageClient({ profileAvatarUrl, profileIdentity }: Props) {
  const router = useRouter();
  const { strings } = useLanguage();
  const p = strings.profilePage;
  const t = strings.console;

  const [pfName, setPfName] = useState(profileIdentity.display_name ?? "");
  const [pfBio, setPfBio] = useState(profileIdentity.bio ?? "");
  const [pfLoc, setPfLoc] = useState(profileIdentity.location ?? "");
  const [pfInd, setPfInd] = useState(profileIdentity.industry ?? "");
  const [pfBusy, setPfBusy] = useState(false);
  const [pfNote, setPfNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- sync draft inputs when server passes refreshed profile */
  useEffect(() => {
    setPfName(profileIdentity.display_name ?? "");
    setPfBio(profileIdentity.bio ?? "");
    setPfLoc(profileIdentity.location ?? "");
    setPfInd(profileIdentity.industry ?? "");
  }, [profileIdentity.display_name, profileIdentity.bio, profileIdentity.location, profileIdentity.industry]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveProfile() {
    setPfBusy(true);
    setPfNote(null);
    setError(null);
    const res = await updateMyProfileIdentity({
      display_name: pfName,
      bio: pfBio,
      location: pfLoc,
      industry: pfInd,
    });
    setPfBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPfNote(t.profileSaved);
    await router.refresh();
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{p.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{p.subtitle}</p>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        <ConsoleAvatarUpload key={profileAvatarUrl ?? "none"} initialUrl={profileAvatarUrl} />

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
            <Button
              type="button"
              disabled={pfBusy}
              className="galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
              onClick={() => void saveProfile()}
            >
              {pfBusy ? t.profileSaving : t.profileSave}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
