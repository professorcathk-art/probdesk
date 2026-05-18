"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ConsoleAvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const { strings } = useLanguage();
  const p = strings.profilePage;
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setErr(null);
    if (!ALLOWED.includes(file.type)) {
      setErr(p.fileTypeErr);
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr(p.maxSizeErr);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr(p.signInRequired);
        setBusy(false);
        return;
      }

      const path = `${user.id}/avatar`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) {
        setErr(upErr.message);
        setBusy(false);
        return;
      }

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatar_url = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (dbErr) {
        setErr(dbErr.message);
        setBusy(false);
        return;
      }

      setUrl(avatar_url);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : p.uploadFailedErr);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
          <img src={url} alt="" className="h-16 w-16 rounded-full border border-white/15 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.04] text-[10px] leading-tight text-slate-500">
            {p.noPhoto}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white">
            <span>{p.avatarPhoto}</span>
            <span className="ml-2 font-normal text-slate-500">({p.optionalMark})</span>
          </p>
          <p className="text-xs text-slate-500">{p.avatarHint}</p>
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
        {busy ? p.uploading : url ? p.replacePhoto : p.uploadPhoto}
      </Button>
    </div>
  );
}
