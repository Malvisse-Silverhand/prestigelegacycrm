import "server-only";
import { headers } from "next/headers";

// The CRM's own address, for links that leave the app (auth emails, invite
// links, a landing page's absolute URL).
//
// This used to be derived purely from the incoming request, which breaks the
// moment a link is generated from anywhere other than the real domain: an
// invite sent while an admin happened to be on the Vercel deployment URL
// (…-projects.vercel.app) mails that host to the new user, and that host sits
// behind Vercel's deployment protection -- so the recipient clicks "Set your
// password" and lands on a Vercel login page they have no account for.
//
// NEXT_PUBLIC_APP_URL pins it to the canonical domain. The request host stays
// as a fallback so local development still works without configuration.
//
// Note this only fixes the address the app ASKS for. Supabase independently
// refuses any redirect that isn't in its own allowlist and silently
// substitutes the project's Site URL, so the same domain has to be set under
// Auth → URL Configuration for these links to survive.
export async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
