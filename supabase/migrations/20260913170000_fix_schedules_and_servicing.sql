-- Two corrections to certificates already recorded.
--
-- 1. Schedules that don't match their payment frequency.
--
--    The schedule is built once, when the certificate is recorded. Editing the
--    case afterwards saved a new frequency but left the old dues in place, so a
--    certificate switched to yearly kept seventy-two monthly rows and the
--    checklist asked the client to pay twelve times a year. The code now
--    rebuilds on a frequency change; this repairs the rows already written.
--
--    Ticks are carried across by due date, which is the only match that means
--    the same thing before and after: "payment #2" is a month in on a monthly
--    certificate and a year in on a yearly one.
do $$
declare
	c record;
	step int;
	want int;
	have int;
	i int;
	due date;
begin
	for c in
		select id, commencement_date, payment_frequency
		from public.case_submissions
		where status = 'inforce' and commencement_date is not null
	loop
		step := case c.payment_frequency
			when 'monthly' then 1
			when 'quarterly' then 3
			when 'half_yearly' then 6
			when 'yearly' then 12
			else 1
		end;
		want := 72 / step;
		select count(*) into have from public.contribution_schedule where submission_id = c.id;

		if have <> want then
			create temp table _kept on commit drop as
				select due_date, paid_on from public.contribution_schedule
				where submission_id = c.id and paid;

			delete from public.contribution_schedule where submission_id = c.id;

			for i in 0..(want - 1) loop
				due := (c.commencement_date::date + (i * step) * interval '1 month')::date;
				insert into public.contribution_schedule (submission_id, seq, due_date, paid, paid_on)
				values (
					c.id,
					i + 1,
					due,
					exists (select 1 from _kept k where k.due_date = due),
					(select coalesce(k.paid_on, due) from _kept k where k.due_date = due)
				);
			end loop;

			drop table _kept;
		end if;
	end loop;
end $$;

-- 2. Inforced policies belong in the Servicing column.
--
--    Recording a certificate is the moment the job changes from selling to
--    looking after the client, and the Servicing page lists exactly that. The
--    code now moves the lead there; these were inforced before it did, so the
--    board and the Servicing page disagreed about the same clients. Both
--    stages count as won, so no ANC figure moves.
insert into public.lead_activity (lead_id, actor_id, activity_type, content)
select distinct cs.lead_id, cs.agent_id, 'stage_change', 'Moved to Servicing'
from public.case_submissions cs
join public.leads l on l.id = cs.lead_id
where cs.status = 'inforce' and l.pipeline_stage = 'closed_won';

update public.leads l
set pipeline_stage = 'servicing', status = 'closed'
where l.pipeline_stage = 'closed_won'
	and exists (
		select 1 from public.case_submissions cs
		where cs.lead_id = l.id and cs.status = 'inforce'
	);
