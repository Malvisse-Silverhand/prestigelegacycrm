import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — a stray
  // await here can randomly log users out (see @supabase/ssr docs).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "/" is the public homepage -- viewable without a session, unlike every
  // other route. A signed-in user hitting it gets sent straight to their
  // dashboard instead (handled below), so this page never actually renders
  // for someone already logged in.
  //
  // The password-reset pair must be public too. A recovery link lands here
  // with no server-visible session -- the token arrives in the URL fragment
  // (never sent to the server) or as a ?code that only the browser can
  // exchange -- so gating them on `user` would bounce every reset to /login
  // before the page could run.
  const PUBLIC_ROUTES = ["/", "/login", "/forgot-password", "/reset-password"];
  const isPublicRoute = PUBLIC_ROUTES.includes(request.nextUrl.pathname);

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // Mandatory password change after an admin-created invite: block every route
  // except /change-password itself until the flag clears. /reset-password is
  // exempt as well -- an invited user following the emailed link is doing
  // exactly what this gate wants, and it clears the same flag on save.
  if (
    user &&
    request.nextUrl.pathname !== "/change-password" &&
    request.nextUrl.pathname !== "/reset-password"
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.must_change_password) {
      const changePasswordUrl = request.nextUrl.clone();
      changePasswordUrl.pathname = "/change-password";
      changePasswordUrl.search = "";
      return NextResponse.redirect(changePasswordUrl);
    }
  }

  return supabaseResponse;
}
