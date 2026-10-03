"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vibeCheckWith4o } from "@/lib/aiml";
import { formatProfileMatchingSnippet } from "@/lib/profile-matching-snippet";
import { buildFactualSenderPreviewFromProfile } from "@/lib/factual-sender-preview";
import { DUPLICATE_MATCH_MESSAGE, BLOCKING_MATCH_STATUSES, hasBlockingMatchBetween } from "@/lib/match-blocking";
import { validateProfileBasicsForPublish } from "@/lib/profile-basics";
import { isAdminEmail } from "@/lib/admin-emails";
import { logPairingScoreEvent } from "@/lib/pairing-score-log";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site-url";
import { parseProfileAttractionOrientation } from "@/lib/profile-attraction-orientation";
import {
  notifyNewConnectionRequestEmailAsync,
  notifyOutboundSenderConnectionAcceptedAsync,
  notifyParticipantsConnectionEstablishedAsync,
} from "@/lib/resend-connection-notifications";

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
  sender_context_intent_id: string | null;
  system_ack_sender: boolean;
  system_ack_receiver: boolean;
  sender_discloses_profile: boolean;
  created_at: string;
};

export type MessageRow = {
  id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  is_system: boolean;
};

type CreditRpcResult = {
  ok?: boolean;
  credits_remaining?: number;
  error?: string;
};

export type InitiateConnectionResult =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; error: "OUT_OF_CREDITS" }
  | { ok: false; error: "PROFILE_INCOMPLETE" };

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
  /** When omitted, invite targets the member by profile discovery (no Explore listing row). */
  receiverIntentId?: string | null;
  introductory_context: string;
  /** Manage discovery: sender's intent card this invite was started from. */
  senderContextIntentId?: string | null;
}): Promise<InitiateConnectionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, message: "Not authenticated" };

  const adminUser = isAdminEmail(user.email ?? undefined);

  const { data: inviteGateProfile } = await supabase
    .from("profiles")
    .select(
      "display_name, bio, location, industry, superpower, gender, skills_tags, languages",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    const inviteGate = validateProfileBasicsForPublish(inviteGateProfile ?? {});
    if (!inviteGate.ok) {
      return { ok: false as const, error: "PROFILE_INCOMPLETE" as const };
    }
  }

  const receiverIntentId = params.receiverIntentId?.trim() ? params.receiverIntentId.trim() : null;

  let receiverIntent: {
    id: string;
    user_id: string;
    natural_language_input: string;
    is_demo_listing: boolean;
    must_haves: string | null;
    location_filter: string | null;
  } | null = null;

  /** Service-role peek for profile-discovery invites only (JWT cannot read peers' profiles/users under RLS). */
  let discoverReceiverProfileFields:
    | {
        bio: string | null;
        industry: string | null;
        skills_tags: string[] | null;
        languages: string[] | null;
        superpower: string | null;
        location: string | null;
        gender: string | null;
      }
    | undefined;

  if (receiverIntentId) {
    const { data: intentRow, error: intentError } = await supabase
      .from("intent_requests")
      .select("id, user_id, natural_language_input, is_demo_listing, must_haves, location_filter")
      .eq("id", receiverIntentId)
      .single();

    if (intentError || !intentRow || intentRow.user_id !== params.receiverUserId) {
      return { ok: false as const, message: "Request not found." };
    }
    receiverIntent = intentRow;
  } else {
    /**
     * Peers cannot be read with the caller's Supabase JWT: `users` and foreign `profiles` are RLS-own-row only (schema).
     * Without service role, `.select` returns no row → falsely looked like «not found». Same pattern as
     * {@link actions/profile#getSuggestionProfilePreview}.
     */
    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      return {
        ok: false as const,
        message:
          "Server configuration error.",
      };
    }

    const { data: ru } = await svc.from("users").select("id").eq("id", params.receiverUserId).maybeSingle();
    if (!ru) {
      return { ok: false as const, message: "That member could not be found." };
    }

    const { data: recvProf } = await svc
      .from("profiles")
      .select("display_name, bio, location, industry, superpower, gender, skills_tags, languages")
      .eq("user_id", params.receiverUserId)
      .maybeSingle();

    const recvReady = validateProfileBasicsForPublish(recvProf ?? {});
    if (!recvReady.ok) {
      return {
        ok: false as const,
        message:
          "That member has not finished the required profile to receive invitations yet.",
      };
    }

    discoverReceiverProfileFields = {
      bio: recvProf?.bio ?? null,
      industry: recvProf?.industry ?? null,
      skills_tags: Array.isArray(recvProf?.skills_tags) ? (recvProf!.skills_tags as string[]) : [],
      languages: Array.isArray(recvProf?.languages) ? (recvProf!.languages as string[]) : [],
      superpower: recvProf?.superpower ?? null,
      location: recvProf?.location ?? null,
      gender: recvProf?.gender ?? null,
    };
  }

  const demoInbox = process.env["MARKETPLACE_DEMO_INBOX_USER_ID"]?.trim();
  let receiverId = params.receiverUserId;
  if (receiverIntent?.is_demo_listing === true) {
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

  const ctxIntent = params.senderContextIntentId?.trim();
  if (ctxIntent) {
    if (!/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(ctxIntent)) {
      return { ok: false as const, message: "Invalid sender intent." };
    }
    const { data: owned } = await supabase
      .from("intent_requests")
      .select("id")
      .eq("id", ctxIntent)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!owned) {
      return { ok: false as const, message: "Sender intent not found." };
    }
  }

  if (await hasBlockingMatchBetween(supabase, user.id, receiverId)) {
    return { ok: false as const, message: DUPLICATE_MATCH_MESSAGE };
  }

  let senderIntentText: string | null = null;
  let anchorIntentIdForLog: string | null = null;
  let senderMustHaves: string | null = null;
  let senderLocationPreference: string | null = null;

  if (ctxIntent) {
    const { data: ctxRow } = await supabase
      .from("intent_requests")
      .select("id, natural_language_input, must_haves, location_filter")
      .eq("id", ctxIntent)
      .eq("user_id", user.id)
      .maybeSingle();
    anchorIntentIdForLog = ctxRow?.id ?? null;
    senderIntentText = ctxRow?.natural_language_input?.trim() ?? null;
    senderMustHaves = ctxRow?.must_haves ?? null;
    senderLocationPreference = ctxRow?.location_filter ?? null;
  }
  if (!senderIntentText) {
    const { data: latestSenderIntent } = await supabase
      .from("intent_requests")
      .select("id, natural_language_input, must_haves, location_filter")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    anchorIntentIdForLog = latestSenderIntent?.id ?? anchorIntentIdForLog;
    senderIntentText = latestSenderIntent?.natural_language_input?.trim() ?? null;
    senderMustHaves = latestSenderIntent?.must_haves ?? senderMustHaves;
    senderLocationPreference = latestSenderIntent?.location_filter ?? senderLocationPreference;
  }

  const FALLBACK_SCORE_REASON_LOW_SIGNAL =
    "We could not compute a reliable fit automatically — treat this invite as context-first until you have both reviewed what each side wants.";
  let match_score: number | null = null;
  let compatibility_reason = FALLBACK_SCORE_REASON_LOW_SIGNAL;

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select(
      "display_name, industry, location, bio, superpower, skills_tags, languages, gender, age_group, attraction_orientation",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  type ReceiverSnippetRow = {
    bio: string | null;
    industry: string | null;
    skills_tags: string[] | null;
    languages: string[] | null;
    superpower: string | null;
    location: string | null;
    gender: string | null;
  };

  let receiverProfile: ReceiverSnippetRow | null = null;

  if (receiverId === params.receiverUserId && discoverReceiverProfileFields !== undefined) {
    receiverProfile = discoverReceiverProfileFields;
  } else {
    try {
      const svcPeer = createServiceRoleClient();
      const { data: peerRow } = await svcPeer
        .from("profiles")
        .select("bio, industry, skills_tags, languages, superpower, location, gender")
        .eq("user_id", receiverId)
        .maybeSingle();
      receiverProfile = peerRow as ReceiverSnippetRow | null;
    } catch {
      const { data: peerFallback } = await supabase
        .from("profiles")
        .select("bio, industry, skills_tags, languages, superpower, location, gender")
        .eq("user_id", receiverId)
        .maybeSingle();
      receiverProfile = peerFallback as ReceiverSnippetRow | null;
    }
  }

  try {
    if (senderIntentText) {
      const senderSnippet = formatProfileMatchingSnippet({
        bio: senderProfile?.bio ?? null,
        industry: senderProfile?.industry ?? null,
        skills_tags: senderProfile?.skills_tags ?? null,
        languages: senderProfile?.languages ?? null,
        superpower: senderProfile?.superpower ?? null,
      });
      const candidateSnippet = formatProfileMatchingSnippet({
        bio: receiverProfile?.bio ?? null,
        industry: receiverProfile?.industry ?? null,
        skills_tags: receiverProfile?.skills_tags ?? null,
        languages: receiverProfile?.languages ?? null,
        superpower: receiverProfile?.superpower ?? null,
      });
      const candidateIntentText =
        receiverIntent?.natural_language_input?.trim() ||
        "(Profile-only invite — they did not publish a separate Explore listing; judge complementary fit from their profile vs your intent.)";
      const vibe = await vibeCheckWith4o({
        senderIntent: senderIntentText,
        candidateIntent: candidateIntentText,
        senderProfileSnippet: senderSnippet || undefined,
        candidateProfileSnippet: candidateSnippet || undefined,
        senderMustHaves,
        candidateMustHaves: receiverIntent?.must_haves ?? null,
        senderLocationPreference,
        candidateLocation: receiverIntent?.location_filter ?? receiverProfile?.location ?? null,
        senderGender: senderProfile?.gender ?? null,
        candidateGender: receiverProfile?.gender ?? null,
        senderAttractionOrientationSlug: parseProfileAttractionOrientation(senderProfile?.attraction_orientation) ?? undefined,
      });
      match_score = vibe.match_score;
      compatibility_reason = vibe.compatibility_reason;
    }
  } catch {
    match_score = 34;
    compatibility_reason =
      "Fit scoring was unavailable — Vennode defaulted this relationship hint conservatively; judge overlap from both intents.";
  }

  await logPairingScoreEvent({
    source: "invite_vibe",
    actor_user_id: user.id,
    anchor_intent_id: anchorIntentIdForLog,
    candidate_intent_id: receiverIntentId,
    candidate_user_id: receiverId,
    match_score,
    compatibility_reason,
    excluded_reason: senderIntentText ? null : "no_sender_intent_text",
    meta: { sender_context_intent_id: ctxIntent || null, profile_only_invite: receiverIntentId === null },
  });

  /** Recipient-facing preview: verbatim profile fields only (no LLM fabrications). */
  const ai_context_sender: Record<string, unknown> = senderProfile
    ? (buildFactualSenderPreviewFromProfile({
        bio: senderProfile.bio,
        industry: senderProfile.industry,
        location: senderProfile.location,
        superpower: senderProfile.superpower,
        gender: senderProfile.gender,
        age_group: senderProfile.age_group ?? null,
        skills_tags: senderProfile.skills_tags,
        languages: senderProfile.languages,
      }) as unknown as Record<string, unknown>)
    : ({
        preview_kind: "factual_v1",
        bio: null,
        industry: null,
        location: null,
        superpower: null,
        gender: null,
        age_group: null,
        skills_tags: [],
        languages: [],
      } as Record<string, unknown>);

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
    intent_request_id: receiverIntentId,
    sender_context_intent_id: ctxIntent || null,
    introductory_context: params.introductory_context,
    match_score,
    compatibility_reason,
    ai_context_sender,
    status: "Pending",
    system_ack_sender: false,
    system_ack_receiver: false,
    sender_discloses_profile: false,
  });

  if (error) {
    if (creditsConsumed) {
      await supabase.rpc("refund_connection_credit", { p_user_id: user.id });
    }
    return { ok: false as const, message: error.message };
  }
  notifyNewConnectionRequestEmailAsync(receiverId, getSiteOrigin());
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
      "id, sender_id, receiver_id, status, introductory_context, match_score, compatibility_reason, ai_context_sender, intent_request_id, counterparty_intent_id, sender_context_intent_id, system_ack_sender, system_ack_receiver, sender_discloses_profile, created_at",
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return {
    matches: (data ?? []).map((m) => ({
      ...m,
      sender_context_intent_id: (m as { sender_context_intent_id?: string | null }).sender_context_intent_id ?? null,
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
    revalidatePath("/portal/one-to-one");
    revalidatePath("/portal/groups");
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
    notifyOutboundSenderConnectionAcceptedAsync(row.sender_id, getSiteOrigin());
    revalidatePath("/console");
    revalidatePath("/messages");
    revalidatePath("/portal/one-to-one");
    revalidatePath("/portal/groups");
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
      notifyParticipantsConnectionEstablishedAsync(row.sender_id, row.receiver_id, getSiteOrigin());
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
    revalidatePath("/messages");
    revalidatePath("/portal/one-to-one");
    revalidatePath("/portal/groups");
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

  const trimmed = content.trim();
  if (trimmed.startsWith("VENNODE_SYSTEM_")) {
    return { ok: false as const, message: "Invalid message." };
  }

  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    content: trimmed,
    is_system: false,
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
    .select("id, sender_id, content, created_at, is_system")
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
    .select("id, sender_id, content, created_at, is_system")
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
