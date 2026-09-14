-- Close the gap another round of testing opened (book ran 1..20 then jumped
-- to #34) and reset the counter behind it. Same two-phase renumber as the
-- earlier rounds this session: park existing values clear of anything in
-- use, then re-issue oldest-first, so every lead keeps its identity and only
-- the number changes.
update public.leads set lead_no = lead_no + 1000000;

with ordered as (
	select id, row_number() over (order by created_at nulls first, id) as rn
	from public.leads
)
update public.leads l set lead_no = o.rn from ordered o where l.id = o.id;

select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
