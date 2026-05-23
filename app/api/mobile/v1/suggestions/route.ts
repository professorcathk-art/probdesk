import { NextResponse } from "next/server";
import { getMobileAuthorizedClient } from "@/lib/mobile/bearer-auth";
import { runHybridSuggestionsForMobile } from "@/lib/mobile/run-hybrid-suggestions";

export const dynamic = "force-dynamic";

const INTENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/** POST hybrid AI suggestions. Body: `{ intent_id }` — must belong to caller. */
export async function POST(request: Request) {
  const auth = await getMobileAuthorizedClient(request);
  if (!auth) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Expected JSON object body" }, { status: 400 });
  }

  const intent_id =
    typeof (body as Record<string, unknown>)["intent_id"] === "string"
      ? String((body as Record<string, unknown>)["intent_id"]).trim()
      : null;

  if (!intent_id || !INTENT_UUID_RE.test(intent_id)) {
    return NextResponse.json({ ok: false, error: "intent_id must be a valid UUID" }, { status: 400 });
  }

  const out = await runHybridSuggestionsForMobile(auth.supabase, auth.user, intent_id);

  if (!out.ok) {
    return NextResponse.json({ ok: false, error: out.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, suggestions: out.suggestions });
}
