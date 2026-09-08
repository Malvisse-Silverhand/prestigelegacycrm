-- A deleted lead has to disappear from every screen in the app: the pipeline
-- board, Leads Manager, the dashboard counts, statistics, the team league, the
-- quotation and appointment lists. Doing that by adding a filter to each of
-- the ~20 places that query leads would work right up until someone writes the
-- twenty-first, so it is enforced here instead: for everyone below SuperAdmin,
-- a soft-deleted lead simply does not exist.
--
-- This carries to every table whose own policy is "visible if the parent lead
-- is visible" -- lead_activity, quotations, appointments all follow
-- automatically, which is the behaviour we want and would have been very easy
-- to forget.
--
-- SuperAdmin still sees them, because they own the Deleted list and the
-- restore. Their ordinary screens filter deleted rows out in the query
-- instead, so the one place that wants them can ask for them.
drop policy if exists "leads select" on leads;

create policy "leads select" on leads for select using (
	(deleted_at is null or public.current_role() = 'superadmin')
	and case public.current_role()
		when 'agent' then agent_id = auth.uid()
		when 'aspirant_unit_manager' then agent_id in (select public.my_downline())
		when 'unit_manager' then unit_id = public.current_unit_id()
		when 'group_manager' then
			unit_id in (select public.my_units()) or agent_id in (select public.my_downline())
		when 'superadmin' then true
		else false
	end
);

-- deleted_at / deleted_by are written by the app's soft delete, which runs as
-- the caller under the existing UPDATE policies. Restoring is SuperAdmin-only
-- and goes through the service role, so neither column needs to be writable by
-- an ordinary session beyond what those policies already allow.
