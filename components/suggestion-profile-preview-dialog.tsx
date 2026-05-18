"use client";

import { useEffect, useState } from "react";
import type { SuggestionProfilePreview } from "@/actions/profile";
import { getSuggestionProfilePreview } from "@/actions/profile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { displayGenderLabel } from "@/lib/display-gender";
import { displayProfileAgeGroup } from "@/lib/display-age-group";

function intentLevelLabel(slug: string | null, pr: { intentCasual: string; intentIntentional: string; intentFocused: string }): string | null {
  switch (slug?.trim()) {
    case "casual_open":
      return pr.intentCasual;
    case "intentional_seeking":
      return pr.intentIntentional;
    case "focused_commit":
      return pr.intentFocused;
    default:
      return slug?.trim() || null;
  }
}

export function SuggestionProfilePreviewDialog({
  peerUserId,
  open,
  onOpenChange,
}: {
  peerUserId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { strings } = useLanguage();
  const c = strings.console;
  const pr = strings.profilePage;
  const [preview, setPreview] = useState<SuggestionProfilePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !peerUserId) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    setPreview(null);
    void getSuggestionProfilePreview(peerUserId).then((res) => {
      if (cancelled) return;
      setBusy(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPreview(res.preview);
    });
    return () => {
      cancelled = true;
    };
  }, [open, peerUserId]);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 text-slate-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{c.previewProfileTitle}</DialogTitle>
          <DialogDescription className="text-slate-400">{c.previewProfileSubtitle}</DialogDescription>
        </DialogHeader>
        {busy ? <p className="text-sm text-slate-400">{c.previewProfileLoading}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {preview ? (
          <div className="space-y-3 text-sm">
            {preview.bio?.trim() ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{c.profileBio}</p>
                <p className="mt-1 leading-relaxed text-slate-200">{preview.bio.trim()}</p>
              </div>
            ) : null}
            {displayGenderLabel(preview.gender, c) ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{c.profileGender}: </span>
                {displayGenderLabel(preview.gender, c)}
              </p>
            ) : null}
            {displayProfileAgeGroup(preview.age_group, pr) ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{pr.ageGroupLabel}: </span>
                {displayProfileAgeGroup(preview.age_group, pr)}
              </p>
            ) : null}
            {preview.location?.trim() ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{c.profileLocation}: </span>
                {preview.location.trim()}
              </p>
            ) : null}
            {preview.industry?.trim() ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{c.profileIndustry}: </span>
                {preview.industry.trim()}
              </p>
            ) : null}
            {preview.superpower?.trim() ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{pr.superpowerLabel}: </span>
                {preview.superpower.trim()}
              </p>
            ) : null}
            {preview.skills_tags.filter(Boolean).length > 0 ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{pr.skillsTraitsLabel}: </span>
                {preview.skills_tags.join(", ")}
              </p>
            ) : null}
            {preview.languages.filter(Boolean).length > 0 ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{pr.languagesLabel}: </span>
                {preview.languages.join(", ")}
              </p>
            ) : null}
            {intentLevelLabel(preview.intent_level, pr) ? (
              <p className="text-slate-300">
                <span className="text-slate-500">{pr.intentLevelLabel}: </span>
                {intentLevelLabel(preview.intent_level, pr)}
              </p>
            ) : null}
            <p className="text-xs leading-relaxed text-sky-300/85">{c.previewProfileFooter}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
