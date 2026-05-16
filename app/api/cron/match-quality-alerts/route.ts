import { NextResponse } from "next/server";
import { maxHybridMatchScoreForIntent } from "@/lib/evaluate-match-quality";
import { hasBlockingMatchBetween } from "@/lib/match-blocking";
import { sendHighMatchAlertEmail } from "@/lib/resend-match-alert";
import { getSiteOrigin } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseThreshold(): number {
  const raw = process.env.MATCH_QUALITY_ALERT_MIN_SCORE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 80;
  return Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 80;
}

function parseBatch(): number {
  const raw = process.env.MATCH_QUALITY_ALERT_BATCH_SIZE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 25;
  return Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 25;
}

/** Vercel Cron or manual call with Authorization: Bearer CRON_SECRET */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY and RESEND_FROM_EMAIL must be set to send alerts." },
      { status: 503 },
    );
  }

  const threshold = parseThreshold();
  const batch = parseBatch();
  const origin = getSiteOrigin(request);

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role client failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }

  const { data: candidates, error: candErr } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("match_quality_alert_sent", false)
    .limit(batch);

  if (candErr) {
    return NextResponse.json({ ok: false, error: candErr.message }, { status: 500 });
  }

  const summary = {
    scanned: 0,
    skippedNoUser: 0,
    skippedNotComplete: 0,
    skippedNoEmail: 0,
    skippedNoIntent: 0,
    skippedEval: 0,
    skippedBelowThreshold: 0,
    skippedAlreadyConnected: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  for (const row of candidates ?? []) {
    const userId = row.user_id as string;
    summary.scanned += 1;

    const { data: userRow } = await supabase
      .from("users")
      .select("email, onboarding_status")
      .eq("id", userId)
      .maybeSingle();

    if (!userRow) {
      summary.skippedNoUser += 1;
      continue;
    }
    if (userRow.onboarding_status !== "complete") {
      summary.skippedNotComplete += 1;
      continue;
    }
    const email = userRow.email?.trim();
    if (!email) {
      summary.skippedNoEmail += 1;
      continue;
    }

    const { data: intent } = await supabase
      .from("intent_requests")
      .select("id, user_id, natural_language_input, location_filter, embedding")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("embedding", "is", null)
      .not("location_filter", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!intent) {
      summary.skippedNoIntent += 1;
      continue;
    }

    const evalResult = await maxHybridMatchScoreForIntent(supabase, intent);
    if (!evalResult.ok) {
      summary.skippedEval += 1;
      continue;
    }

    if (evalResult.maxScore < threshold) {
      summary.skippedBelowThreshold += 1;
      continue;
    }

    if (
      evalResult.topPeerUserId &&
      (await hasBlockingMatchBetween(supabase, userId, evalResult.topPeerUserId))
    ) {
      summary.skippedAlreadyConnected += 1;
      continue;
    }

    const sendResult = await sendHighMatchAlertEmail({
      to: email,
      origin,
      bestScore: evalResult.maxScore,
    });

    if (!sendResult.ok) {
      summary.errors.push(`${userId}: ${sendResult.error}`);
      continue;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ match_quality_alert_sent: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("match_quality_alert_sent", false);

    if (updErr) {
      summary.errors.push(`${userId}: flag update failed — ${updErr.message}`);
      continue;
    }

    summary.emailsSent += 1;
  }

  return NextResponse.json({
    ok: true,
    threshold,
    batchSize: batch,
    summary,
    timestamp: new Date().toISOString(),
  });
}
