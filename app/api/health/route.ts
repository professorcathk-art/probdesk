import { NextResponse } from "next/server";

/** Lightweight probe for uptime monitors & deploy verification */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "probdesk",
    timestamp: new Date().toISOString(),
  });
}
