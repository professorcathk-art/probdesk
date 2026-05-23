import { NextResponse } from "next/server";
import { getMobileAuthorizedClient } from "@/lib/mobile/bearer-auth";
import { createConsoleIntentForMobile } from "@/lib/mobile/create-console-intent-for-mobile";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/** GET: active intents for the authenticated user. */
export async function GET(request: Request) {
  const auth = await getMobileAuthorizedClient(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("intent_requests")
    .select(
      "id, natural_language_input, location_filter, status, is_marketplace_public, extracted_persona, must_haves",
    )
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, intents: data ?? [] });
}

/** POST: create intent (parity with console create; Bearer session). Body: `{ natural_language_input, location_filter?, must_haves? }` */
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

  const b = body as Record<string, unknown>;
  const natural_language_input =
    typeof b["natural_language_input"] === "string" ? (b["natural_language_input"] as string) : null;

  if (!natural_language_input?.trim()) {
    return NextResponse.json(
      { ok: false, error: "natural_language_input (string) is required" },
      { status: 400 },
    );
  }

  const location_filter =
    b["location_filter"] === undefined || b["location_filter"] === null
      ? undefined
      : typeof b["location_filter"] === "string"
        ? (b["location_filter"] as string)
        : null;

  if (location_filter === null) {
    return NextResponse.json({ ok: false, error: "location_filter must be a string if provided" }, { status: 400 });
  }

  const must_haves =
    b["must_haves"] === undefined || b["must_haves"] === null
      ? undefined
      : typeof b["must_haves"] === "string"
        ? (b["must_haves"] as string)
        : null;

  if (must_haves === null && b["must_haves"] !== undefined && b["must_haves"] !== null) {
    return NextResponse.json({ ok: false, error: "must_haves must be a string if provided" }, { status: 400 });
  }

  const res = await createConsoleIntentForMobile(auth.supabase, auth.user, {
    naturalLanguageInput: natural_language_input,
    locationFilterInput: location_filter,
    mustHavesInput: must_haves,
  });

  if (!res.ok) {
    const status = res.code === "MAX_ACTIVE_INTENTS" ? 409 : 400;
    return NextResponse.json(
      { ok: false, error: res.message, ...(res.code ? { code: res.code } : {}) },
      { status },
    );
  }

  return NextResponse.json({ ok: true, intent_id: res.intentId }, { status: 201 });
}
