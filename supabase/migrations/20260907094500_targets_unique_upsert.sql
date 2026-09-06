-- One target row per agent per month was already an invariant the app
-- enforced procedurally (check for an existing row, then update or insert) --
-- but that check-then-act has a race (two concurrent saves for the same
-- agent/month could both see "no existing row" and both insert), and it
-- costs a round trip per row. A real unique constraint closes the race and
-- is also what upsert(..., { onConflict }) needs to turn saveTargets'/
-- saveUnitManagerTargets' N-row loop of "check, then update-or-insert" (up
-- to 2-3 sequential network round trips per row) into one statement.
alter table targets add constraint targets_agent_id_month_key unique (agent_id, month);
