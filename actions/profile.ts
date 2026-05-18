"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_CORE_MIN_BIO_LENGTH,
  PROFILE_SUPERPOWER_MAX,
  parseProfileGender,
  validateProfileBasicsForPublish,
} from "@/lib/profile-basics";
import { parseIntentLevel } from "@/lib/profile-intent-level";
import { normalizeProfileTags } from "@/lib/profile-tags";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";
import { isAdminEmail } from "@/lib/admin-emails";
import { syncProfileEmbedding } from "@/lib/sync-profile-embedding";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_TAGS = 5;

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

/** Prefer browser → Supabase Storage from `ConsoleAvatarUpload` to avoid platform body limits (413). */
export async function uploadProfileAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const ensuredUpload = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensuredUpload.ok) return { ok: false as const, message: ensuredUpload.message };

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
  superpower: string | null;
  gender: string | null;
  preferred_contact_channel: string | null;
  preferred_contact_detail: string | null;
  skills_tags: string[];
  languages: string[];
  intent_level: string | null;
  social_link: string | null;
};

/** Used before opening Explore/Manage invite UI — same bar as publishing a listing (gender, intent level, superpower, etc.). */
export async function getProfileBasicsGateForInvites(): Promise<{ ok: true } | { ok: false }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  if (isAdminEmail(user.email ?? undefined)) return { ok: true };

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, bio, location, industry, intent_level, superpower, gender, skills_tags, languages")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false };

  const gate = validateProfileBasicsForPublish(data ?? {});
  return gate.ok ? { ok: true } : { ok: false };
}

export async function getMyProfileIdentity(): Promise<ProfileIdentity | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, bio, location, industry, superpower, gender, preferred_contact_channel, preferred_contact_detail, skills_tags, languages, intent_level, social_link",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  return {
    display_name: data?.display_name ?? null,
    bio: data?.bio ?? null,
    location: data?.location ?? null,
    industry: data?.industry ?? null,
    superpower: data?.superpower ?? null,
    gender: data?.gender ?? null,
    preferred_contact_channel: data?.preferred_contact_channel ?? null,
    preferred_contact_detail: data?.preferred_contact_detail ?? null,
    skills_tags: Array.isArray(data?.skills_tags) ? (data!.skills_tags as string[]) : [],
    languages: Array.isArray(data?.languages) ? (data!.languages as string[]) : [],
    intent_level: data?.intent_level ?? null,
    social_link: data?.social_link ?? null,
  };
}

export async function updateMyProfileIdentity(fields: {
  display_name: string;
  bio: string;
  location: string;
  industry: string;
  superpower: string;
  gender: string;
  preferred_contact_channel?: string;
  preferred_contact_detail?: string;
  skills_tags: string[];
  languages: string[];
  intent_level: string;
  social_link: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const ensuredProfile = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensuredProfile.ok) return { ok: false as const, message: ensuredProfile.message };

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

  const skills_tags = normalizeProfileTags(fields.skills_tags ?? [], MAX_TAGS);
  const languages = normalizeProfileTags(fields.languages ?? [], MAX_TAGS);

  if (fields.bio.trim().length < PROFILE_CORE_MIN_BIO_LENGTH) {
    return {
      ok: false as const,
      message: `Bio must be at least ${PROFILE_CORE_MIN_BIO_LENGTH} characters.`,
    };
  }
  if (skills_tags.length === 0) {
    return { ok: false as const, message: "Add at least one keyword (interest or trait)." };
  }
  if (languages.length === 0) {
    return { ok: false as const, message: "Add at least one language." };
  }

  const ilRaw = fields.intent_level?.trim() ?? "";
  const intent_level = ilRaw ? parseIntentLevel(ilRaw) : null;
  if (ilRaw && !intent_level) {
    return { ok: false as const, message: "Invalid intent level." };
  }

  const superTrim = fields.superpower?.trim() ?? "";
  if (superTrim.length > PROFILE_SUPERPOWER_MAX) {
    return {
      ok: false as const,
      message: `What you offer must be at most ${PROFILE_SUPERPOWER_MAX} characters.`,
    };
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
        superpower: superTrim || null,
        gender: genderResolved,
        preferred_contact_channel: hasPair ? chRaw : null,
        preferred_contact_detail: hasPair ? detRaw : null,
        skills_tags,
        languages,
        intent_level,
        social_link: socialParsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false as const, message: error.message };

  await syncProfileEmbedding(supabase, user.id, {
    display_name: fields.display_name.trim() || null,
    bio: fields.bio.trim() || null,
    location: fields.location.trim() || null,
    industry: fields.industry.trim() || null,
    superpower: superTrim || null,
    gender: genderResolved,
    intent_level,
    skills_tags,
    languages,
  });

  revalidatePath("/console");
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const };
}
