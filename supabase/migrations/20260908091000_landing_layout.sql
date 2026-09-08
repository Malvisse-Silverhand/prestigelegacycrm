-- A QuickQuote form is the same funnel as a landing page with the marketing
-- around it removed: same agent ownership, same lead capture, same counters,
-- same RLS. So it is a layout on the existing row rather than a second system
-- that would have to re-implement all of that and then drift from it.
--
--   full       -- hero, benefits, testimonials, FAQ, then the calculators
--   quickquote -- the agent's card and the calculators, nothing else
alter table landing_pages
	add column layout text not null default 'full' check (layout in ('full', 'quickquote'));

-- Editable by the same sessions that may edit the rest of the page (see the
-- column grants in 20260907120100_landing_pages.sql).
grant update (layout) on landing_pages to authenticated;
