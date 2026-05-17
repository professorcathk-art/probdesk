"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/actions/matches";

export type MessengerThreadDTO = {
  peerId: string;
  matchIds: string[];
  sendOnMatchId: string;
  peerDisplayName: string | null;
  peerIndustry: string | null;
  peerAvatarUrl: string | null;
  lastMessagePreview: string | null;
  lastActivityAt: string;
  unread: boolean;
  matchedIntentTitle: string | null;
};

type MsgLite = {
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function groupAcceptedMatchesByPeer(matches: MatchRow[], userId: string): Map<string, MatchRow[]> {
  const map = new Map<string, MatchRow[]>();
  for (const m of matches) {
    if (m.status !== "Accepted") continue;
    const peer = m.sender_id === userId ? m.receiver_id : m.sender_id;
    const list = map.get(peer) ?? [];
    list.push(m);
    map.set(peer, list);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return map;
}

async function resolveMatchedIntentTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  peerMatches: MatchRow[],
  userId: string,
): Promise<string | null> {
  const latest = [...peerMatches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  const ids = [latest.intent_request_id, latest.counterparty_intent_id].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  if (ids.length === 0) {
    const intro = latest.introductory_context?.trim();
    return intro ? truncate(intro, 140) : null;
  }
  const { data: intents } = await supabase
    .from("intent_requests")
    .select("id, user_id, natural_language_input")
    .in("id", [...new Set(ids)]);
  const rows = intents ?? [];
  const mine = rows.find((r) => r.user_id === userId)?.natural_language_input?.trim();
  const theirs = rows.find((r) => r.user_id !== userId)?.natural_language_input?.trim();
  const nl = mine ?? theirs ?? rows[0]?.natural_language_input?.trim();
  if (nl) return truncate(nl, 140);
  const intro = latest.introductory_context?.trim();
  return intro ? truncate(intro, 140) : null;
}

function matchHasUnread(
  userId: string,
  matchId: string,
  latestPeerByMatch: Map<string, MsgLite>,
  reads: Map<string, string>,
): boolean {
  const peerMsg = latestPeerByMatch.get(matchId);
  if (!peerMsg || peerMsg.sender_id === userId) return false;
  const readAt = reads.get(matchId);
  if (!readAt) return true;
  return new Date(peerMsg.created_at).getTime() > new Date(readAt).getTime();
}

export async function resolveMessengerPeerFromMatch(matchId: string): Promise<
  { ok: true; peerId: string; matchIds: string[]; sendOnMatchId: string } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, sender_id, receiver_id, status, introductory_context, match_score, compatibility_reason, ai_context_sender, intent_request_id, counterparty_intent_id, system_ack_sender, system_ack_receiver, sender_discloses_profile, created_at",
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "Accepted");

  if (error) return { ok: false, message: error.message };

  const rows = (matches ?? []).map((m) => ({
    ...m,
    system_ack_sender: Boolean(m.system_ack_sender),
    system_ack_receiver: Boolean(m.system_ack_receiver),
    sender_discloses_profile: Boolean(m.sender_discloses_profile),
  })) as MatchRow[];

  const hit = rows.find((m) => m.id === matchId);
  if (!hit) return { ok: false, message: "Thread not found." };

  const peerId = hit.sender_id === user.id ? hit.receiver_id : hit.sender_id;
  const peerRows = rows.filter((m) => {
    const p = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    return p === peerId;
  });
  peerRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const matchIds = peerRows.map((m) => m.id);
  const sendOnMatchId = peerRows[0]?.id ?? matchId;

  return { ok: true, peerId, matchIds, sendOnMatchId };
}

export async function listMessengerThreads(): Promise<{ threads: MessengerThreadDTO[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: rawMatches, error: mErr } = await supabase
    .from("matches")
    .select(
      "id, sender_id, receiver_id, status, introductory_context, match_score, compatibility_reason, ai_context_sender, intent_request_id, counterparty_intent_id, system_ack_sender, system_ack_receiver, sender_discloses_profile, created_at",
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "Accepted");

  if (mErr) return { error: mErr.message };

  const matches = (rawMatches ?? []).map((m) => ({
    ...m,
    system_ack_sender: Boolean(m.system_ack_sender),
    system_ack_receiver: Boolean(m.system_ack_receiver),
    sender_discloses_profile: Boolean(m.sender_discloses_profile),
  })) as MatchRow[];

  const grouped = groupAcceptedMatchesByPeer(matches, user.id);
  if (grouped.size === 0) return { threads: [] };

  const peerIds = [...grouped.keys()];
  const allMatchIds = [...grouped.values()].flatMap((arr) => arr.map((m) => m.id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, industry, avatar_url")
    .in("user_id", peerIds);

  const profMap = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

  const { data: msgRows } = await supabase
    .from("messages")
    .select("match_id, sender_id, content, created_at")
    .in("match_id", allMatchIds)
    .order("created_at", { ascending: false })
    .limit(800);

  const latestByMatch = new Map<string, MsgLite>();
  const latestPeerMsgByMatch = new Map<string, MsgLite>();
  for (const row of (msgRows ?? []) as MsgLite[]) {
    if (!latestByMatch.has(row.match_id)) latestByMatch.set(row.match_id, row);
    if (row.sender_id !== user.id && !latestPeerMsgByMatch.has(row.match_id)) {
      latestPeerMsgByMatch.set(row.match_id, row);
    }
  }

  const { data: readRows } = await supabase
    .from("match_message_reads")
    .select("match_id, last_read_at")
    .eq("user_id", user.id)
    .in("match_id", allMatchIds);

  const reads = new Map((readRows ?? []).map((r) => [r.match_id as string, r.last_read_at as string]));

  const threads: MessengerThreadDTO[] = [];

  for (const [peerId, peerMatches] of grouped.entries()) {
    const matchIds = peerMatches.map((m) => m.id);
    const sendOnMatchId = peerMatches[0]?.id ?? "";
    const prof = profMap.get(peerId);

    let lastActivity = 0;
    let lastPreview: string | null = null;
    for (const mid of matchIds) {
      const lm = latestByMatch.get(mid);
      if (lm) {
        const t = new Date(lm.created_at).getTime();
        if (t > lastActivity) {
          lastActivity = t;
          lastPreview = truncate(lm.content, 72);
        }
      }
    }
    for (const m of peerMatches) {
      const t = new Date(m.created_at).getTime();
      if (t > lastActivity) lastActivity = t;
    }

    let unread = false;
    for (const mid of matchIds) {
      if (matchHasUnread(user.id, mid, latestPeerMsgByMatch, reads)) {
        unread = true;
        break;
      }
    }

    const matchedIntentTitle = await resolveMatchedIntentTitle(supabase, peerMatches, user.id);

    threads.push({
      peerId,
      matchIds,
      sendOnMatchId,
      peerDisplayName: prof?.display_name ?? null,
      peerIndustry: prof?.industry ?? null,
      peerAvatarUrl: prof?.avatar_url ?? null,
      lastMessagePreview: lastPreview,
      lastActivityAt: new Date(lastActivity || Date.now()).toISOString(),
      unread,
      matchedIntentTitle,
    });
  }

  threads.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  return { threads };
}

export async function getMessengerUnreadThreadCount(): Promise<number | { error: string }> {
  const res = await listMessengerThreads();
  if ("error" in res) return res;
  return res.threads.filter((t) => t.unread).length;
}

export async function markMessengerMatchesRead(matchIds: string[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const ids = [...new Set(matchIds)].filter(Boolean);
  if (ids.length === 0) return { ok: true };

  const now = new Date().toISOString();
  const rows = ids.map((match_id) => ({ match_id, user_id: user.id, last_read_at: now }));

  const { error } = await supabase.from("match_message_reads").upsert(rows, {
    onConflict: "match_id,user_id",
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/messages");
  return { ok: true };
}
