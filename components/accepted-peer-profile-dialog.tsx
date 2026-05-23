"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPeerAlbumSignedUrlsForAcceptedConnection } from "@/actions/profile";
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
  superpower: string | null;
  social_link: string | null;
  preferred_contact_channel: string | null;
  preferred_contact_detail: string | null;
};

function contactChannelLabel(
  ob: { contactWhatsApp: string; contactLine: string; contactWeChat: string },
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

function peerGenderLabelFromConsole(
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

function AcceptedPeerSections({ peer, albumUrls }: { peer: PeerRow; albumUrls: string[] }) {
  const { strings } = useLanguage();
  const t = strings.console;
  const ob = strings.onboarding;
  const lp = strings.profilePage;
  const revealSensitiveDetails = true;
  const genderLine = peerGenderLabelFromConsole(t, peer.gender);
  const tags = (peer.skills_tags ?? []).filter(Boolean);
  const langs = (peer.languages ?? []).filter(Boolean);

  return (
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
      {albumUrls.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{lp.albumTitle}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {albumUrls.map((url, idx) => (
              <a key={`${idx}-${url.slice(-24)}`} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-white/10 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral signed URLs */}
                <img src={url} alt="" className="aspect-square h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Accepted-match profile preview (Messenger, etc.). Uses client profiles read allowed by mutual-acceptance RLS. */
export function AcceptedPeerProfileDialog({
  peerUserId,
  open,
  onOpenChange,
}: {
  peerUserId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { strings } = useLanguage();
  const t = strings.console;
  const [peer, setPeer] = useState<PeerRow | null>(null);
  const [albumUrls, setAlbumUrls] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open || !peerUserId) {
      queueMicrotask(() => {
        setPeer(null);
        setAlbumUrls([]);
        setFetching(false);
      });
      return;
    }

    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- loading transition before fetching peer + albums */
    setFetching(true);
    setPeer(null);
    setAlbumUrls([]);
    /* eslint-enable react-hooks/set-state-in-effect */

    void (async () => {
      const supabase = createClient();
      const [{ data }, albumOut] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, industry, avatar_url, bio, location, gender, skills_tags, languages, superpower, social_link, preferred_contact_channel, preferred_contact_detail",
          )
          .eq("user_id", peerUserId)
          .maybeSingle(),
        getPeerAlbumSignedUrlsForAcceptedConnection(peerUserId),
      ]);

      if (cancelled) return;
      setPeer(data as PeerRow | null);
      setAlbumUrls(albumOut.ok ? albumOut.items.map((i) => i.url) : []);
      setFetching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, peerUserId]);

  const body =
    fetching && !peer ? (
      <p className="text-sm text-slate-500">{strings.console.peerLoading}</p>
    ) : peer ? (
      <AcceptedPeerSections peer={peer} albumUrls={albumUrls} />
    ) : (
      <p className="text-sm text-slate-500">{strings.messagesPage.peerProfileUnavailable}</p>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.peerProfileTitle}</DialogTitle>
          <DialogDescription className="text-slate-400">{t.peerProfileSubtitle}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
