import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

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

  const { data: row } = await supabase
    .from("users")
    .select("onboarding_status")
    .eq("id", user.id)
    .single();

  const next =
    row?.onboarding_status === "complete" ? "/dashboard" : "/onboarding";

  return NextResponse.redirect(`${site}${next}`);
}
