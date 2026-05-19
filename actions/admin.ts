"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-emails";
import { DUPLICATE_MATCH_MESSAGE, hasBlockingMatchBetween } from "@/lib/match-blocking";
import { logPairingScoreEvent } from "@/lib/pairing-score-log";

export type AdminUserRow = {
  id: string;
  email: string | null;
  onboarding_status: string;
  created_at: string;
};

export type AdminIntentRow = {
  id: string;
  user_id: string;
  natural_language_input: string;
  location_filter: string | null;
  status: string;
  is_marketplace_public: boolean;
  created_at: string;
  profile_display_name: string | null;
  profile_location: string | null;
  profile_industry: string | null;
  profile_superpower: string | null;
};

export type AdminMatchTrackerRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_email: string | null;
  receiver_email: string | null;
  status: string;
  intent_request_id: string | null;
  counterparty_intent_id: string | null;
  match_type: string;
  created_at: string;
};

export type AdminPairingScoreRow = {
  id: string;
  created_at: string;
  source: string;
  actor_user_id: string | null;
  anchor_intent_id: string | null;
  candidate_intent_id: string | null;
  candidate_user_id: string | null;
  similarity: number | null;
  rpc_threshold: number | null;
  rank_after_sort: number | null;
  selected_top: boolean | null;
  match_score: number | null;
  compatibility_reason: string | null;
  excluded_reason: string | null;
  meta: Record<string, unknown>;
};

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function adminListDirectory(): Promise<
  | { ok: true; users: AdminUserRow[]; intents: AdminIntentRow[] }
  | { ok: false; message: string }
> {
  try {
    await assertAdmin();
    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      return {
        ok: false,
        message:
          "Missing SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel env (server-only, never NEXT_PUBLIC).",
      };
    }

    const { data: users, error: uErr } = await svc
      .from("users")
      .select("id, email, onboarding_status, created_at")
      .order("created_at", { ascending: false });

    if (uErr) return { ok: false, message: uErr.message };

    const { data: intentsRaw, error: iErr } = await svc
      .from("intent_requests")
      .select("id, user_id, natural_language_input, location_filter, status, is_marketplace_public, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (iErr) return { ok: false, message: iErr.message };

    const userIds = [...new Set((intentsRaw ?? []).map((i) => i.user_id))];
    const { data: profiles } =
      userIds.length > 0
        ? await svc.from("profiles").select("user_id, display_name, location, industry, superpower").in("user_id", userIds)
        : { data: [] as { user_id: string; display_name: string | null; location: string | null; industry: string | null; superpower: string | null }[] };

    const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const intents: AdminIntentRow[] = (intentsRaw ?? []).map((i) => {
      const p = profileByUser.get(i.user_id);
      return {
        ...i,
        profile_display_name: p?.display_name ?? null,
        profile_location: p?.location ?? null,
        profile_industry: p?.industry ?? null,
        profile_superpower: p?.superpower ?? null,
      };
    });

    return {
      ok: true,
      users: (users ?? []) as AdminUserRow[],
      intents,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return { ok: false, message: msg };
  }
}

export async function adminListMatchTracker(): Promise<
  { ok: true; matches: AdminMatchTrackerRow[] } | { ok: false; message: string }
> {
  try {
    await assertAdmin();
    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY." };
    }

    const { data: rows, error } = await svc
      .from("matches")
      .select("id, sender_id, receiver_id, status, intent_request_id, counterparty_intent_id, created_at")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    const ids = [...new Set((rows ?? []).flatMap((r) => [r.sender_id, r.receiver_id]))];
    const { data: usersRows } =
      ids.length > 0 ? await svc.from("users").select("id, email").in("id", ids) : { data: [] as { id: string; email: string | null }[] };

    const emailById = new Map((usersRows ?? []).map((u) => [u.id, u.email]));

    const matches: AdminMatchTrackerRow[] = (rows ?? []).map((r) => ({
      id: r.id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      sender_email: emailById.get(r.sender_id) ?? null,
      receiver_email: emailById.get(r.receiver_id) ?? null,
      status: r.status,
      intent_request_id: r.intent_request_id,
      counterparty_intent_id: r.counterparty_intent_id,
      match_type: r.status === "Pending_System" ? "System (admin)" : r.status === "Pending" ? "User request" : r.status,
      created_at: r.created_at,
    }));

    return { ok: true, matches };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return { ok: false, message: msg };
  }
}

export async function adminListPairingScoreLogs(): Promise<
  { ok: true; rows: AdminPairingScoreRow[] } | { ok: false; message: string }
> {
  try {
    await assertAdmin();
    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY." };
    }

    const { data, error } = await svc
      .from("pairing_score_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return { ok: false, message: error.message };

    const rows: AdminPairingScoreRow[] = (data ?? []).map((r) => ({
      id: r.id as string,
      created_at: r.created_at as string,
      source: r.source as string,
      actor_user_id: (r.actor_user_id as string | null) ?? null,
      anchor_intent_id: (r.anchor_intent_id as string | null) ?? null,
      candidate_intent_id: (r.candidate_intent_id as string | null) ?? null,
      candidate_user_id: (r.candidate_user_id as string | null) ?? null,
      similarity: r.similarity != null ? Number(r.similarity) : null,
      rpc_threshold: r.rpc_threshold != null ? Number(r.rpc_threshold) : null,
      rank_after_sort: (r.rank_after_sort as number | null) ?? null,
      selected_top: (r.selected_top as boolean | null) ?? null,
      match_score: r.match_score != null ? Number(r.match_score) : null,
      compatibility_reason: (r.compatibility_reason as string | null) ?? null,
      excluded_reason: (r.excluded_reason as string | null) ?? null,
      meta:
        typeof r.meta === "object" && r.meta !== null && !Array.isArray(r.meta)
          ? (r.meta as Record<string, unknown>)
          : {},
    }));

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return { ok: false, message: msg };
  }
}

export async function adminForceSystemMatch(params: { intentAId: string; intentBId: string }): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    await assertAdmin();
    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY." };
    }

    const { intentAId, intentBId } = params;
    if (intentAId === intentBId) {
      return { ok: false, message: "Pick two different intents." };
    }

    const { data: rows, error: fetchErr } = await svc
      .from("intent_requests")
      .select("id, user_id")
      .in("id", [intentAId, intentBId])
      .eq("status", "active");

    if (fetchErr || !rows || rows.length !== 2) {
      return { ok: false, message: fetchErr?.message ?? "Could not load both intents." };
    }

    const a = rows.find((r) => r.id === intentAId);
    const b = rows.find((r) => r.id === intentBId);
    if (!a || !b || a.user_id === b.user_id) {
      return { ok: false, message: "Intents must belong to two different users." };
    }

    if (await hasBlockingMatchBetween(svc, a.user_id, b.user_id)) {
      return { ok: false, message: DUPLICATE_MATCH_MESSAGE };
    }

    const { error: insErr } = await svc.from("matches").insert({
      sender_id: a.user_id,
      receiver_id: b.user_id,
      intent_request_id: intentBId,
      counterparty_intent_id: intentAId,
      status: "Pending_System",
      introductory_context:
        "Curated introduction — Vennode matched your intents. Review both statements and accept if you want to connect.",
      compatibility_reason: null,
      ai_context_sender: {
        preview_kind: "system_match_v1",
        body:
          "Vennode linked two active intents for admin cold-start review. This notice describes the workflow — it is not generated from either member’s profile fields.",
      },
      system_ack_sender: false,
      system_ack_receiver: false,
    });

    if (insErr) return { ok: false, message: insErr.message };

    await logPairingScoreEvent({
      source: "admin_system_match",
      actor_user_id: null,
      anchor_intent_id: intentAId,
      candidate_intent_id: intentBId,
      candidate_user_id: b.user_id,
      similarity: null,
      rpc_threshold: null,
      rank_after_sort: null,
      selected_top: true,
      match_score: null,
      compatibility_reason: null,
      excluded_reason: null,
      meta: { receiver_user_id: b.user_id },
    });

    revalidatePath("/console");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return { ok: false, message: msg };
  }
}
