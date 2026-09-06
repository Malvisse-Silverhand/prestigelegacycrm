-- Column-level UPDATE hardening, matching the pattern already used for
-- profiles (authenticated can only ever UPDATE profiles.is_active -- see
-- 20260828150000_section2_rls_fixes.sql). RLS policies on these three tables
-- only ever check row *visibility* (a scoping function, or "the parent lead
-- is visible to me"); by default Postgres/Supabase also grants UPDATE on
-- every column to authenticated, which means any authenticated user with
-- visibility into a row could, via a direct PostgREST call bypassing the
-- app's server actions entirely, rewrite columns the app itself never
-- touches after creation:
--   - agent_invite_links.assigned_under_id / unit_id: an invite link's owner
--     could redirect where an approved applicant lands in the org tree,
--     bypassing the scope checks resolveAssignment() applies when the link
--     is first created.
--   - agent_registrations.invite_id: a reviewer could re-point a pending
--     application at a different invite link.
--   - quotations.agent_id / product / raw_payload: anyone who can currently
--     see a lead (including its own agent) could rewrite who gets credited
--     for a quotation, or its figures, on a historical record they didn't
--     create.
--
-- None of this needed an RLS rewrite (the "is this row visible to me" scoping
-- is correct); it needed the write surface narrowed to what the app actually
-- uses, the same way profiles.is_active already is.

revoke update on agent_invite_links from authenticated, anon;
grant update (is_active) on agent_invite_links to authenticated;

revoke update on agent_registrations from authenticated, anon;
grant update (status, reviewed_by, reviewed_at, review_note, created_profile_id)
	on agent_registrations to authenticated;

revoke update on quotations from authenticated, anon;
grant update (status) on quotations to authenticated;

-- Minimal fixed-window rate limiter for the few Server Actions reachable
-- with no session at all -- a valid request needs no cookie or JWT, just the
-- URL (password reset, and the public /join/<token> registration form).
-- Session-gated actions don't need this: a stolen session is a bigger
-- problem than a fast clicker, and Supabase Auth already rate-limits sign-in
-- itself.
create table rate_limits (
	id bigint generated always as identity primary key,
	bucket text not null,
	subject text not null,
	created_at timestamptz not null default now()
);
create index rate_limits_lookup_idx on rate_limits (bucket, subject, created_at desc);

alter table rate_limits enable row level security;
-- Deliberately no policies at all: every caller (requestPasswordReset,
-- submitRegistration) already runs through the service role for other
-- reasons on these same unauthenticated paths, so RLS has nothing to add --
-- an anon-readable policy here would let anyone see how close another
-- subject is to being throttled.
