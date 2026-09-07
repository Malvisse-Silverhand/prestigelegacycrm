-- view_count / lead_count are revoked from authenticated (see
-- 20260907120100_landing_pages.sql) so an agent can't hand-edit their own
-- funnel statistics. These run as the definer instead, called by the server
-- when a visitor actually loads a page or converts on it.
create or replace function public.increment_landing_view(page_id uuid)
returns void language sql security definer set search_path = public as $$
	update landing_pages set view_count = view_count + 1 where id = page_id;
$$;

create or replace function public.increment_landing_lead(page_id uuid)
returns void language sql security definer set search_path = public as $$
	update landing_pages set lead_count = lead_count + 1 where id = page_id;
$$;

-- Not granted to anon or authenticated: both are only ever called through the
-- service role, from the public landing page's own server code.
revoke execute on function public.increment_landing_view(uuid) from public, anon, authenticated;
revoke execute on function public.increment_landing_lead(uuid) from public, anon, authenticated;
