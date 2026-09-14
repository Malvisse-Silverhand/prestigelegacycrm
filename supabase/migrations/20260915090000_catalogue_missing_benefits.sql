-- Two products that were already being sold but were never in the catalogue.
--
-- Both turned up on real filed cases, typed through the "Others" box: an
-- agent needed a name the dropdown did not have and wrote it by hand. That
-- works, but a hand-typed benefit prefills no sum covered and can never match
-- any rule that keys off a catalogue name -- so the gap is worth closing
-- rather than leaving to the next agent to retype.
--
-- Sort order continues from the existing six. No default_sum_covered: unlike
-- i-GREAT NOVA these two are not sold at one standard figure, so a default
-- would be a wrong number sitting in the form waiting to be accepted.
insert into public.benefit_catalogue (name, sort_order) values
	('i-GREAT MEGA PLUS', 6),
	('i-PROVIDER ON DD RIDER', 7)
on conflict do nothing;
