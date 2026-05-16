import { NextResponse } from "next/server";
import { sendContactSupportEmail } from "@/lib/resend-contact-support";

export const runtime = "nodejs";

const DEFAULT_SUPPORT_EMAIL = "professor.cat.hk@gmail.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: string;
  name?: string;
  subject?: string;
  message?: string;
  /** Honeypot — bots fill this; humans leave blank */
  website?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!EMAIL_RE.test(email) || subject.length < 2 || message.length < 20 || message.length > 8000) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const supportTo =
    process.env["CONTACT_SUPPORT_EMAIL"]?.trim().replace(/^mailto:/i, "") || DEFAULT_SUPPORT_EMAIL;

  const result = await sendContactSupportEmail({
    supportTo,
    replyTo: email,
    subject,
    message,
    name: name || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "send_failed", detail: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
