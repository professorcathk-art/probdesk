"use client";

import { useRef, useState } from "react";
import { uploadProfileAvatar } from "@/actions/profile";
import { Button } from "@/components/ui/button";

export function ConsoleAvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set("avatar", file);
    const res = await uploadProfileAvatar(fd);
    setBusy(false);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    setUrl(res.avatar_url);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
          <img src={url} alt="" className="h-16 w-16 rounded-full border border-white/15 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.04] text-[10px] leading-tight text-slate-500">
            No photo
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white">Profile photo</p>
          <p className="text-xs text-slate-500">Shown to mutual connections after acceptance.</p>
          {err ? <p className="mt-1 text-xs text-red-400">{err}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="border-white/15 bg-transparent text-slate-200 sm:ml-auto"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
      </Button>
    </div>
  );
}
