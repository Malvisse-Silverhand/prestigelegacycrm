-- The Quotation page gains edit (status) and delete, individually and in bulk.
--
-- Until now `quotations` only allowed UPDATE by the agent who created the row
-- (agent_id = auth.uid()), and had no DELETE policy at all -- so a manager
-- couldn't correct a status, and nobody could remove a mistaken quotation.
--
-- Both new policies scope through the parent lead, reusing the same trick as
-- the existing "quotations select": `lead_id in (select id from leads)` is
-- filtered by the leads SELECT policy, so each role automatically gets
-- exactly the quotations it can already see.

-- Anyone who can see the lead can update its quotations (an agent needs this
-- to mark their own quotation as sent).
create policy "quotations update in scope" on quotations for update using (
  lead_id in (select id from leads)
);

-- Deleting is destructive, so it matches the leads DELETE rule: managers only,
-- never plain agents.
create policy "managers delete quotations" on quotations for delete using (
  public.current_role() <> 'agent'
  and lead_id in (select id from leads)
);
