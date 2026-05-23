import { Resend } from "resend";

import { RESEND_SIMPLE_FROM } from "@/lib/resend-simple-from";

/** @deprecated alias — prefer {@link RESEND_SIMPLE_FROM}. */
export const DEFAULT_CONTACT_RESEND_FROM = RESEND_SIMPLE_FROM;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ContactSupportSendFailure =
  | { fault: "configuration"; detail: string }
  | { fault: "provider"; detail: string };

/** Sends inbound contact form mail to support; Reply-To is the visitor so you can answer directly. */
export async function sendContactSupportEmail(params: {
  supportTo: string;
  replyTo: string;
  subject: string;
  message: string;
  name?: string;
}): Promise<{ ok: true } | { ok: false; failure: ContactSupportSendFailure }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  /** Simplest reliable path per Resend docs: onboarding sender + API key only. */
  const from = RESEND_SIMPLE_FROM;
  if (!key) {
    return {
      ok: false,
      failure: {
        fault: "configuration",
        detail: "RESEND_API_KEY must be set for the contact form.",
      },
    };
  }

  const safeSubject = params.subject.trim().slice(0, 200);
  const safeMsg = params.message.trim();
  const safeName = params.name?.trim() ?? "";

  const textLines = [
    "New message from vennode.com contact form",
    "",
    safeName ? `Name: ${safeName}` : "Name: (not provided)",
    `Reply-To: ${params.replyTo}`,
    `Subject: ${safeSubject}`,
    "",
    safeMsg,
  ];

  const html = `
    <p><strong>Vennode contact form</strong></p>
    ${safeName ? `<p><strong>Name:</strong> ${escapeHtml(safeName)}</p>` : ""}
    <p><strong>From:</strong> ${escapeHtml(params.replyTo)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
    <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:14px;">${escapeHtml(safeMsg)}</pre>
  `.trim();

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: params.supportTo,
      replyTo: params.replyTo,
      subject: `[Vennode Contact] ${safeSubject}`,
      text: textLines.join("\n"),
      html,
    });

    if (error) {
      return {
        ok: false,
        failure: { fault: "provider", detail: error.message },
      };
    }
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, failure: { fault: "provider", detail } };
  }
}
