"use client";

import { UserRound } from "lucide-react";
import type { MatchRow } from "@/actions/matches";
import { useLanguage } from "@/components/language-provider";
import { displayProfileAgeGroup } from "@/lib/display-age-group";
import type { FactualSenderPreviewV1 } from "@/lib/factual-sender-preview";
import { isFactualSenderPreview, isSystemMatchPreview } from "@/lib/factual-sender-preview";

function truncateDisplay(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function peerGenderLabel(
  raw: string | null | undefined,
  labels: {
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  },
): string | null {
  switch (raw?.trim()) {
    case "woman":
      return labels.genderWoman;
    case "man":
      return labels.genderMan;
    case "non_binary":
      return labels.genderNonBinary;
    case "prefer_not_say":
      return labels.genderPreferNotSay;
    case "other":
      return labels.genderOther;
    default:
      return null;
  }
}

function FactualRows({
  preview,
  labels,
  profilePage,
}: {
  preview: FactualSenderPreviewV1;
  labels: {
    peerProfileBio: string;
    peerProfileIndustry: string;
    peerProfileLocation: string;
    peerProfileAgeGroup: string;
    peerProfileGender: string;
    peerProfileSuperpower: string;
    peerProfileSkills: string;
    peerProfileLanguages: string;
    senderPreviewNothingStored: string;
    genderWoman: string;
    genderMan: string;
    genderNonBinary: string;
    genderPreferNotSay: string;
    genderOther: string;
  };
  profilePage: {
    ageGroup18_24: string;
    ageGroup25_29: string;
    ageGroup30_34: string;
    ageGroup35_39: string;
    ageGroup40_44: string;
    ageGroup45_49: string;
    ageGroup50_54: string;
    ageGroup55_64: string;
    ageGroup65Plus: string;
  };
}) {
  const rows: { label: string; value: string }[] = [];
  const gPick = {
    genderWoman: labels.genderWoman,
    genderMan: labels.genderMan,
    genderNonBinary: labels.genderNonBinary,
    genderPreferNotSay: labels.genderPreferNotSay,
    genderOther: labels.genderOther,
  };

  if (preview.bio) rows.push({ label: labels.peerProfileBio, value: truncateDisplay(preview.bio, 720) });
  if (preview.industry) rows.push({ label: labels.peerProfileIndustry, value: preview.industry });
  if (preview.location) rows.push({ label: labels.peerProfileLocation, value: preview.location });
  const ageLbl = displayProfileAgeGroup(preview.age_group, profilePage);
  if (ageLbl) rows.push({ label: labels.peerProfileAgeGroup, value: ageLbl });
  const gLbl = peerGenderLabel(preview.gender, gPick);
  if (gLbl) rows.push({ label: labels.peerProfileGender, value: gLbl });
  if (preview.superpower) {
    rows.push({ label: labels.peerProfileSuperpower, value: truncateDisplay(preview.superpower, 200) });
  }
  if (preview.skills_tags.length > 0) {
    rows.push({ label: labels.peerProfileSkills, value: preview.skills_tags.join(", ") });
  }
  if (preview.languages.length > 0) {
    rows.push({ label: labels.peerProfileLanguages, value: preview.languages.join(", ") });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{labels.senderPreviewNothingStored}</p>;
  }

  return (
    <dl className="space-y-2.5">
      {rows.map(({ label, value }, idx) => (
        <div key={`${idx}-${label}`}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SenderPreviewBlock({ match }: { match: MatchRow }) {
  const { strings } = useLanguage();
  const c = strings.console;
  const pr = strings.profilePage;
  const raw = match.ai_context_sender;

  const factualLabels = {
    peerProfileBio: c.peerProfileBio,
    peerProfileIndustry: c.peerProfileIndustry,
    peerProfileLocation: c.peerProfileLocation,
    peerProfileAgeGroup: c.peerProfileAgeGroup,
    peerProfileGender: c.peerProfileGender,
    peerProfileSuperpower: c.peerProfileSuperpower,
    peerProfileSkills: c.peerProfileSkills,
    peerProfileLanguages: c.peerProfileLanguages,
    senderPreviewNothingStored: c.senderPreviewNothingStored,
    genderWoman: c.genderWoman,
    genderMan: c.genderMan,
    genderNonBinary: c.genderNonBinary,
    genderPreferNotSay: c.genderPreferNotSay,
    genderOther: c.genderOther,
  };

  const ageKeys = {
    ageGroup18_24: pr.ageGroup18_24,
    ageGroup25_29: pr.ageGroup25_29,
    ageGroup30_34: pr.ageGroup30_34,
    ageGroup35_39: pr.ageGroup35_39,
    ageGroup40_44: pr.ageGroup40_44,
    ageGroup45_49: pr.ageGroup45_49,
    ageGroup50_54: pr.ageGroup50_54,
    ageGroup55_64: pr.ageGroup55_64,
    ageGroup65Plus: pr.ageGroup65Plus,
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">{c.senderPreviewBadge}</p>
      {c.senderPreviewHint.trim() ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{c.senderPreviewHint}</p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-slate-500"
          aria-hidden
        >
          <UserRound className="h-6 w-6 opacity-70" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {isFactualSenderPreview(raw) ? (
            <>
              <p className="text-xs font-medium text-emerald-200/90">{c.senderPreviewFactualCaption}</p>
              <FactualRows preview={raw} labels={factualLabels} profilePage={ageKeys} />
            </>
          ) : isSystemMatchPreview(raw) ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/90">
                {c.senderPreviewSystemBadge}
              </p>
              <p className="text-sm leading-relaxed text-slate-200">{raw.body}</p>
              <p className="text-xs leading-relaxed text-slate-500">{c.senderPreviewSystemDisclaimer}</p>
            </>
          ) : (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/95">
              {c.senderPreviewLegacyNotice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
