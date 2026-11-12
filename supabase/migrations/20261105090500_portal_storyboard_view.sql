-- Financial Storyboard, step 6 of 6: the ONLY door the client portal uses.
--
-- This is the leak-proof boundary. The portal must be able to show a client
-- their shared storyboards and must be physically unable to show anything else.
-- Rather than trusting every portal page to select the right columns, the portal
-- reads through these two functions, and the functions can only ever return:
--
--     id, module, client_summary, saved_at
--
-- Nothing else on public.storyboards is selected, so inputs, outputs, notes,
-- step_status, outcome, the agent's settings (which live in another table and
-- are not joined) and the pipeline stage are NOT reachable through this path --
-- not by a mistake in a page, not by a future column being added to the table
-- (a new column is invisible here until someone edits these functions on
-- purpose, which is exactly the review point we want).
--
-- Rows are returned only when:
--   * the caller names the lead (p_lead_id) -- the server takes this from the
--     verified portal session, never from client input;
--   * shared_to_portal is true -- turning sharing off removes it immediately;
--   * client_summary is not null -- an unsaved storyboard has nothing to show.
--
-- SECURITY DEFINER because the portal visitor has no database session and the
-- table's RLS (rightly) offers them nothing. search_path is pinned so the
-- function cannot be redirected to a look-alike table. Execution is granted to
-- service_role only: anon and authenticated (including a signed-in agent poking
-- PostgREST) cannot call it, so the lead id cannot be probed from outside the
-- server. The calling code is also responsible for checking the portal link is
-- unrevoked and unexpired before calling these.
create or replace function public.portal_storyboards(p_lead_id uuid)
returns table (
	id uuid,
	module public.storyboard_module,
	client_summary jsonb,
	saved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
	select s.id, s.module, s.client_summary, s.saved_at
	from public.storyboards s
	where s.lead_id = p_lead_id
	  and s.shared_to_portal
	  and s.client_summary is not null
	order by s.saved_at desc nulls last, s.module;
$fn$;

-- One storyboard, still scoped to the lead so a valid session for lead A can
-- never fetch lead B's storyboard by guessing its id.
create or replace function public.portal_storyboard(p_lead_id uuid, p_id uuid)
returns table (
	id uuid,
	module public.storyboard_module,
	client_summary jsonb,
	saved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
	select s.id, s.module, s.client_summary, s.saved_at
	from public.storyboards s
	where s.lead_id = p_lead_id
	  and s.id = p_id
	  and s.shared_to_portal
	  and s.client_summary is not null;
$fn$;

revoke all on function public.portal_storyboards(uuid) from public;
revoke all on function public.portal_storyboards(uuid) from anon;
revoke all on function public.portal_storyboards(uuid) from authenticated;
grant execute on function public.portal_storyboards(uuid) to service_role;

revoke all on function public.portal_storyboard(uuid, uuid) from public;
revoke all on function public.portal_storyboard(uuid, uuid) from anon;
revoke all on function public.portal_storyboard(uuid, uuid) from authenticated;
grant execute on function public.portal_storyboard(uuid, uuid) to service_role;
