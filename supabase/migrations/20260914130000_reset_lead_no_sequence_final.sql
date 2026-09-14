-- Same reset as before, after verifying the last change against production.
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
