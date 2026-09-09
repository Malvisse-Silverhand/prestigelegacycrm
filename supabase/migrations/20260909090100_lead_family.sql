-- Family and relatives of an existing lead.
--
-- A spouse or child is a lead in their own right -- they need their own DOB,
-- occupation class, quotations and pipeline stage, all of which already live
-- on `leads`. So a relative is an ordinary lead that points at the person it
-- came from, rather than a new half-featured table that would need its own
-- copy of every one of those.
alter table leads
	add column parent_lead_id uuid references leads(id) on delete set null,
	add column relationship text;

-- Deliberately `on delete set null`, not cascade: hard-deleting one lead must
-- never silently destroy their spouse's and children's records along with the
-- quotations hanging off them. They become ordinary standalone leads instead.

create index leads_parent_lead_id_idx on leads (parent_lead_id) where parent_lead_id is not null;

-- A relative belongs to exactly one lead, and cannot be their own relative.
alter table leads add constraint leads_parent_not_self check (parent_lead_id is null or parent_lead_id <> id);

-- Free text would drift into "wife", "Wife", "isteri" and "spouse" for the
-- same thing, which makes the family box unreadable and any future grouping
-- impossible. The list is deliberately short and covers a Malaysian family.
alter table leads add constraint leads_relationship_valid check (
	relationship is null or relationship in (
		'Spouse', 'Child', 'Parent', 'Sibling',
		'Grandparent', 'Grandchild', 'In-law', 'Other relative'
	)
);

-- Only a relative carries a relationship, and every relative has one: a
-- "Spouse" with nobody to be the spouse of is meaningless.
alter table leads add constraint leads_relationship_needs_parent check (
	(parent_lead_id is null and relationship is null)
	or (parent_lead_id is not null and relationship is not null)
);

comment on column leads.parent_lead_id is
	'The lead this person is a family member of. Set only for relatives added from a lead detail page.';
