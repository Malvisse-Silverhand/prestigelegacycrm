-- Realign closing dates to the certificate that actually backs them.
--
-- Until now a lead's closing date was set to whichever day the agent clicked
-- "Mark inforce" -- an administrative timestamp, not the day the policy
-- actually came into force. recordCertificate now sets it from the earliest
-- of the lead's inforce certificates' own risk commencement dates instead,
-- going forward; this corrects the rows that were already stamped the old
-- way.
--
-- Earliest, not "the" certificate: a client can hold more than one, and the
-- closing date means when they first became a client, not whichever policy
-- happens to be recorded last. `distinct on` picks exactly one row per lead,
-- deterministically, rather than leaving Postgres to pick arbitrarily among
-- several matches the way a plain join would.
--
-- Scoped to leads with an inforce certificate: a lead closed with no case on
-- file at all (a sale recorded straight on the pipeline, no certificate in
-- this CRM) has no commencement date to follow, so its closing date is left
-- exactly as an agent set it.
update public.leads l
set closed_on = earliest.commencement_date
from (
	select distinct on (lead_id) lead_id, commencement_date
	from public.case_submissions
	where status = 'inforce' and commencement_date is not null
	order by lead_id, commencement_date asc
) as earliest
where earliest.lead_id = l.id
	and l.closed_on is distinct from earliest.commencement_date;
