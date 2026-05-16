"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-emails";

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

    const { data: intents, error: iErr } = await svc
      .from("intent_requests")
      .select("id, user_id, natural_language_input, location_filter, status, is_marketplace_public, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (iErr) return { ok: false, message: iErr.message };

    return {
      ok: true,
      users: (users ?? []) as AdminUserRow[],
      intents: (intents ?? []) as AdminIntentRow[],
    };
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

    const { error: insErr } = await svc.from("matches").insert({
      sender_id: a.user_id,
      receiver_id: b.user_id,
      intent_request_id: intentBId,
      counterparty_intent_id: intentAId,
      status: "Pending_System",
      introductory_context:
        "Curated introduction — Probdesk matched your intents. Review both statements and accept if you want to connect.",
      compatibility_reason: "Manual system match (admin cold-start).",
      ai_context_sender: {
        headline: "System-curated pairing",
        summary: "Both intents were selected for mutual review.",
        signals: ["Admin introduction", "Cold-start programme"],
      },
      system_ack_sender: false,
      system_ack_receiver: false,
    });

    if (insErr) return { ok: false, message: insErr.message };
    revalidatePath("/console");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return { ok: false, message: msg };
  }
}
