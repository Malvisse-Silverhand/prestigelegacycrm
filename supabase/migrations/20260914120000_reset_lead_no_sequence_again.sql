-- Same reset as the previous two rounds, run again after another round of
-- verification. Every end-to-end run creates and deletes throwaway leads,
-- and the sequence does not give a number back when a row is deleted, so the
-- counter drifts above the book each time even though it stays contiguous.
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
