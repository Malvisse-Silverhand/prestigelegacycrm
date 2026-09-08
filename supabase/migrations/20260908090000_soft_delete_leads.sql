-- Deleting a lead used to be permanent. It is now a soft delete: the row stays
-- put and drops out of every ordinary view, but a SuperAdmin can still find it
-- under Leads Manager → Deleted, see who removed it and when, and restore it.
--
-- This matters because deletion is the one destructive action an agent can
-- take alone, and a lead carries a real person's contact details plus whatever
-- pipeline history came with it.
alter table leads
	add column deleted_at timestamptz,
	add column deleted_by uuid references profiles(id) on delete set null;

-- Every ordinary lead query filters on this, so it wants to be cheap. Partial:
-- deleted leads are the rare case, and the index only needs to serve
-- "deleted_at is null".
create index leads_not_deleted_idx on leads (created_at desc) where deleted_at is null;
create index leads_deleted_idx on leads (deleted_at desc) where deleted_at is not null;

-- SELECT stays as it was -- the app filters deleted rows out per query rather
-- than in the policy, because the SuperAdmin's Deleted view needs to read
-- exactly the rows everyone else is hiding.
--
-- What does change: a soft delete is an UPDATE, and the existing UPDATE
-- policies already scope who may touch which lead, so no new policy is needed
-- for the delete itself. Hard DELETE is now SuperAdmin-only -- for everyone
-- else the app writes deleted_at instead, and leaving the old broad DELETE
-- policies in place would let an agent bypass the soft delete entirely by
-- calling PostgREST directly.
drop policy if exists "agent deletes own leads" on leads;
drop policy if exists "aspirant unit manager deletes downline leads" on leads;
drop policy if exists "unit manager deletes unit leads" on leads;
drop policy if exists "group manager deletes their units leads" on leads;

-- "superadmin deletes leads" is kept as-is: emptying the Deleted list for good
-- is a SuperAdmin action.
