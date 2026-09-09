-- Everyone creates leads, each within their own book.
--
-- Agents could not create a lead at all, which made both Add Lead and the
-- Google Sheets import dead buttons for them and forced a manager to enter
-- work an agent had already done. The rule is now the one the org actually
-- runs on: an agent or aspirant unit manager may add a lead as long as it is
-- theirs, and the manager roles keep the wider reach they already had.
--
-- This replaces the narrow "agent adds relative of own lead" policy added
-- alongside the family feature -- that case is simply covered now, and two
-- overlapping insert policies would be a puzzle to read later.
drop policy if exists "agent adds relative of own lead" on leads;
drop policy if exists "managers insert leads" on leads;

create policy "leads insert" on leads for insert with check (
	case public.current_role()
		-- Their own book only. Without this an agent could create a lead and
		-- park it on somebody else's list.
		when 'agent' then agent_id = auth.uid()
		-- An aspirant UM runs agents, so they may also file one under one of
		-- theirs -- the same downline the rest of their policies use.
		when 'aspirant_unit_manager' then agent_id = auth.uid() or agent_id in (select public.my_downline())
		when 'unit_manager' then true
		when 'group_manager' then true
		when 'superadmin' then true
		else false
	end
);

-- Only the dropped policy used this.
drop function if exists public.owns_lead(uuid);
