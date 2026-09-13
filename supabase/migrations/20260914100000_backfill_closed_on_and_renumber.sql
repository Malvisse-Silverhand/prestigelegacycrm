-- Two loose ends from the closing-date work.
--
-- 1. One inforced certificate still has no closing date.
--
--    The backfill ran against pipeline_stage, but a case inforced right on the
--    boundary of the deploy ended up in Servicing without one -- so the client
--    counted as won everywhere except the monthly figures, which key off this
--    date. Filled from the moment the certificate was actually marked inforce,
--    read in Malaysia time, which is the same rule the other rows got. The
--    agent can backdate it on the lead if the sale closed earlier.
update public.leads l
set closed_on = (
	select (cs.inforced_at at time zone 'Asia/Kuala_Lumpur')::date
	from public.case_submissions cs
	where cs.lead_id = l.id and cs.status = 'inforce' and cs.inforced_at is not null
	order by cs.inforced_at
	limit 1
)
where l.closed_on is null
	and l.pipeline_stage in ('closed_won', 'servicing')
	and exists (
		select 1 from public.case_submissions cs
		where cs.lead_id = l.id and cs.status = 'inforce' and cs.inforced_at is not null
	);

-- Anything still without one falls back to the day the row was last touched,
-- so no won lead is left invisible to a month's figures.
update public.leads
set closed_on = (updated_at at time zone 'Asia/Kuala_Lumpur')::date
where closed_on is null
	and pipeline_stage in ('closed_won', 'servicing');

-- 2. Close the gap the last round of testing opened.
--
--    Leads created while the counter had drifted took numbers above the book
--    (#21 with 18 leads on file). Same two-phase renumber as before: park the
--    old values clear of anything in use, then re-issue oldest-first.
update public.leads set lead_no = lead_no + 1000000;

with ordered as (
	select id, row_number() over (order by created_at nulls first, id) as rn
	from public.leads
)
update public.leads l set lead_no = o.rn from ordered o where l.id = o.id;

select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
