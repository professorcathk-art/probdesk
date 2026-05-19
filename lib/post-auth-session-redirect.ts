import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTRY_COOKIE, getRequestCookie, parseEntryCookie } from "@/lib/entry-cookie";
import { parseRedirectAfterCookie, REDIRECT_AFTER_COOKIE } from "@/lib/redirect-after-login-cookie";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";
import { validateMandatoryProfileCore } from "@/lib/profile-basics";
import { sanitizeInternalRedirect } from "@/lib/sanitize-redirect";

/** Clears short-lived cookies used during OAuth / email sign-in flows. */
export function appendAuthFlowCookieDeletes(res: NextResponse) {
  res.cookies.set(ENTRY_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set(REDIRECT_AFTER_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
}

/**
 * After session is established (OAuth code exchange or email OTP verify), ensure public rows
 * and redirect using the same rules as the OAuth callback (and legacy email redirect flows).
 */
export async function redirectAfterAuthenticatedSession(
  request: Request,
  siteOrigin: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteOrigin}/login?error=no_session`);
  }

  const ensured = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensured.ok) {
    return NextResponse.redirect(`${siteOrigin}/login?error=${encodeURIComponent(ensured.message)}`);
  }

  const { data: row } = await supabase.from("users").select("onboarding_status").eq("id", user.id).single();

  const { data: prof } = await supabase
    .from("profiles")
    .select("display_name, bio, location, industry, skills_tags, languages")
    .eq("user_id", user.id)
    .maybeSingle();

  const coreGate = validateMandatoryProfileCore(prof ?? {});
  const onboardingComplete = row?.onboarding_status === "complete";
  const effectivelyComplete = onboardingComplete || coreGate.ok;

  const entryRaw = getRequestCookie(request, ENTRY_COOKIE);
  const entry = parseEntryCookie(entryRaw);
  const savedRedirect = parseRedirectAfterCookie(getRequestCookie(request, REDIRECT_AFTER_COOKIE));

  const complete = effectivelyComplete;

  function profileGate(pathAfterProfile: string) {
    const safe = sanitizeInternalRedirect(pathAfterProfile) ?? "/console";
    const res = NextResponse.redirect(`${siteOrigin}/profile?required=profile&after=${encodeURIComponent(safe)}`);
    appendAuthFlowCookieDeletes(res);
    return res;
  }

  function redirectOk(destPath: string) {
    const res = NextResponse.redirect(
      `${siteOrigin}${destPath.startsWith("/") ? destPath : `/${destPath}`}`,
    );
    appendAuthFlowCookieDeletes(res);
    return res;
  }

  if (complete) {
    if (entry?.kind === "pending_connect") {
      return redirectOk(`/square?connectTo=${encodeURIComponent(entry.receiverIntentId)}`);
    }
    if (entry?.kind === "start_matching") {
      return redirectOk("/console?cue=openIntentDraft");
    }
    if (entry?.kind === "enter") {
      return redirectOk("/console?cue=pulseCreateIntent");
    }
    if (savedRedirect) {
      return redirectOk(savedRedirect);
    }
    return redirectOk("/console");
  }

  if (entry?.kind === "pending_connect") {
    return profileGate(`/square?connectTo=${encodeURIComponent(entry.receiverIntentId)}`);
  }
  if (entry?.kind === "start_matching") {
    return profileGate("/console?cue=openIntentDraft");
  }
  if (entry?.kind === "enter") {
    return profileGate("/console?cue=pulseCreateIntent");
  }
  return profileGate(savedRedirect ?? "/console");
}
