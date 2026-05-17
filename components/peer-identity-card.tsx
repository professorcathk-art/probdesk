"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type PeerRow = {
  display_name: string | null;
  industry: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  gender: string | null;
  skills_tags: string[] | null;
  languages: string[] | null;
  intent_level: string | null;
  superpower: string | null;
  social_link: string | null;
  preferred_contact_channel: string | null;
  preferred_contact_detail: string | null;
};

function contactChannelLabel(
  ob: {
    contactWhatsApp: string;
    contactLine: string;
    contactWeChat: string;
  },
  ch: string | null,
): string {
  switch (ch) {
    case "whatsapp":
      return ob.contactWhatsApp;
    case "line":
      return ob.contactLine;
    case "wechat":
      return ob.contactWeChat;
    default:
      return ch ?? "";
  }
}

function peerGenderLabel(
  cx: {
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  },
  raw: string | null,
): string | null {
  switch (raw?.trim()) {
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
    default:
      return null;
  }
}

function intentLevelLabel(
  pr: {
    intentCasual: string;
    intentIntentional: string;
    intentFocused: string;
  },
  key: string | null,
): string {
  switch (key) {
    case "casual_open":
      return pr.intentCasual;
    case "intentional_seeking":
      return pr.intentIntentional;
    case "focused_commit":
      return pr.intentFocused;
    default:
      return key ?? "";
  }
}

export function PeerIdentityCard({
  peerUserId,
  showViewProfileButton = false,
  revealSensitiveDetails = true,
}: {
  peerUserId: string;
  showViewProfileButton?: boolean;
  revealSensitiveDetails?: boolean;
}) {
  const { strings } = useLanguage();
  const t = strings.console;
  const p = strings.profilePage;
  const ob = strings.onboarding;

  const [peer, setPeer] = useState<PeerRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, industry, avatar_url, bio, location, gender, skills_tags, languages, intent_level, superpower, social_link, preferred_contact_channel, preferred_contact_detail",
        )
        .eq("user_id", peerUserId)
        .maybeSingle();
      if (!cancelled) setPeer(data as PeerRow | null);
    })();
    return () => {
      cancelled = true;
    };
  }, [peerUserId]);

  const tags = (peer?.skills_tags ?? []).filter(Boolean);
  const langs = (peer?.languages ?? []).filter(Boolean);

  const genderLine = peerGenderLabel(t, peer?.gender ?? null);

  const dialogBody = peer ? (
    <div className="space-y-4 text-sm">
      <div className="flex gap-4">
        {peer.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
          <img src={peer.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full border border-white/15 object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05]" />
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{peer.display_name ?? t.peerFallbackName}</p>
          {peer.industry ? <p className="text-slate-400">{peer.industry}</p> : null}
          {peer.location ? <p className="mt-1 text-slate-500">{peer.location}</p> : null}
        </div>
      </div>
      {peer.intent_level ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileIntentLevel}</p>
          <p className="mt-2 text-slate-200">{intentLevelLabel(p, peer.intent_level)}</p>
        </div>
      ) : null}
      {peer.superpower?.trim() ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileSuperpower}</p>
          <p className="mt-2 leading-relaxed text-slate-200">{peer.superpower.trim()}</p>
        </div>
      ) : null}
      {genderLine ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileGender}</p>
          <p className="mt-2 text-slate-200">{genderLine}</p>
        </div>
      ) : null}
      {peer.bio ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileBio}</p>
          <p className="mt-2 leading-relaxed text-slate-200">{peer.bio}</p>
        </div>
      ) : null}
      {tags.length ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileSkills}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((x) => (
              <Badge key={x} variant="outline" className="border-white/15 text-slate-200">
                {x}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {langs.length ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileLanguages}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {langs.map((x) => (
              <Badge key={x} variant="outline" className="border-white/15 text-slate-200">
                {x}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {revealSensitiveDetails && peer.social_link ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileSocial}</p>
          <a
            href={peer.social_link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block break-all text-sky-300 underline-offset-4 hover:underline"
          >
            {peer.social_link}
          </a>
        </div>
      ) : null}
      {revealSensitiveDetails && peer.preferred_contact_channel && peer.preferred_contact_detail ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.peerProfileContact}</p>
          <p className="mt-2 text-slate-200">
            {contactChannelLabel(ob, peer.preferred_contact_channel)} · {peer.preferred_contact_detail}
          </p>
        </div>
      ) : null}
    </div>
  ) : (
    <p className="text-sm text-slate-500">{strings.console.peerLoading}</p>
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
      <div className="flex gap-4">
        {peer?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
          <img
            src={peer.avatar_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-emerald-400/30 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-gradient-to-br from-emerald-500/25 to-sky-600/20 blur-[2px]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">{t.peerConnection}</p>
          <p className="mt-2 text-base font-semibold text-white">{peer?.display_name ?? t.peerFallbackName}</p>
          <p className="text-sm text-slate-400">{peer?.industry ?? ""}</p>
          {peer?.location ? <p className="mt-1 text-sm text-slate-500">{peer.location}</p> : null}
          {peer?.intent_level ? (
            <p className="mt-2 text-xs text-slate-500">{intentLevelLabel(p, peer.intent_level)}</p>
          ) : null}
          {peer?.superpower?.trim() ? (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{peer.superpower.trim()}</p>
          ) : null}
          {peer?.bio ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">{peer.bio}</p> : null}
        </div>
      </div>
      {showViewProfileButton ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit border-white/15 text-slate-200"
            onClick={() => setProfileOpen(true)}
          >
            {t.peerProfileView}
          </Button>
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50">
              <DialogHeader>
                <DialogTitle>{t.peerProfileTitle}</DialogTitle>
                <DialogDescription className="text-slate-400">{t.peerProfileSubtitle}</DialogDescription>
              </DialogHeader>
              {dialogBody}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
