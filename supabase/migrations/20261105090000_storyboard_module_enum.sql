-- Financial Storyboard, step 1 of 6: the list of modules.
--
-- A storyboard is one guided needs-analysis conversation an agent walks a lead
-- through (Fill & Calculate, Explanation, Rejection Risk, Objections). There are
-- five of them today:
--
--   hibah     - the estate / family-support gap if the breadwinner passes away
--   medical   - medical card adequacy against realistic hospital bills
--   ci        - critical illness recovery and income-replacement need
--   business  - keyman, buy-sell and business-loan protection
--   mortgage  - home-loan protection, MRTT (reducing) versus MLTT (level)
--
-- This is an enum rather than a free text column plus a CHECK because three
-- tables key off it (storyboards, storyboard_settings and the portal view) and
-- the TypeScript union in lib/storyboard/types.ts has to match it exactly -- a
-- test reads this file and compares the two lists, so adding a module is one
-- deliberate change in both places rather than a typo that silently stores a
-- sixth kind of row.
--
-- Kept in its own migration, as the repo does for every enum, so that a later
-- `alter type ... add value` never has to share a transaction with the first
-- statement that uses the new value.
do $$
begin
	create type public.storyboard_module as enum ('hibah', 'medical', 'ci', 'business', 'mortgage');
exception
	when duplicate_object then null;
end
$$;
