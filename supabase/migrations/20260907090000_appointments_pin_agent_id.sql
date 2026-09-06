-- appointments.agent_id was never pinned by its INSERT/UPDATE policies --
-- every sibling "attributed to a person" column in this schema is
-- (lead_activity.actor_id, quotations.agent_id, targets.agent_id all require
-- auth.uid() or a scoped check), but appointments only ever checked that the
-- referenced lead was visible. Since RLS is the actual authorization boundary
-- (the app's own validation is not a substitute), any authenticated user who
-- can see a lead -- including a plain agent on their own lead -- could set
-- agent_id to an arbitrary other profile via a direct PostgREST call,
-- attributing a fabricated appointment (and its reminders/notifications) to
-- someone who never booked it.
--
-- Mirrors what the app itself already does (saveAppointment: agent_id is
-- either the lead's current owner, or the caller when the lead has none) --
-- this just makes the database enforce the same rule instead of trusting the
-- server action to always be the only caller.
drop policy if exists "appointments created on visible leads" on appointments;
drop policy if exists "appointments updated on visible leads" on appointments;

create policy "appointments created on visible leads" on appointments for insert with check (
	exists (
		select 1 from public.leads l
		where l.id = appointments.lead_id
			and appointments.agent_id in (coalesce(l.agent_id, auth.uid()), auth.uid())
	)
	and (appointments.created_by is null or appointments.created_by = auth.uid())
);
create policy "appointments updated on visible leads" on appointments for update using (
	exists (select 1 from public.leads l where l.id = appointments.lead_id)
) with check (
	exists (
		select 1 from public.leads l
		where l.id = appointments.lead_id
			and appointments.agent_id in (coalesce(l.agent_id, auth.uid()), auth.uid())
	)
);
