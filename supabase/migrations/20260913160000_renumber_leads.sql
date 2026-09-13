-- Close the gaps in lead numbers.
--
-- lead_no comes from a sequence, and a sequence does not give back a number
-- when the row that took it is deleted. Automated testing against this
-- database created and removed a lot of leads, and each one burned a number:
-- the real book ran 1..17 and then jumped straight to #136 and #160. The
-- numbers are only days old and nothing stores them -- they are displayed and
-- searched, never referenced by another table -- so they can be re-issued.
--
-- The trade-off is deliberate and worth stating: the original design said a
-- number identifies one lead forever. That still holds going forward. This is
-- a one-off correction of numbers that were never meaningful, not a new habit
-- of renumbering, which would make "#42" mean different leads on different
-- days.

-- Out of the way first. A single UPDATE that both frees and takes numbers trips
-- the unique index row by row, so the old values are parked far above anything
-- in use (the highest was 160) before the new ones are assigned.
update public.leads set lead_no = lead_no + 1000000;

-- Oldest first, so the numbering matches the order leads actually arrived --
-- the same rule the original numbering used. Soft-deleted rows are numbered
-- too: skipping them would shift everything after them if one were restored.
with ordered as (
	select id, row_number() over (order by created_at nulls first, id) as rn
	from public.leads
)
update public.leads l set lead_no = o.rn from ordered o where l.id = o.id;

-- The next lead carries on from the last one issued.
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from public.leads), 0));
