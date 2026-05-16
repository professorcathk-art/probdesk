import { NextResponse } from "next/server";

/** Lightweight probe for uptime monitors & deploy verification */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vennode",
    timestamp: new Date().toISOString(),
  });
}
