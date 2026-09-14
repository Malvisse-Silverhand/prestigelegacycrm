-- Counting an open, as one statement.
--
-- Done in the database rather than as a read-then-write from the app because
-- a client can open the link twice in the same second (tapping it again from
-- WhatsApp), and a read-modify-write would lose one of them. `first_opened_at`
-- is written once and never again, so "when did they first look" survives
-- every later visit.
create or replace function public.bump_portal_open(link_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $fn$
	update public.client_portal_links
	set open_count = open_count + 1,
	    last_opened_at = now(),
	    first_opened_at = coalesce(first_opened_at, now())
	where id = link_id
	  and revoked_at is null;
$fn$;

-- Called by the portal page through the service role only. No grant to anon
-- or authenticated: a signed-in agent has no reason to inflate this, and an
-- anonymous visitor reaches it through the page, never directly.
revoke all on function public.bump_portal_open(uuid) from public;
revoke all on function public.bump_portal_open(uuid) from anon;
revoke all on function public.bump_portal_open(uuid) from authenticated;
