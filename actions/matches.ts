"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeProfilePreview, vibeCheckWith4o } from "@/lib/aiml";
import { formatProfileMatchingSnippet } from "@/lib/profile-matching-snippet";
import { DUPLICATE_MATCH_MESSAGE, BLOCKING_MATCH_STATUSES, hasBlockingMatchBetween } from "@/lib/match-blocking";
import { isAdminEmail } from "@/lib/admin-emails";

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
  counterparty_intent_id: string | null;
  system_ack_sender: boolean;
  system_ack_receiver: boolean;
  sender_discloses_profile: boolean;
  created_at: string;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type CreditRpcResult = {
  ok?: boolean;
  credits_remaining?: number;
  error?: string;
};

export type InitiateConnectionResult =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; error: "OUT_OF_CREDITS" };

export async function getConnectionCreditsRemaining(): Promise<
  { credits: number; unlimited: boolean } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (isAdminEmail(user.email ?? undefined)) {
    return { credits: 0, unlimited: true };
  }

  const { data, error } = await supabase.rpc("get_connection_credits_remaining", {
    p_user_id: user.id,
  });

  if (error) return { error: error.message };

  const row = data as CreditRpcResult | null;
  if (!row?.ok || typeof row.credits_remaining !== "number") {
    return { error: row?.error ?? "Could not load credits." };
  }

  return { credits: row.credits_remaining, unlimited: false };
}

export async function initiateConnection(params: {
  receiverUserId: string;
  receiverIntentId: string;
  introductory_context: string;
  senderDisclosesProfile?: boolean;
}): Promise<InitiateConnectionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, message: "Not authenticated" };

  const adminUser = isAdminEmail(user.email ?? undefined);

  const { data: receiverIntent, error: intentError } = await supabase
    .from("intent_requests")
    .select("id, user_id, natural_language_input, is_demo_listing")
    .eq("id", params.receiverIntentId)
    .single();

  if (intentError || !receiverIntent || receiverIntent.user_id !== params.receiverUserId) {
    return { ok: false as const, message: "Request not found." };
  }

  const demoInbox = process.env["MARKETPLACE_DEMO_INBOX_USER_ID"]?.trim();
  let receiverId = params.receiverUserId;
  if (receiverIntent.is_demo_listing === true) {
    if (!demoInbox) {
      return {
        ok: false as const,
        message: "Demo marketplace is not configured (MARKETPLACE_DEMO_INBOX_USER_ID).",
      };
    }
    receiverId = demoInbox;
  }

  if (user.id === receiverId) {
    return { ok: false as const, message: "You cannot connect with yourself." };
  }

  if (await hasBlockingMatchBetween(supabase, user.id, receiverId)) {
    return { ok: false as const, message: DUPLICATE_MATCH_MESSAGE };
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

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select(
      "display_name, industry, location, bio, superpower, skills_tags, languages, intent_level",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: receiverProfile } = await supabase
    .from("profiles")
    .select("bio, industry, skills_tags, languages, intent_level, superpower")
    .eq("user_id", receiverId)
    .maybeSingle();

  try {
    if (senderIntent?.natural_language_input) {
      const senderSnippet = formatProfileMatchingSnippet({
        bio: senderProfile?.bio ?? null,
        industry: senderProfile?.industry ?? null,
        skills_tags: senderProfile?.skills_tags ?? null,
        languages: senderProfile?.languages ?? null,
        intent_level: senderProfile?.intent_level ?? null,
        superpower: senderProfile?.superpower ?? null,
      });
      const candidateSnippet = formatProfileMatchingSnippet({
        bio: receiverProfile?.bio ?? null,
        industry: receiverProfile?.industry ?? null,
        skills_tags: receiverProfile?.skills_tags ?? null,
        languages: receiverProfile?.languages ?? null,
        intent_level: receiverProfile?.intent_level ?? null,
        superpower: receiverProfile?.superpower ?? null,
      });
      const vibe = await vibeCheckWith4o({
        senderIntent: senderIntent.natural_language_input,
        candidateIntent: receiverIntent.natural_language_input,
        senderProfileSnippet: senderSnippet || undefined,
        candidateProfileSnippet: candidateSnippet || undefined,
      });
      match_score = vibe.match_score;
      compatibility_reason = vibe.compatibility_reason;
    }
  } catch {
    /* keep defaults */
  }

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
        superpower: senderProfile.superpower,
        skills_tags: senderProfile.skills_tags,
        languages: senderProfile.languages,
        intent_level: senderProfile.intent_level,
      });
    }
  } catch {
    /* fallback */
  }

  let creditsConsumed = false;

  if (!adminUser) {
    const { data: creditData, error: creditRpcError } = await supabase.rpc("consume_connection_credit", {
      p_user_id: user.id,
    });

    if (creditRpcError) {
      return { ok: false as const, message: creditRpcError.message };
    }

    const creditRow = creditData as CreditRpcResult | null;
    if (!creditRow?.ok) {
      if (creditRow?.error === "OUT_OF_CREDITS") {
        return { ok: false as const, error: "OUT_OF_CREDITS" };
      }
      return {
        ok: false as const,
        message: creditRow?.error ?? "Could not use an invite credit.",
      };
    }
    creditsConsumed = true;
  }

  const { error } = await supabase.from("matches").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    intent_request_id: params.receiverIntentId,
    introductory_context: params.introductory_context,
    match_score,
    compatibility_reason,
    ai_context_sender,
    status: "Pending",
    system_ack_sender: false,
    system_ack_receiver: false,
    sender_discloses_profile: Boolean(params.senderDisclosesProfile),
  });

  if (error) {
    if (creditsConsumed) {
      await supabase.rpc("refund_connection_credit", { p_user_id: user.id });
    }
    return { ok: false as const, message: error.message };
  }
  revalidatePath("/console");
  revalidatePath("/marketplace");
  revalidatePath("/square");
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
      "id, sender_id, receiver_id, status, introductory_context, match_score, compatibility_reason, ai_context_sender, intent_request_id, counterparty_intent_id, system_ack_sender, system_ack_receiver, sender_discloses_profile, created_at",
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return {
    matches: (data ?? []).map((m) => ({
      ...m,
      system_ack_sender: Boolean(m.system_ack_sender),
      system_ack_receiver: Boolean(m.system_ack_receiver),
      sender_discloses_profile: Boolean(m.sender_discloses_profile),
    })) as MatchRow[],
  };
}

export async function respondToMatch(matchId: string, decision: "Accepted" | "Rejected") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { data: row } = await supabase
    .from("matches")
    .select(
      "receiver_id, sender_id, status, system_ack_sender, system_ack_receiver",
    )
    .eq("id", matchId)
    .single();

  if (!row) return { ok: false as const, message: "Match not found." };

  const participant = user.id === row.sender_id || user.id === row.receiver_id;

  if (decision === "Rejected") {
    if (row.status !== "Pending" && row.status !== "Pending_System") {
      return { ok: false as const, message: "Match is no longer pending." };
    }
    if (row.status === "Pending" && row.receiver_id !== user.id) {
      return { ok: false as const, message: "Only the inbound recipient can decline this request." };
    }
    if (row.status === "Pending_System" && !participant) {
      return { ok: false as const, message: "Not a participant." };
    }
    const { error } = await supabase
      .from("matches")
      .update({ status: "Rejected", updated_at: new Date().toISOString() })
      .eq("id", matchId);
    if (error) return { ok: false as const, message: error.message };
    revalidatePath("/console");
    return { ok: true as const };
  }

  /* Accepted */
  if (row.status === "Pending") {
    if (row.receiver_id !== user.id) {
      return { ok: false as const, message: "Only the inbound recipient can accept." };
    }
    const { error } = await supabase
      .from("matches")
      .update({ status: "Accepted", updated_at: new Date().toISOString() })
      .eq("id", matchId);
    if (error) return { ok: false as const, message: error.message };
    revalidatePath("/console");
    return { ok: true as const };
  }

  if (row.status === "Pending_System") {
    if (!participant) return { ok: false as const, message: "Not a participant." };

    const isSender = user.id === row.sender_id;
    const ackS = Boolean(row.system_ack_sender);
    const ackR = Boolean(row.system_ack_receiver);
    const nextSenderAck = ackS || isSender;
    const nextReceiverAck = ackR || !isSender;

    if (nextSenderAck && nextReceiverAck) {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "Accepted",
          system_ack_sender: true,
          system_ack_receiver: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) return { ok: false as const, message: error.message };
    } else {
      const { error } = await supabase
        .from("matches")
        .update({
          system_ack_sender: nextSenderAck,
          system_ack_receiver: nextReceiverAck,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) return { ok: false as const, message: error.message };
    }
    revalidatePath("/console");
    return { ok: true as const };
  }

  return { ok: false as const, message: "Match is no longer pending." };
}

export async function sendMatchMessage(matchId: string, content: string) {
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

  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/console");
  revalidatePath("/messages");
  return { ok: true as const };
}

export async function listMatchMessages(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated", messages: [] as MessageRow[] };

  const { data: match } = await supabase
    .from("matches")
    .select("status, sender_id, receiver_id")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "Accepted") {
    return { ok: false as const, message: "Not accepted yet.", messages: [] as MessageRow[] };
  }

  if (match.sender_id !== user.id && match.receiver_id !== user.id) {
    return { ok: false as const, message: "Forbidden", messages: [] as MessageRow[] };
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, message: error.message, messages: [] as MessageRow[] };
  return { ok: true as const, messages: (data ?? []) as MessageRow[] };
}

/** Timeline of messages across multiple Accepted matches with the same peer. */
export async function listMergedMatchMessages(matchIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated", messages: [] as MessageRow[] };

  const ids = [...new Set(matchIds)].filter(Boolean);
  if (ids.length === 0) return { ok: false as const, message: "No threads.", messages: [] as MessageRow[] };

  const { data: rows, error: mErr } = await supabase
    .from("matches")
    .select("id, status, sender_id, receiver_id")
    .in("id", ids);

  if (mErr || !rows || rows.length !== ids.length) {
    return { ok: false as const, message: mErr?.message ?? "Could not load threads.", messages: [] as MessageRow[] };
  }

  const peerIds = new Set<string>();
  for (const r of rows) {
    if (r.status !== "Accepted") {
      return { ok: false as const, message: "Only accepted threads can be merged.", messages: [] as MessageRow[] };
    }
    if (r.sender_id !== user.id && r.receiver_id !== user.id) {
      return { ok: false as const, message: "Forbidden", messages: [] as MessageRow[] };
    }
    peerIds.add(r.sender_id === user.id ? r.receiver_id : r.sender_id);
  }

  if (peerIds.size !== 1) {
    return { ok: false as const, message: "Merged chat must be with one peer.", messages: [] as MessageRow[] };
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .in("match_id", ids)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, message: error.message, messages: [] as MessageRow[] };
  return { ok: true as const, messages: (data ?? []) as MessageRow[] };
}

/** Peer user IDs that already share a Pending / Pending_System / Accepted match with the current user. */
export async function getBlockingPeerIdsForCurrentUser(): Promise<{ peerIds: string[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("matches")
    .select("sender_id, receiver_id")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .in("status", [...BLOCKING_MATCH_STATUSES]);

  if (error) return { error: error.message };

  const peers = new Set<string>();
  for (const row of data ?? []) {
    peers.add(row.sender_id === user.id ? row.receiver_id : row.sender_id);
  }
  return { peerIds: [...peers] };
}

/** Receiver intent IDs for outbound Pending Square requests from the current user. */
export async function getSquarePendingIntentIdsForCurrentUser(): Promise<{ intentIds: string[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { intentIds: [] };

  const { data, error } = await supabase
    .from("matches")
    .select("intent_request_id")
    .eq("sender_id", user.id)
    .eq("status", "Pending")
    .not("intent_request_id", "is", null);

  if (error) return { error: error.message };

  const ids = [...new Set((data ?? []).map((r) => r.intent_request_id).filter(Boolean))] as string[];
  return { intentIds: ids };
}
