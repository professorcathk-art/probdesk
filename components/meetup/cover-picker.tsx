"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { withAvatarCacheBust } from "@/lib/avatar-cache-bust";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPostCover(file: File): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!ALLOWED.includes(file.type)) return { ok: false, message: "type" };
  if (file.size > MAX_BYTES) return { ok: false, message: "size" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "auth" };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/post-covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, message: error.message };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { ok: true, url: withAvatarCacheBust(data.publicUrl) };
}

export function CoverPicker({
  label,
  hint,
  addLabel,
  changeLabel,
  removeLabel,
  previewUrl,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  addLabel: string;
  changeLabel: string;
  removeLabel: string;
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = previewUrl;

  return (
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-20 w-28 overflow-hidden rounded-xl bg-slate-100">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview or uploaded cover
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-800">
            {shown ? changeLabel : addLabel}
          </button>
          {shown ? (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-full px-3 text-sm text-slate-500"
            >
              {removeLabel}
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onFile(file);
        }}
      />
    </div>
  );
}
