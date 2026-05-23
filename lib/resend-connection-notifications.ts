import { Resend } from "resend";

import { RESEND_SIMPLE_FROM } from "@/lib/resend-simple-from";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizedOrigin(origin: string): string {
  return origin.replace(/\/+$/, "") || origin;
}

function isPlausibleEmail(s: string | null | undefined): s is string {
  if (!s?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

async function lookupUserEmail(userId: string): Promise<string | null> {
  try {
    const svc = createServiceRoleClient();
    const { data } = await svc.from("users").select("email").eq("id", userId).maybeSingle();
    const e = (data?.email as string | null) ?? null;
    return isPlausibleEmail(e) ? e.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Sends when someone receives a Pending connection request (inbound invites).
 */
export async function sendNewConnectionRequestEmail(params: {
  to: string;
  siteOrigin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };

  const origin = normalizedOrigin(params.siteOrigin);
  const link = `${origin}/manage/invitations`;

  const subject = "Vennode: New connection request";
  const text = [
    "You have a new connection request on Vennode.",
    "",
    "Review it in Manage → Invitations (no invitation details are included in this email):",
    link,
  ].join("\n");

  const html = `
    <p>You have a <strong>new connection request</strong> on Vennode.</p>
    <p><a href="${escapeHtml(link)}">Open Manage → Invitations</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">We do not include invitation details in email — open Vennode to review.</p>
  `.trim();

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: RESEND_SIMPLE_FROM,
      to: params.to.trim(),
      subject,
      text,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: detail };
  }
}

/** After the inbound member accepts — notify the sender. */
export async function sendConnectionAcceptedForSenderEmail(params: {
  to: string;
  siteOrigin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };

  const origin = normalizedOrigin(params.siteOrigin);
  const link = `${origin}/messages`;

  const subject = "Vennode: Connection request accepted";
  const text = [
    "Your connection request was accepted on Vennode.",
    "",
    "Open Messages to continue:",
    link,
  ].join("\n");

  const html = `
    <p>Your <strong>connection request was accepted</strong>.</p>
    <p><a href="${escapeHtml(link)}">Open Messages</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">Message content stays in Vennode.</p>
  `.trim();

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: RESEND_SIMPLE_FROM,
      to: params.to.trim(),
      subject,
      text,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: detail };
  }
}

/** When both parties complete a Pending_System handshake — notify each member once. */
export async function sendConnectionEstablishedEmail(params: {
  to: string;
  siteOrigin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };

  const origin = normalizedOrigin(params.siteOrigin);
  const link = `${origin}/messages`;

  const subject = "Vennode: You're connected";
  const text = [
    "You've established a mutual connection on Vennode.",
    "",
    "Open Messages:",
    link,
  ].join("\n");

  const html = `
    <p>You&rsquo;re <strong>mutually connected</strong> — you can continue in Messages.</p>
    <p><a href="${escapeHtml(link)}">Open Messages</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">Message content stays in Vennode.</p>
  `.trim();

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: RESEND_SIMPLE_FROM,
      to: params.to.trim(),
      subject,
      text,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: detail };
  }
}

/** Admin-curated system match intro — notify both intent owners (Pending_System). */
export async function sendCuratedIntroductionEmail(params: {
  to: string;
  siteOrigin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };

  const origin = normalizedOrigin(params.siteOrigin);
  const link = `${origin}/manage/invitations`;

  const subject = "Vennode: New curated introduction";
  const text = [
    "There is a curated introduction for you on Vennode (admin-linked intents).",
    "",
    "Open Manage → Invitations to review:",
    link,
  ].join("\n");

  const html = `
    <p>There is a <strong>curated introduction</strong> waiting for you in Vennode.</p>
    <p><a href="${escapeHtml(link)}">Open Manage → Invitations</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">We do not include match details in email.</p>
  `.trim();

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: RESEND_SIMPLE_FROM,
      to: params.to.trim(),
      subject,
      text,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: detail };
  }
}

export function notifyNewConnectionRequestEmailAsync(receiverUserId: string, siteOrigin: string): void {
  void (async () => {
    const to = await lookupUserEmail(receiverUserId);
    if (!to) return;
    await sendNewConnectionRequestEmail({ to, siteOrigin });
  })().catch(() => undefined);
}

export function notifyCuratedIntroductionEmailsAsync(senderUserId: string, receiverUserId: string, siteOrigin: string): void {
  void (async () => {
    const seen = new Set<string>();
    for (const uid of [senderUserId, receiverUserId]) {
      const to = await lookupUserEmail(uid);
      if (!to || seen.has(to)) continue;
      seen.add(to);
      await sendCuratedIntroductionEmail({ to, siteOrigin });
    }
  })().catch(() => undefined);
}

/** Receiver accepted a normal Pending invite — email the outbound sender only. */
export function notifyOutboundSenderConnectionAcceptedAsync(senderUserId: string, siteOrigin: string): void {
  void (async () => {
    const to = await lookupUserEmail(senderUserId);
    if (!to) return;
    await sendConnectionAcceptedForSenderEmail({ to, siteOrigin });
  })().catch(() => undefined);
}

/** Pending_System moved to Accepted after both acknowledged — notify each participant once per email address. */
export function notifyParticipantsConnectionEstablishedAsync(
  participantAUserId: string,
  participantBUserId: string,
  siteOrigin: string,
): void {
  void (async () => {
    const seen = new Set<string>();
    for (const uid of [participantAUserId, participantBUserId]) {
      const to = await lookupUserEmail(uid);
      if (!to || seen.has(to)) continue;
      seen.add(to);
      await sendConnectionEstablishedEmail({ to, siteOrigin });
    }
  })().catch(() => undefined);
}
