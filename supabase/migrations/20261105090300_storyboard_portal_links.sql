-- Financial Storyboard, step 4 of 6: the client's link.
--
-- The client has no account. What they hold is a link (token in the URL) and,
-- on the portal login screen, they must also give the lead's full name and
-- phone. The token only selects WHICH lead is being asked about; the name and
-- phone are compared against that one lead alone, so there is nothing to
-- enumerate across leads.
--
-- Design points, shared with client_portal_links (the certificate portal):
--
--   * the token is generated in the database (public.new_portal_token(): a v4
--     uuid without dashes, 122 bits) so it cannot be derived from a lead id;
--   * one ACTIVE link per lead (partial unique index), so issuing a new one has
--     to revoke the old one first and revoking never touches another client;
--   * revoked_at is a timestamp, not a delete, because "when did we close this"
--     gets asked after the fact;
--   * links expire (30 days by default) and the portal re-checks revoked_at and
--     expires_at on every request;
--   * open counters let an agent see whether the client ever looked, without
--     storing any identifying detail (the per-event IP hash lives in
--     portal_access_log, hashed, not here).
--
-- Writes: there are NO insert/update/delete policies. Creating, revoking and
-- counting are done by server actions and pages using the service role, which
-- bypasses RLS. A signed-in agent therefore cannot mint, extend or un-revoke a
-- link by calling PostgREST directly.
-- Reads: one SELECT policy that follows lead visibility, so the owning agent
-- (and the managers above them) can see the link's status in the UI.
create table if not exists public.storyboard_portal_links (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	token text not null default public.new_portal_token(),
	expires_at timestamptz not null default (now() + interval '30 days'),

	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	revoked_at timestamptz,
	revoked_by uuid references public.profiles(id) on delete set null,

	first_opened_at timestamptz,
	last_opened_at timestamptz,
	open_count integer not null default 0
);

create unique index if not exists storyboard_portal_links_token_key
	on public.storyboard_portal_links (token);

create unique index if not exists storyboard_portal_links_active_key
	on public.storyboard_portal_links (lead_id)
	where revoked_at is null;

alter table public.storyboard_portal_links enable row level security;

drop policy if exists "storyboard links follow lead visibility" on public.storyboard_portal_links;
create policy "storyboard links follow lead visibility" on public.storyboard_portal_links for select using (
	exists (select 1 from public.leads l where l.id = storyboard_portal_links.lead_id)
);

-- Belt and braces: with no write policies RLS already denies writes, but a later
-- "for all" policy added in a hurry should not silently open them.
revoke all on public.storyboard_portal_links from anon;
revoke insert, update, delete on public.storyboard_portal_links from authenticated;

-- Counting an open, as one statement (a client can tap the WhatsApp link twice in
-- the same second; read-then-write would lose one). Modelled on
-- bump_portal_open(). It only counts a link that is still live: revoked and
-- expired links do not move the counters, so the numbers mean "times the client
-- really got in front of the login screen".
create or replace function public.bump_storyboard_portal_open(p_token text)
returns void
language sql
volatile
security definer
set search_path = public
as $fn$
	update public.storyboard_portal_links
	set open_count = open_count + 1,
	    last_opened_at = now(),
	    first_opened_at = coalesce(first_opened_at, now())
	where token = p_token
	  and revoked_at is null
	  and expires_at > now();
$fn$;

-- Service role only. Not anon: a visitor reaches this through the page, never
-- directly. Not authenticated: an agent has no reason to inflate the count.
revoke all on function public.bump_storyboard_portal_open(text) from public;
revoke all on function public.bump_storyboard_portal_open(text) from anon;
revoke all on function public.bump_storyboard_portal_open(text) from authenticated;
grant execute on function public.bump_storyboard_portal_open(text) to service_role;
