"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Prefer browser → Supabase Storage from `ConsoleAvatarUpload` to avoid platform body limits (413). */
export async function uploadProfileAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const file = formData.get("avatar");
  if (!file || !(file instanceof File)) {
    return { ok: false as const, message: "Choose an image file." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false as const, message: "Use JPG, PNG, WebP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, message: "Max file size is 5 MB." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/avatar`;

  const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) return { ok: false as const, message: upErr.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatar_url = pub.publicUrl;

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (dbErr) return { ok: false as const, message: dbErr.message };

  revalidatePath("/console");
  return { ok: true as const, avatar_url };
}

export async function getMyProfileAvatar(): Promise<{ avatar_url: string | null } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle();

  if (error) return { error: error.message };
  return { avatar_url: data?.avatar_url ?? null };
}

export type ProfileIdentity = {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  industry: string | null;
};

export async function getMyProfileIdentity(): Promise<ProfileIdentity | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, bio, location, industry")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  return {
    display_name: data?.display_name ?? null,
    bio: data?.bio ?? null,
    location: data?.location ?? null,
    industry: data?.industry ?? null,
  };
}

export async function updateMyProfileIdentity(fields: {
  display_name: string;
  bio: string;
  location: string;
  industry: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        display_name: fields.display_name.trim() || null,
        bio: fields.bio.trim() || null,
        location: fields.location.trim() || null,
        industry: fields.industry.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/console");
  return { ok: true as const };
}
