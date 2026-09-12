-- Submitted cases and the certificates they become.
--
-- Two-step by design. An agent files what they are submitting while the lead
-- sits at Submission; the certificate half (number, commencement date, the
-- dates that follow from it) only exists once underwriting comes back, and
-- filling it in is what turns the lead into a client. Modelling that gap is
-- the point -- a case awaiting underwriting is not the same thing as a case
-- that never got sent.
--
-- One-to-many against leads: a client holding a medical card and a hibah has
-- two certificates, each with its own contribution, benefits and schedule.
create table case_submissions (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references leads(id) on delete cascade,
	-- Who submitted it. Survives a later reassignment of the lead, the same
	-- way appointments.agent_id does.
	agent_id uuid references profiles(id) on delete set null,

	status text not null default 'submitted'
		check (status in ('submitted', 'inforce', 'rejected', 'withdrawn')),

	-- ---- Filed at submission --------------------------------------------
	plan_name text not null,
	plan_type text,
	-- Decides whether Servicing shows waiting periods and the Great Journey
	-- guide at all. An explicit flag rather than sniffing product names:
	-- those get renamed, and silently showing the wrong waiting period to a
	-- client is worse than asking one question at submission.
	includes_medical_card boolean not null default false,
	payment_frequency text not null default 'monthly'
		check (payment_frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
	payment_method text,
	installment_contribution numeric(10,2),
	sum_covered numeric(12,2),

	-- The insured as filed. Copied from the lead at submission rather than
	-- read live: the certificate records who was covered on the day it was
	-- written, and editing the lead later must not rewrite that.
	proposer_name text,
	person_covered_name text,
	id_no text,
	gender text check (gender is null or gender in ('male', 'female')),
	date_of_birth date,
	religion text,
	is_smoker boolean,
	occupation text,

	-- ---- Filled when underwriting returns --------------------------------
	certificate_no text,
	-- Risk commencement. Everything on the Servicing screen keys off this one
	-- date: all four waiting periods, and the whole contribution schedule.
	commencement_date date,
	certificate_issue_date date,
	next_due_date date,
	last_paid_date date,
	lapse_date date,
	termination_date date,
	issuing_agent_name text,
	currency text not null default 'Ringgit (Malaysia)',
	stamp_duty numeric(10,2),
	discount_type text,
	certificate_under_trust boolean not null default false,

	notes text,
	submitted_at timestamptz not null default now(),
	inforced_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	-- An inforce certificate with no number or no start date would leave both
	-- Servicing panels with nothing to compute from, so the two are required
	-- together at exactly the point they become knowable.
	constraint case_submissions_inforce_complete check (
		status <> 'inforce'
		or (certificate_no is not null and commencement_date is not null)
	)
);

create index case_submissions_lead_idx on case_submissions (lead_id);
create index case_submissions_agent_idx on case_submissions (agent_id);
create index case_submissions_status_idx on case_submissions (status);

-- Nominees, as they appear on the certificate.
create table case_nominees (
	id uuid primary key default gen_random_uuid(),
	submission_id uuid not null references case_submissions(id) on delete cascade,
	name text not null,
	relationship text,
	percentage numeric(5,2),
	sort_order int not null default 0,
	created_at timestamptz not null default now()
);
create index case_nominees_submission_idx on case_nominees (submission_id, sort_order);

-- The benefit rows: the plan itself plus each rider, with its own term, sum
-- covered and share of the contribution.
create table case_benefits (
	id uuid primary key default gen_random_uuid(),
	submission_id uuid not null references case_submissions(id) on delete cascade,
	benefit text not null,
	term int,
	sum_covered numeric(12,2),
	installment_contribution numeric(10,2),
	cover_start_date date,
	cover_end_date date,
	contribution_end_date date,
	status text,
	sort_order int not null default 0,
	created_at timestamptz not null default now()
);
create index case_benefits_submission_idx on case_benefits (submission_id, sort_order);

-- One row per contribution due, generated from commencement_date and
-- payment_frequency the moment a certificate goes inforce. Six years' worth:
-- the window an agent is expected to keep watch over a new client's payments.
-- Spacing follows the certificate's own frequency, so a yearly payer gets six
-- rows rather than seventy-two that mean nothing to them.
create table contribution_schedule (
	id uuid primary key default gen_random_uuid(),
	submission_id uuid not null references case_submissions(id) on delete cascade,
	seq int not null,
	due_date date not null,
	paid boolean not null default false,
	paid_on date,
	marked_by uuid references profiles(id) on delete set null,
	marked_at timestamptz,
	created_at timestamptz not null default now(),
	unique (submission_id, seq)
);
create index contribution_schedule_due_idx on contribution_schedule (due_date);
create index contribution_schedule_submission_idx on contribution_schedule (submission_id, seq);

alter table case_submissions enable row level security;
alter table case_nominees enable row level security;
alter table case_benefits enable row level security;
alter table contribution_schedule enable row level security;

-- Visibility is inherited rather than restated, exactly as appointments do
-- it: RLS applies to tables referenced inside a policy too, so this subquery
-- is itself filtered by the leads policies. An agent sees cases on their own
-- leads, a unit manager their unit's, and it can never drift out of step with
-- how leads are scoped.
create policy "cases follow lead visibility" on case_submissions for select using (
	exists (select 1 from public.leads l where l.id = case_submissions.lead_id)
);
create policy "cases created on visible leads" on case_submissions for insert with check (
	exists (select 1 from public.leads l where l.id = lead_id)
);
create policy "cases updated on visible leads" on case_submissions for update using (
	exists (select 1 from public.leads l where l.id = case_submissions.lead_id)
);
create policy "cases deleted on visible leads" on case_submissions for delete using (
	exists (select 1 from public.leads l where l.id = case_submissions.lead_id)
);

-- The child tables hop through case_submissions, whose own policies above are
-- applied to this subquery in turn -- so the chain back to the lead holds
-- without repeating it here.
create policy "nominees follow case visibility" on case_nominees for all using (
	exists (select 1 from public.case_submissions s where s.id = case_nominees.submission_id)
) with check (
	exists (select 1 from public.case_submissions s where s.id = submission_id)
);
create policy "benefits follow case visibility" on case_benefits for all using (
	exists (select 1 from public.case_submissions s where s.id = case_benefits.submission_id)
) with check (
	exists (select 1 from public.case_submissions s where s.id = submission_id)
);
create policy "schedule follows case visibility" on contribution_schedule for all using (
	exists (select 1 from public.case_submissions s where s.id = contribution_schedule.submission_id)
) with check (
	exists (select 1 from public.case_submissions s where s.id = submission_id)
);
