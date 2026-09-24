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

  // Do not run code between createServerClient and getClaims() — a stray
  // await here can randomly log users out (see @supabase/ssr docs).
  //
  // getClaims() rather than getUser(): the project signs sessions with an
  // asymmetric key (ES256), so the token's signature is checked right here
  // against the cached public key instead of a round trip to the Auth server
  // on every navigation. It still refreshes an expired session first, and a
  // legacy HS256 token falls back to getUser() inside the SDK. The trade-off
  // is that a signed-out-elsewhere or deleted user keeps passing this gate
  // until their access token expires; RLS already works the same way.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

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
  //
  // /join/<token> is public by design: it is a recruitment link forwarded to
  // people who have no account at all. The token in the path is the only
  // credential, and the page validates it server-side.
  const PUBLIC_ROUTES = ["/", "/login", "/forgot-password", "/reset-password"];
  //
  // /p/<slug> is an agent's public landing page -- the whole point is that
  // strangers who have no account can open it from an ad or a WhatsApp
  // forward, calculate an estimate and become a lead.
  //
  // /tools/* are the standalone calculator files that landing page embeds in
  // an iframe. They are static pages with no CRM session of their own (they
  // already run unauthenticated as WordPress embeds), and without this a
  // signed-out visitor's iframe is redirected to /login -- which then refuses
  // to be framed, so the calculator silently never appears.
  //
  // /sijil/<token> is a client's own certificate portal. Clients never get CRM
  // accounts -- the token in the path is the only credential, the page
  // resolves it server-side, and a revoked token renders the same dead end as
  // one that was never real.
  const isPublicRoute =
    PUBLIC_ROUTES.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/join/") ||
    request.nextUrl.pathname.startsWith("/p/") ||
    request.nextUrl.pathname.startsWith("/sijil/") ||
    request.nextUrl.pathname.startsWith("/tools/");

  if (!userId && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (userId && request.nextUrl.pathname === "/") {
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
    userId &&
    request.nextUrl.pathname !== "/change-password" &&
    request.nextUrl.pathname !== "/reset-password"
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", userId)
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
