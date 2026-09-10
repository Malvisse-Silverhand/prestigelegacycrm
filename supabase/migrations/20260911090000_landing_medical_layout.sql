-- A third landing-page layout: the long-form medical card funnel.
--
--   full       -- hero, benefits, testimonials, FAQ, then the calculators
--   quickquote -- the agent's card and the calculators, nothing else
--   medical    -- the full consultative funnel: the cost-of-treatment case,
--                 benefits, why-this-adviser, an adviser profile, social
--                 proof, the panel of operators, then the calculators
--
-- A plain check constraint, so the column keeps rejecting anything the
-- renderer has no branch for.
alter table landing_pages drop constraint if exists landing_pages_layout_check;
alter table landing_pages
	add constraint landing_pages_layout_check
	check (layout in ('full', 'quickquote', 'medical'));
