"use server";

import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-emails";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AiRecommendationSource = "sync_top3" | "background_supply";

export type ImmediateRecommendationInput = {
  owner_user_id: string;
  match_score: number;
  compatibility_reason: string;
};

export type AiRecommendationListItem = {
  id: string;
  intent_id: string;
  candidate_profile_id: string;
  score: number;
  reason: string | null;
  email_sent: boolean;
  created_at: string;
  dismissed_at: string | null;
  source: AiRecommendationSource;
  intent_preview: string;
  peer_display_name: string | null;
  peer_bio: string | null;
  peer_gender: string | null;
  peer_age_group: string | null;
  peer_skills_tags: string[] | null;
  peer_languages: string[] | null;
  peer_location: string | null;
  peer_industry: string | null;
  peer_superpower: string | null;
  peer_linked_intent_id: string | null;
};

/** Persist top hybrid suggestions so digest + Manage can reload without re-running LLM. */
export async function recordImmediateHybridRecommendations(
  intentId: string,
  suggestions: ImmediateRecommendationInput[],
): Promise<void> {
  const top = suggestions.slice(0, 3);
  if (top.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  for (const card of top) {
    if (!card.owner_user_id || card.owner_user_id === user.id) continue;

    const payload = {
      intent_id: intentId,
      candidate_profile_id: card.owner_user_id,
      score: Math.min(100, Math.max(0, Math.round(card.match_score))),
      reason: card.compatibility_reason ?? null,
      email_sent: false,
      source: "sync_top3" as const,
      dismissed_at: null as string | null,
    };

    const { error: insErr } = await supabase.from("ai_recommendations").insert(payload);
    if (insErr?.code === "23505") {
      await supabase
        .from("ai_recommendations")
        .update({
          score: payload.score,
          reason: payload.reason,
          source: payload.source,
        })
        .eq("intent_id", intentId)
        .eq("candidate_profile_id", card.owner_user_id);
    }
  }

  revalidatePath("/console");
}

export async function listMyAiRecommendations(): Promise<
  { ok: true; rows: AiRecommendationListItem[] } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: recRows, error: rErr } = await supabase
    .from("ai_recommendations")
    .select(
      "id, intent_id, candidate_profile_id, score, reason, email_sent, created_at, dismissed_at, source",
    )
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (rErr) return { ok: false, message: rErr.message };

  const rows = recRows ?? [];
  const intentIds = [...new Set(rows.map((r) => r.intent_id))];
  const candIds = [...new Set(rows.map((r) => r.candidate_profile_id))];

  const [{ data: intents }, { data: profiles }] = await Promise.all([
    intentIds.length
      ? supabase.from("intent_requests").select("id, natural_language_input").in("id", intentIds).eq("user_id", user.id)
      : Promise.resolve({ data: [] as { id: string; natural_language_input: string }[] }),
    candIds.length
      ? supabase
          .from("profiles")
          .select(
            "user_id, display_name, bio, gender, age_group, skills_tags, languages, location, industry, superpower",
          )
          .in("user_id", candIds)
      : Promise.resolve({
          data: [] as {
            user_id: string;
            display_name: string | null;
            bio: string | null;
            gender: string | null;
            age_group: string | null;
            skills_tags: string[] | null;
            languages: string[] | null;
            location: string | null;
            industry: string | null;
            superpower: string | null;
          }[],
        }),
  ]);

  const intentMine = new Set((intents ?? []).map((i) => i.id));
  const intentText = new Map((intents ?? []).map((i) => [i.id, i.natural_language_input]));
  const profByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const { data: candIntents } =
    candIds.length > 0
      ? await supabase
          .from("intent_requests")
          .select("id, user_id, updated_at")
          .in("user_id", candIds)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
      : { data: [] as { id: string; user_id: string; updated_at: string }[] };

  const linkedIntentByUser = new Map<string, string>();
  for (const row of [...(candIntents ?? [])].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )) {
    if (!linkedIntentByUser.has(row.user_id)) linkedIntentByUser.set(row.user_id, row.id);
  }

  const out: AiRecommendationListItem[] = [];
  for (const r of rows) {
    if (!intentMine.has(r.intent_id)) continue;
    const p = profByUser.get(r.candidate_profile_id);
    out.push({
      id: r.id,
      intent_id: r.intent_id,
      candidate_profile_id: r.candidate_profile_id,
      score: r.score,
      reason: r.reason,
      email_sent: r.email_sent,
      created_at: r.created_at,
      dismissed_at: r.dismissed_at,
      source: (r.source as AiRecommendationSource) ?? "sync_top3",
      intent_preview: intentText.get(r.intent_id)?.slice(0, 280) ?? "",
      peer_display_name: p?.display_name ?? null,
      peer_bio: p?.bio ?? null,
      peer_gender: p?.gender ?? null,
      peer_age_group: p?.age_group ?? null,
      peer_skills_tags: p?.skills_tags ?? null,
      peer_languages: p?.languages ?? null,
      peer_location: p?.location ?? null,
      peer_industry: p?.industry ?? null,
      peer_superpower: p?.superpower ?? null,
      peer_linked_intent_id: linkedIntentByUser.get(r.candidate_profile_id) ?? null,
    });
  }

  out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { ok: true, rows: out };
}

export async function dismissAiRecommendation(
  recommendationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: rec, error: fErr } = await supabase
    .from("ai_recommendations")
    .select("id, intent_id")
    .eq("id", recommendationId)
    .maybeSingle();
  if (fErr || !rec) return { ok: false, message: fErr?.message ?? "Not found" };

  const { data: intent } = await supabase
    .from("intent_requests")
    .select("user_id")
    .eq("id", rec.intent_id)
    .maybeSingle();
  if (!intent || intent.user_id !== user.id) return { ok: false, message: "Forbidden" };

  const { error: uErr } = await supabase
    .from("ai_recommendations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", recommendationId);

  if (uErr) return { ok: false, message: uErr.message };
  revalidatePath("/console");
  return { ok: true };
}

/**
 * After profile/supply embedding refresh: enqueue high-signal demand intents for other users.
 * Service-role only for cross-user inserts.
 */
export async function generateBackgroundMatchesForProfileUser(profileUserId: string): Promise<void> {
  let svc;
  try {
    svc = createServiceRoleClient();
  } catch {
    return;
  }

  const { data: matches, error: rpcErr } = await svc.rpc("match_active_intents_for_supply", {
    p_supply_user_id: profileUserId,
    p_min_score: 80,
    p_limit: 200,
  });

  if (rpcErr || !matches?.length) return;

  const REASON =
    "Automated embedding match (profile updated). Open Manage to review fit — this is not an LLM-written bio.";

  type RpcRow = { intent_id: string; intent_owner_id: string; score: number };
  const rows = matches as RpcRow[];

  for (const row of rows) {
    if (row.intent_owner_id === profileUserId) continue;
    const payload = {
      intent_id: row.intent_id,
      candidate_profile_id: profileUserId,
      score: Math.min(100, Math.max(0, Math.round(Number(row.score)))),
      reason: REASON,
      email_sent: false,
      source: "background_supply" as const,
    };
    const { error: insErr } = await svc.from("ai_recommendations").insert(payload);
    if (insErr?.code === "23505") {
      await svc
        .from("ai_recommendations")
        .update({ score: payload.score, reason: payload.reason, source: payload.source })
        .eq("intent_id", row.intent_id)
        .eq("candidate_profile_id", profileUserId);
    }
  }

  revalidatePath("/console");
}

export type AdminEmailLogRow = {
  id: string;
  run_date: string;
  total_emails_sent: number;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string;
};

export async function adminListEmailLogs(): Promise<
  { ok: true; rows: AdminEmailLogRow[]; unsentRecommendationCount: number } | { ok: false; message: string }
> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, message: "Forbidden" };
  }

  try {
    const svc = createServiceRoleClient();
    const [{ data: logs, error: lErr }, { count, error: cErr }] = await Promise.all([
      svc.from("admin_email_logs").select("*").order("created_at", { ascending: false }).limit(200),
      svc
        .from("ai_recommendations")
        .select("*", { head: true, count: "exact" })
        .eq("email_sent", false)
        .is("dismissed_at", null),
    ]);

    if (lErr) return { ok: false, message: lErr.message };
    if (cErr) return { ok: false, message: cErr.message };

    return {
      ok: true,
      rows: (logs ?? []) as AdminEmailLogRow[],
      unsentRecommendationCount: count ?? 0,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Service role unavailable.",
    };
  }
}
