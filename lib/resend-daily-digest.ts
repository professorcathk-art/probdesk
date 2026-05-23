import { Resend } from "resend";

import { RESEND_SIMPLE_FROM } from "@/lib/resend-simple-from";

export async function sendDailyDigestEmail(params: {
  to: string;
  count: number;
  origin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not set." };
  }

  const resend = new Resend(key);
  const link = `${params.origin.replace(/\/+$/, "")}/console?tab=requests`;
  const queued = params.count;

  const subject = "Vennode: activity in Manage";

  const text = [
    "You have new activity waiting in your Vennode Manage portal (new matches or suggestions to review).",
    "",
    `Queued items awaiting your review today: ${queued}.`,
    "",
    "Open Manage:",
    link,
    "",
    "This is an automated notice; we do not include message or match details in email.",
  ].join("\n");

  const html = `
    <p>You have <strong>new activity</strong> waiting in Vennode <strong>Manage</strong>.</p>
    <p style="margin:12px 0;">Queued suggestions for you today: <strong>${queued}</strong>.</p>
    <p><a href="${link}">Open Manage</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">Automated notice — no match or message details included.</p>
  `.trim();

  const { error } = await resend.emails.send({
    from: RESEND_SIMPLE_FROM,
    to: params.to,
    subject,
    text,
    html,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
