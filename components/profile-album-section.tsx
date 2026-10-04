"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyAlbumSignedUrls, removeProfileAlbumPhoto, uploadProfileAlbumPhoto } from "@/actions/profile";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

const MAX = 5;

type Props = {
  paths: string[];
  onPathsUpdated?: () => void;
  tone?: "dark" | "light";
};

export function ProfileAlbumSection({ paths, onPathsUpdated, tone = "dark" }: Props) {
  const { strings } = useLanguage();
  const p = strings.profilePage;
  const [urls, setUrls] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUrls = useCallback(async () => {
    if (paths.length === 0) {
      setUrls([]);
      return;
    }
    const res = await getMyAlbumSignedUrls(paths);
    if (!res.ok) {
      setUrls([]);
      return;
    }
    setUrls(res.items);
  }, [paths]);

  useEffect(() => {
    void refreshUrls();
  }, [refreshUrls]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await uploadProfileAlbumPhoto(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onPathsUpdated?.();
  }

  async function onRemove(path: string) {
    setBusy(true);
    setError(null);
    const res = await removeProfileAlbumPhoto(path);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onPathsUpdated?.();
  }

  const light = tone === "light";

  return (
    <div className={light ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" : "rounded-xl border border-white/10 bg-black/25 p-4"}>
      <p className={light ? "text-sm font-medium text-slate-900" : "text-sm font-medium text-white"}>
        <span>{p.albumTitle}</span>
        <span className={light ? "ml-2 font-normal text-slate-500" : "ml-2 font-normal text-slate-500"}>({p.optionalMark})</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{p.albumPrivacyHint}</p>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {urls.map((item) => (
          <div key={item.path} className={light ? "relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100" : "relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/40"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="h-full w-full object-cover" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className="absolute right-0.5 top-0.5 h-8 min-h-0 bg-black/60 px-2 text-[11px] text-white hover:bg-black/80"
              onClick={() => void onRemove(item.path)}
            >
              {p.albumRemove}
            </Button>
          </div>
        ))}
        {paths.length < MAX ? (
          <label className={light ? "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-[11px] text-slate-500 hover:border-[#ff5a5f] hover:text-slate-700" : "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.03] text-center text-[11px] text-slate-400 hover:border-sky-400/35 hover:text-slate-300"}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={busy} onChange={(ev) => void onPick(ev)} />
            <span className="px-2">{busy ? p.uploading : p.albumAdd}</span>
          </label>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {paths.length}/{MAX} · {p.albumMaxNote}
      </p>
    </div>
  );
}
