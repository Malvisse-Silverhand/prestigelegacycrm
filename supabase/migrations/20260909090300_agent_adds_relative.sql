-- An agent may add a family member of a lead they already own.
--
-- Agents otherwise cannot create leads at all, and that rule stays: this is
-- not "agents can add leads now". It is exactly one case -- the spouse or
-- child of somebody already theirs -- which is how a referral actually
-- arrives, and it is the case the Add Family/Relative button exists for. An
-- agent who could not use that button on their own client's file would be
-- looking at a feature built for somebody else.
--
-- The check is deliberately tight. The new row must be a relative
-- (parent_lead_id not null), the parent must be a lead they already own, and
-- they must assign it to themselves -- so this grants no way to create a
-- free-standing lead, and no way to reach anybody else's book.

-- A SECURITY DEFINER helper, like my_units()/my_downline(): a subquery over
-- `leads` inside a policy on `leads` is evaluated under that same policy and
-- recurses.
create or replace function public.owns_lead(lead uuid)
returns boolean language sql security definer stable set search_path = public as $$
	select exists (select 1 from public.leads where id = lead and agent_id = auth.uid())
$$;

create policy "agent adds relative of own lead" on leads for insert with check (
	public.current_role() = 'agent'
	and parent_lead_id is not null
	and agent_id = auth.uid()
	and public.owns_lead(parent_lead_id)
);
