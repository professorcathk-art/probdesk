import { Resend } from "resend";

export async function sendHighMatchAlertEmail(params: {
  to: string;
  origin: string;
  bestScore: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) {
    return { ok: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not set." };
  }

  const resend = new Resend(key);
  const link = `${params.origin.replace(/\/+$/, "")}/console`;

  const subject = `Vennode: Strong new match potential (${params.bestScore}/100)`;

  const text = [
    `We found at least one highly compatible introduction opportunity for you (score ${params.bestScore}/100).`,
    "",
    `Open Manage to review suggestions and send an invite:`,
    link,
    "",
    "You’re receiving this because you enabled discovery on Vennode. This is a one-time heads-up — we won’t send this notice again.",
  ].join("\n");

  const html = `
    <p>We found at least one highly compatible introduction opportunity for you (<strong>${params.bestScore}/100</strong>).</p>
    <p><a href="${link}">Open Manage</a> to review suggestions and send an invite.</p>
    <p style="color:#64748b;font-size:13px;margin-top:24px;">This is a one-time email — we won’t send this notice again.</p>
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
