-- What kind of cover a certificate actually carries, as a set rather than a
-- single yes/no.
--
-- `includes_medical_card` could only ever answer one question, and answered it
-- for the whole certificate: a hibah plan with a medical rider was either
-- mislabelled as medical or lost the rider entirely. A certificate routinely
-- carries more than one kind of cover, so this is an array -- medical_card,
-- hibah, investment_linked, critical_illness -- and every screen that used to
-- branch on the boolean now asks whether the set contains what it cares about.
alter table public.case_submissions
	add column if not exists plan_categories text[] not null default '{}';

-- Backfill: every case that was ticked as carrying medical card cover keeps
-- exactly that meaning, and nothing else is inferred. Cases that were never
-- ticked stay empty rather than being guessed at from their plan name -- an
-- agent tagging them deliberately is worth more than this migration guessing.
update public.case_submissions
set plan_categories = array['medical_card']
where includes_medical_card is true
  and plan_categories = '{}';

-- Only the four known keys, so a typo in a hand-written update can never
-- reach a screen that has no label for it.
alter table public.case_submissions
	drop constraint if exists case_submissions_plan_categories_valid;

alter table public.case_submissions
	add constraint case_submissions_plan_categories_valid
	check (plan_categories <@ array['medical_card', 'hibah', 'investment_linked', 'critical_illness']::text[]);

-- `includes_medical_card` is deliberately left in place and left alone. The
-- app no longer reads or writes it after this migration; keeping the column
-- for now means a deploy that lands after this migration -- or a rollback to
-- the previous one -- still finds the data it expects. Drop it in a later
-- migration once this deploy has been confirmed in production.
comment on column public.case_submissions.includes_medical_card is
	'Superseded by plan_categories. No longer read or written by the app -- safe to drop once the plan_categories deploy is confirmed.';

comment on column public.case_submissions.plan_categories is
	'What kind of cover this certificate carries: any of medical_card, hibah, investment_linked, critical_illness.';
