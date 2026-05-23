import { NextResponse } from "next/server";
import { sendDailyDigestEmail } from "@/lib/resend-daily-digest";
import { getSiteOrigin } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Lightweight digest: no LLM — emails intent owners about queued `ai_recommendations`. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY must be set to send digests (standard Resend onboarding sender)." },
      { status: 503 },
    );
  }

  let svc;
  try {
    svc = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role client failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }

  const origin = getSiteOrigin(request);
  const runDate = new Date().toISOString().slice(0, 10);

  const { data: rows, error: qErr } = await svc
    .from("ai_recommendations")
    .select("id, intent_id")
    .eq("email_sent", false)
    .is("dismissed_at", null);

  if (qErr) {
    await svc.from("admin_email_logs").insert({
      run_date: runDate,
      total_emails_sent: 0,
      status: "failed",
      error_message: qErr.message,
    });
    return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
  }

  const pending = rows ?? [];
  if (pending.length === 0) {
    await svc.from("admin_email_logs").insert({
      run_date: runDate,
      total_emails_sent: 0,
      status: "success",
      error_message: null,
    });
    return NextResponse.json({
      ok: true,
      digestEmailsSent: 0,
      recommendationsMarked: 0,
      message: "No pending recommendations.",
      timestamp: new Date().toISOString(),
    });
  }

  const intentIds = [...new Set(pending.map((r) => r.intent_id as string))];
  const { data: intents, error: iErr } = await svc.from("intent_requests").select("id, user_id").in("id", intentIds);

  if (iErr) {
    await svc.from("admin_email_logs").insert({
      run_date: runDate,
      total_emails_sent: 0,
      status: "failed",
      error_message: iErr.message,
    });
    return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  }

  const intentOwner = new Map((intents ?? []).map((i) => [i.id as string, i.user_id as string]));
  const ownerIds = [...new Set([...intentOwner.values()])];

  const { data: users, error: uErr } = await svc.from("users").select("id, email").in("id", ownerIds);

  if (uErr) {
    await svc.from("admin_email_logs").insert({
      run_date: runDate,
      total_emails_sent: 0,
      status: "failed",
      error_message: uErr.message,
    });
    return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }

  const emailByUser = new Map((users ?? []).map((u) => [u.id as string, (u.email as string | null)?.trim() ?? ""]));

  /** ownerUserId -> { email, recIds[] } */
  const digestByOwner = new Map<string, { email: string; recIds: string[] }>();

  for (const r of pending) {
    const owner = intentOwner.get(r.intent_id as string);
    if (!owner) continue;
    const email = emailByUser.get(owner);
    if (!email) continue;
    const cur = digestByOwner.get(owner) ?? { email, recIds: [] };
    cur.recIds.push(r.id as string);
    digestByOwner.set(owner, cur);
  }

  let emailsSent = 0;
  let recommendationsMarked = 0;
  const errors: string[] = [];

  for (const [, bundle] of digestByOwner) {
    const sendResult = await sendDailyDigestEmail({
      to: bundle.email,
      count: bundle.recIds.length,
      origin,
    });
    if (!sendResult.ok) {
      errors.push(`${bundle.email}: ${sendResult.error}`);
      continue;
    }
    const { error: updErr } = await svc
      .from("ai_recommendations")
      .update({ email_sent: true })
      .in("id", bundle.recIds);
    if (updErr) {
      errors.push(`${bundle.email}: sent but failed to mark rows — ${updErr.message}`);
      continue;
    }
    emailsSent += 1;
    recommendationsMarked += bundle.recIds.length;
  }

  const logStatus = errors.length === 0 ? "success" : emailsSent === 0 ? "failed" : "success";
  const logMsg = errors.length ? errors.join(" | ") : null;

  await svc.from("admin_email_logs").insert({
    run_date: runDate,
    total_emails_sent: emailsSent,
    status: logStatus,
    error_message: logMsg,
  });

  return NextResponse.json({
    ok: errors.length === 0 || emailsSent > 0,
    digestEmailsSent: emailsSent,
    recommendationsMarked,
    pendingRows: pending.length,
    errors: errors.length ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
