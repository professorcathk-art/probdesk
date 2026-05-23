import { NextResponse } from "next/server";
import { getMobileAuthorizedClient } from "@/lib/mobile/bearer-auth";
import { fetchBlendedExploreFeedForMobile } from "@/lib/mobile/explore-feed";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * GET blended Explore feed (`get_blended_explore_intents` + identity chips).
 * Query: `guest_preview=1` or `preview=1` for 20+probe layout (parity with signed-out web preview sizing).
 */
export async function GET(request: Request) {
  const auth = await getMobileAuthorizedClient(request);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const guestPreview =
    url.searchParams.get("guest_preview") === "1" || url.searchParams.get("preview") === "1";

  const result = await fetchBlendedExploreFeedForMobile(auth.supabase, auth.user.id, {
    guestPreview,
  });

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    listings: result.listings,
    more_available: result.moreAvailable,
  });
}
