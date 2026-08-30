import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `_vercel` is Vercel's own path (analytics / speed insights). In
    // production the platform serves it before middleware runs, but locally it
    // fell through to the auth redirect and answered a .js request with the
    // login HTML, which the browser then failed to parse.
    "/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
