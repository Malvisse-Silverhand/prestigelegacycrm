-- Creating a quotation (or an estimate -- both are rows in `quotations`) moves
-- the lead's card to the Quoted column automatically.
--
-- Done in the database rather than in one server action because quotations are
-- created from several tools (the static pages under /tools run in an iframe),
-- and a trigger covers every path, present and future.
--
-- Forward only: only a lead still at New, Contacted or Follow Up is moved. A
-- lead already at Quoted, Appointment, Submission, Closed Won, Servicing or
-- Closed Lost keeps its stage, so a second quotation never drags a lead back.
-- Existing leads are not touched by this migration (no backfill).
--
-- SECURITY DEFINER because the agent creating the quotation may be a manager
-- whose RLS would not let them update the lead; the function only ever writes
-- the stage of the lead the new quotation belongs to.

create or replace function public.quotation_moves_lead_to_quoted()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
	moved uuid;
begin
	if new.lead_id is null then
		return new;
	end if;

	update public.leads
	   set pipeline_stage = 'quoted'
	 where id = new.lead_id
	   and deleted_at is null
	   and pipeline_stage in ('new', 'contacted', 'follow_up')
	returning id into moved;

	if moved is not null then
		insert into public.lead_activity (lead_id, actor_id, activity_type, content)
		values (new.lead_id, new.agent_id, 'stage_change', 'Moved to Quoted (quotation created)');
	end if;

	return new;
end;
$fn$;

revoke all on function public.quotation_moves_lead_to_quoted() from public, anon, authenticated;

drop trigger if exists quotation_moves_lead_to_quoted on public.quotations;
create trigger quotation_moves_lead_to_quoted
	after insert on public.quotations
	for each row execute function public.quotation_moves_lead_to_quoted();
