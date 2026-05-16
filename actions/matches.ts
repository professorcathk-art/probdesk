"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeProfilePreview, vibeCheckWith4o } from "@/lib/aiml";

export type MatchRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  introductory_context: string | null;
  match_score: number | null;
  compatibility_reason: string | null;
  ai_context_sender: Record<string, unknown> | null;
  intent_request_id: string | null;
};

export async function initiateConnection(params: {
  receiverUserId: string;
  receiverIntentId: string;
  introductory_context: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, message: "Not authenticated" };
  if (user.id === params.receiverUserId) {
    return { ok: false as const, message: "You cannot connect with yourself." };
  }

  const { data: receiverIntent, error: intentError } = await supabase
    .from("intent_requests")
    .select("id, user_id, natural_language_input")
    .eq("id", params.receiverIntentId)
    .single();

  if (intentError || !receiverIntent || receiverIntent.user_id !== params.receiverUserId) {
    return { ok: false as const, message: "Intent not found." };
  }

  const { data: senderIntent } = await supabase
    .from("intent_requests")
    .select("natural_language_input")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let match_score = 72;
  let compatibility_reason =
    "Overlapping intent and geography — mutual fit depends on pace, proof, and incentive alignment.";

  try {
    if (senderIntent?.natural_language_input) {
      const vibe = await vibeCheckWith4o({
        senderIntent: senderIntent.natural_language_input,
        candidateIntent: receiverIntent.natural_language_input,
      });
      match_score = vibe.match_score;
      compatibility_reason = vibe.compatibility_reason;
    }
  } catch {
    /* keep defaults */
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name, industry, location, bio, available_time")
    .eq("user_id", user.id)
    .maybeSingle();

  let ai_context_sender: Record<string, unknown> = {
    headline: "Anonymous sender",
    summary: "Preview hidden until mutual acceptance.",
    signals: [],
  };

  try {
    if (senderProfile) {
      ai_context_sender = await sanitizeProfilePreview({
        display_name: senderProfile.display_name,
        industry: senderProfile.industry,
        location: senderProfile.location,
        bio: senderProfile.bio,
        available_time: senderProfile.available_time,
      });
    }
  } catch {
    /* fallback */
  }

  const { error } = await supabase.from("matches").insert({
    sender_id: user.id,
    receiver_id: params.receiverUserId,
    intent_request_id: params.receiverIntentId,
    introductory_context: params.introductory_context,
    match_score,
    compatibility_reason,
    ai_context_sender,
    status: "Pending",
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  return { ok: true as const };
}

export async function listMatches(): Promise<{ matches: MatchRow[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, sender_id, receiver_id, status, introductory_context, match_score, compatibility_reason, ai_context_sender, intent_request_id",
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { matches: (data ?? []) as MatchRow[] };
}

export async function respondToMatch(matchId: string, decision: "Accepted" | "Rejected") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { data: row } = await supabase
    .from("matches")
    .select("receiver_id, status")
    .eq("id", matchId)
    .single();

  if (!row || row.receiver_id !== user.id) {
    return { ok: false as const, message: "Only the receiver can respond." };
  }
  if (row.status !== "Pending") {
    return { ok: false as const, message: "Match is no longer pending." };
  }

  const { error } = await supabase
    .from("matches")
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function sendMatchMessage(matchId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, sender_id, receiver_id")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "Accepted") {
    return { ok: false as const, message: "Messaging is available after mutual acceptance." };
  }

  if (match.sender_id !== user.id && match.receiver_id !== user.id) {
    return { ok: false as const, message: "Not a participant." };
  }

  const { error } = await supabase.from("match_messages").insert({
    match_id: matchId,
    sender_id: user.id,
    body: body.trim(),
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function listMatchMessages(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated", messages: [] as const };

  const { data: match } = await supabase
    .from("matches")
    .select("status, sender_id, receiver_id")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "Accepted") {
    return { ok: false as const, message: "Not accepted yet.", messages: [] as const };
  }

  if (match.sender_id !== user.id && match.receiver_id !== user.id) {
    return { ok: false as const, message: "Forbidden", messages: [] as const };
  }

  const { data, error } = await supabase
    .from("match_messages")
    .select("id, sender_id, body, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, message: error.message, messages: [] as const };
  return { ok: true as const, messages: data ?? [] };
}
