import { Resend } from "resend";

export async function sendDailyDigestEmail(params: {
  to: string;
  count: number;
  origin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) {
    return { ok: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not set." };
  }

  const resend = new Resend(key);
  const link = `${params.origin.replace(/\/+$/, "")}/console?tab=requests`;
  const n = params.count;

  const subject =
    n === 1 ? "Vennode: 1 new AI recommendation today" : `Vennode: ${n} new AI recommendations today`;

  const text = [
    `Good news! You have ${n} new AI recommendation${n === 1 ? "" : "s"} on Vennode today.`,
    "",
    `Log in to Manage (Console) to review them:`,
    link,
    "",
    "You can dismiss suggestions anytime from Manage.",
  ].join("\n");

  const html = `
    <p>Good news! You have <strong>${n}</strong> new AI recommendation${n === 1 ? "" : "s"} on Vennode today.</p>
    <p><a href="${link}">Open Manage</a> to review them.</p>
    <p style="color:#64748b;font-size:13px;margin-top:24px;">You can dismiss suggestions anytime from Manage.</p>
  `.trim();

  const { error } = await resend.emails.send({
    from,
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
