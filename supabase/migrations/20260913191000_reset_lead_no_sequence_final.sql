-- Same reset as the previous migration, run once more.
--
-- Verifying that one worked meant creating a lead and deleting it, which took
-- #19 with it. setval to the highest number actually in use leaves the next
-- lead at #19 again; this time the result is trusted from the statement rather
-- than proven by burning another number.
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
