import { NextResponse } from "next/server";
import { dismissAiRecommendationWithClient } from "@/lib/dismiss-ai-recommendation-flow";
import { getMobileAuthorizedClient } from "@/lib/mobile/bearer-auth";
import { isAdminEmail } from "@/lib/admin-emails";

export const dynamic = "force-dynamic";

/** Dismiss AI suggestion row (same semantics as Manage web «移除»: optional Pending invite withdraw). */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getMobileAuthorizedClient(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rid = id?.trim();
  if (!rid) {
    return NextResponse.json({ ok: false, error: "Missing recommendation id" }, { status: 400 });
  }

  const res = await dismissAiRecommendationWithClient(auth.supabase, {
    recommendationId: rid,
    actorUserId: auth.user.id,
    refundInviteCredits: !isAdminEmail(auth.user.email ?? undefined),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, withdrawn_match_ids: res.withdrawn_match_ids });
}
