// Pure helpers for the per-agent public URL namespace, /<agent_slug>/<page_slug>.
// No "server-only", no Supabase import -- this runs in middleware (the Edge
// runtime) as well as in Server Components and Server Actions, and the
// validation rules must match `profiles_agent_slug_valid` in the migration
// exactly, since the database is the final word on what a slug can be.

// Top-level route segments that can never be handed out as an agent slug,
// because `/<segment>/<anything>` would otherwise collide with a real route.
// Kept in sync with `is_reserved_agent_slug` in
// supabase/migrations/20260927090000_agent_landing_page.sql, plus a few
// filesystem names that can't pass the slug format anyway but are listed
// here for clarity.
export const RESERVED_AGENT_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "appointments",
  "change-password",
  "dashboard",
  "forgot-password",
  "join",
  "lead-generation",
  "leads",
  "login",
  "me",
  "my-sales",
  "notifications",
  "p",
  "pipeline",
  "quotations",
  "reset-password",
  "settings",
  "sijil",
  "statistics",
  "team",
  "tools",
  "wa-flow",
  // Future-proofing: not routes today, but words that would be confusing or
  // are likely to become routes later.
  "logout",
  "admin",
  "auth",
  "app",
  "manage-cases",
  "servicing",
  "monitoring",
  "static",
  "public",
  "assets",
  "images",
  "_next",
  "_vercel",
  "favicon.ico",
  "icon.jpg",
  "logo.jpeg",
  "robots.txt",
  "sitemap.xml",
]);

// Same shape as the SQL check constraint: lowercase letters, digits and single
// dashes, 1-60 characters, no leading/trailing dash, no doubled dash, and not
// a reserved word.
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/;

export function isValidAgentSlug(s: string): boolean {
  return SLUG_RE.test(s) && !s.includes("--") && !RESERVED_AGENT_SLUGS.has(s);
}

// The public path for a page: namespaced under the agent once they have a
// slug, otherwise the original /p/<slug> path keeps working forever.
export function landingPath(agentSlug: string | null, pageSlug: string): string {
  return agentSlug ? `/${agentSlug}/${pageSlug}` : `/p/${pageSlug}`;
}

// True for exactly the paths /<agent-landing.tsx> can ever handle: two
// non-empty segments, first one not reserved. Anything else (one segment, a
// trailing slash making an empty second segment, three or more segments) is
// left for the router to resolve or 404 normally.
export function isAgentLandingPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return false;
  const [agent] = segments;
  return !RESERVED_AGENT_SLUGS.has(agent);
}
