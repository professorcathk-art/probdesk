import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_COOKIE, getRequestCookie, parseEntryCookie } from "@/lib/entry-cookie";
import { parseRedirectAfterCookie, REDIRECT_AFTER_COOKIE } from "@/lib/redirect-after-login-cookie";
import { validateMandatoryProfileCore } from "@/lib/profile-basics";
import { sanitizeInternalRedirect } from "@/lib/sanitize-redirect";
import { getSiteOrigin } from "@/lib/site-url";
import { ensurePublicUserRowsForSession } from "@/lib/ensure-public-user";

function appendDeletedCookieHeaders(res: NextResponse) {
  res.cookies.set(ENTRY_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set(REDIRECT_AFTER_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const site = getSiteOrigin(request);

  if (!code) {
    return NextResponse.redirect(`${site}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${site}/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${site}/login?error=no_session`);
  }

  const ensured = await ensurePublicUserRowsForSession(supabase, user);
  if (!ensured.ok) {
    return NextResponse.redirect(`${site}/login?error=${encodeURIComponent(ensured.message)}`);
  }

  const { data: row } = await supabase.from("users").select("onboarding_status").eq("id", user.id).single();

  const { data: prof } = await supabase
    .from("profiles")
    .select("display_name, bio, location, industry, skills_tags, languages")
    .eq("user_id", user.id)
    .maybeSingle();

  const coreGate = validateMandatoryProfileCore(prof ?? {});
  const onboardingComplete = row?.onboarding_status === "complete";
  /** Users who finish the profile form satisfy app gates even if they never completed the legacy onboarding wizard. */
  const effectivelyComplete = onboardingComplete || coreGate.ok;

  const entryRaw = getRequestCookie(request, ENTRY_COOKIE);
  const entry = parseEntryCookie(entryRaw);
  const savedRedirect = parseRedirectAfterCookie(getRequestCookie(request, REDIRECT_AFTER_COOKIE));

  const complete = effectivelyComplete;

  function profileGate(pathAfterProfile: string) {
    const safe = sanitizeInternalRedirect(pathAfterProfile) ?? "/console";
    const res = NextResponse.redirect(`${site}/profile?required=profile&after=${encodeURIComponent(safe)}`);
    appendDeletedCookieHeaders(res);
    return res;
  }

  function redirectOk(destPath: string) {
    const res = NextResponse.redirect(`${site}${destPath.startsWith("/") ? destPath : `/${destPath}`}`);
    appendDeletedCookieHeaders(res);
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
