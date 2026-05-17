"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_STATUS_KEYS, type CurrentStatusKey } from "@/lib/profile-current-status";
import { parseProfileGender } from "@/lib/profile-basics";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_TAGS = 5;

function normalizeTags(raw: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const v = String(x).trim();
    if (!v || out.length >= max) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function parseSocialLink(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    try {
      u = new URL(`https://${t}`);
    } catch {
      return null;
    }
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

function parseCurrentStatus(raw: string): CurrentStatusKey | null {
  const t = raw.trim();
  if (!t) return null;
  return (CURRENT_STATUS_KEYS as readonly string[]).includes(t) ? (t as CurrentStatusKey) : null;
}

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
  revalidatePath("/profile");
  revalidatePath("/");
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
  available_time: string | null;
  gender: string | null;
  preferred_contact_channel: string | null;
  preferred_contact_detail: string | null;
  skills_tags: string[];
  languages: string[];
  current_status: string | null;
  social_link: string | null;
};

export async function getMyProfileIdentity(): Promise<ProfileIdentity | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, bio, location, industry, available_time, gender, preferred_contact_channel, preferred_contact_detail, skills_tags, languages, current_status, social_link",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  return {
    display_name: data?.display_name ?? null,
    bio: data?.bio ?? null,
    location: data?.location ?? null,
    industry: data?.industry ?? null,
    available_time: data?.available_time ?? null,
    gender: data?.gender ?? null,
    preferred_contact_channel: data?.preferred_contact_channel ?? null,
    preferred_contact_detail: data?.preferred_contact_detail ?? null,
    skills_tags: Array.isArray(data?.skills_tags) ? (data!.skills_tags as string[]) : [],
    languages: Array.isArray(data?.languages) ? (data!.languages as string[]) : [],
    current_status: data?.current_status ?? null,
    social_link: data?.social_link ?? null,
  };
}

export async function updateMyProfileIdentity(fields: {
  display_name: string;
  bio: string;
  location: string;
  industry: string;
  available_time: string;
  gender: string;
  preferred_contact_channel?: string;
  preferred_contact_detail?: string;
  skills_tags: string[];
  languages: string[];
  current_status: string;
  social_link: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const chRaw = fields.preferred_contact_channel?.trim() ?? "";
  const detRaw = fields.preferred_contact_detail?.trim() ?? "";
  const hasPair = chRaw.length > 0 && detRaw.length > 0;
  const hasPartial = (chRaw.length > 0) !== (detRaw.length > 0);
  if (hasPartial) {
    return { ok: false as const, message: "Choose both a contact method and your handle, or leave both empty." };
  }
  const allowed = new Set(["whatsapp", "line", "wechat"]);
  if (chRaw && !allowed.has(chRaw)) {
    return { ok: false as const, message: "Invalid contact method." };
  }

  const genderRaw = fields.gender?.trim() ?? "";
  const genderResolved = genderRaw ? parseProfileGender(genderRaw) : null;
  if (genderRaw && !genderResolved) {
    return { ok: false as const, message: "Invalid gender selection." };
  }

  const skills_tags = normalizeTags(fields.skills_tags ?? [], MAX_TAGS);
  const languages = normalizeTags(fields.languages ?? [], MAX_TAGS);

  const csRaw = fields.current_status?.trim() ?? "";
  const current_status = csRaw ? parseCurrentStatus(csRaw) : null;
  if (csRaw && !current_status) {
    return { ok: false as const, message: "Invalid current status." };
  }

  const socialParsed = parseSocialLink(fields.social_link ?? "");
  if (fields.social_link?.trim() && !socialParsed) {
    return { ok: false as const, message: "Social link must be a valid http(s) URL." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        display_name: fields.display_name.trim() || null,
        bio: fields.bio.trim() || null,
        location: fields.location.trim() || null,
        industry: fields.industry.trim() || null,
        available_time: fields.available_time.trim() || null,
        gender: genderResolved,
        preferred_contact_channel: hasPair ? chRaw : null,
        preferred_contact_detail: hasPair ? detRaw : null,
        skills_tags,
        languages,
        current_status,
        social_link: socialParsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/console");
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const };
}
