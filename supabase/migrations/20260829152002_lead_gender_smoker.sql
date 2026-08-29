-- Lead Detail v2: gender and smoker status, both collected during the call,
-- not at lead creation -- is_smoker stays nullable ("unknown") until an agent
-- actually asks the client.
create type lead_gender as enum ('male', 'female');

alter table leads
	add column gender lead_gender,
	add column is_smoker boolean;

-- RLS is enforced per-row, not per-column: the existing "leads select" /
-- "agent updates own leads" / "unit manager updates unit leads" /
-- "superadmin updates all leads" / "group manager updates their units leads"
-- policies already gate every column on these rows, including the two added
-- here. No new policy needed -- confirmed by re-reading those policies
-- (20260827034943_fix_rls_complete.sql, 20260828150000_section2_rls_fixes.sql),
-- none of which reference a column list.
