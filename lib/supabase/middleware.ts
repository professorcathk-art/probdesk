import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateMandatoryProfileCore } from "@/lib/profile-basics";

function pathNeedsMandatoryProfile(pathname: string): boolean {
  const prefixes = ["/console", "/square", "/marketplace", "/dashboard", "/admin"];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !anon) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (
    user &&
    !pathname.startsWith("/api/") &&
    pathNeedsMandatoryProfile(pathname)
  ) {
    const { data: urow } = await supabase
      .from("users")
      .select("onboarding_status")
      .eq("id", user.id)
      .maybeSingle();

    if (urow?.onboarding_status === "complete") {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, bio, location, industry")
        .eq("user_id", user.id)
        .maybeSingle();

      const gate = validateMandatoryProfileCore(prof ?? {});
      if (!gate.ok) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/profile";
        redirectUrl.searchParams.set("required", "profile");
        const redirectRes = NextResponse.redirect(redirectUrl);
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectRes.cookies.set(c.name, c.value);
        });
        return redirectRes;
      }
    }
  }

  return supabaseResponse;
}
