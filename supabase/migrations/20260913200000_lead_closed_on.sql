-- The day a lead was actually closed.
--
-- Until now "when did this close" was answered with leads.updated_at -- the
-- day the row last changed, for any reason. That is a stand-in the dashboard
-- code says so in its own comment, and it is wrong in both directions: editing
-- a client's phone number in October moves their September sale into October,
-- and a case signed last month can only ever be recorded as closing today.
--
-- A plain date, not a timestamp: closing is a business day, agreed with the
-- client, and the hour it was typed into the CRM is not part of it.
alter table public.leads add column if not exists closed_on date;

-- Backfilled from the stand-in that was in use, so existing figures do not
-- move the day this ships. The date is read in Malaysia time, the same as
-- every other day-bucketing in this app -- updated_at is UTC, and slicing it
-- raw would file anything touched after 8am Malaysian time under yesterday.
update public.leads
set closed_on = (updated_at at time zone 'Asia/Kuala_Lumpur')::date
where closed_on is null
	and pipeline_stage in ('closed_won', 'servicing');

comment on column public.leads.closed_on is
	'Business date the sale closed. Defaults to today when a lead enters a won stage; an agent may backdate it.';
