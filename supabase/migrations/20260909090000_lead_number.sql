-- A short, human-sayable id for a lead.
--
-- Leads are keyed by uuid, which is right for the database and useless over
-- the phone: nobody reads out 99339925-30e7-4d97-a70c-c944207bd175 to a unit
-- manager. This adds a plain running number, shown on the lead, the list and
-- the pipeline card, so a lead can be referred to as "#42".
--
-- Numbered across the whole system rather than per agent: the point is that
-- one number identifies one lead when two people are talking about it, and a
-- per-agent counter would give three different leads the same #7.
alter table leads add column lead_no integer;

-- Existing leads are numbered oldest first, so the numbering matches the order
-- they actually arrived. Soft-deleted rows are numbered too -- skipping them
-- would renumber everything after them if one were ever restored.
with ordered as (
	select id, row_number() over (order by created_at nulls first, id) as rn
	from leads
)
update leads l set lead_no = o.rn from ordered o where l.id = o.id;

-- New leads continue from the highest number issued. A sequence, not
-- max()+1: two agents adding a lead at the same moment would otherwise both
-- read the same max and collide on the unique index below.
create sequence leads_lead_no_seq owned by leads.lead_no;
select setval('leads_lead_no_seq', coalesce((select max(lead_no) from leads), 0));

alter table leads alter column lead_no set default nextval('leads_lead_no_seq');
alter table leads alter column lead_no set not null;

-- A number is never reused, including by a deleted lead: the whole value of it
-- is that #42 means one lead forever.
create unique index leads_lead_no_key on leads (lead_no);
