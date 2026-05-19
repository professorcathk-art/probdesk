import { createClient } from "@/lib/supabase/server";
import { redirectAfterAuthenticatedSession } from "@/lib/post-auth-session-redirect";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * Full-page redirect target after email OTP verification (session already in cookies).
 * Reuses the same post-login routing as OAuth / magic-link callback.
 */
export async function GET(request: Request) {
  const site = getSiteOrigin(request);
  const supabase = await createClient();
  return redirectAfterAuthenticatedSession(request, site, supabase);
}
