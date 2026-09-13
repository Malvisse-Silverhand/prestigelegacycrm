-- Put the lead counter back on the last number actually in use.
--
-- Same statement as before, run again after another round of verification.
-- Every end-to-end run creates throwaway leads and deletes them, and a
-- sequence does not give a number back, so the counter drifts above the book
-- each time. Reads the real maximum, so any lead created in between keeps its
-- number and is counted here rather than being overwritten.
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
