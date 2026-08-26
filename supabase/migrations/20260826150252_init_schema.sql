-- ENUMS
create type user_role as enum ('superadmin', 'group_manager', 'unit_manager', 'agent');
create type lead_status as enum ('hot', 'warm', 'cold', 'unassigned', 'closed');
create type pipeline_stage as enum ('new', 'contacted', 'follow_up', 'quoted', 'closed_won', 'closed_lost');
create type quotation_status as enum ('draft', 'sent', 'accepted');
create type wa_template_category as enum ('greeting', 'follow_up', 'appointment', 'product_info', 'closing', 'reminder', 'other');
create type quotation_product as enum ('imedi_evolusi', 'hibah_nova', 'hibah_chinta', 'hibah_mixed');

-- UNITS
create table units (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	group_manager_id uuid,
	created_at timestamptz default now()
);

-- PROFILES (extends auth.users)
create table profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	full_name text not null,
	email text not null,
	role user_role not null,
	unit_id uuid references units(id),
	parent_id uuid references profiles(id),
	is_active boolean default true,
	avatar_initials text,
	created_at timestamptz default now(),
	last_activity_at timestamptz
);

alter table units
	add constraint units_group_manager_id_fkey
	foreign key (group_manager_id) references profiles(id);

-- LEADS
create table leads (
	id uuid primary key default gen_random_uuid(),
	full_name text not null,
	phone text not null,
	email text,
	date_of_birth date,
	state text,
	occupation text,
	address text,
	lead_source text,
	interest text,
	budget_indicated text,
	best_time_to_reach text,
	status lead_status default 'unassigned',
	pipeline_stage pipeline_stage default 'new',
	agent_id uuid references profiles(id),
	unit_id uuid references units(id),
	follow_up_date date,
	is_stale boolean default false,
	closed_lost_reason text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

-- LEAD ACTIVITY
create table lead_activity (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid references leads(id) on delete cascade,
	actor_id uuid references profiles(id),
	activity_type text not null,
	content text,
	created_at timestamptz default now()
);

-- QUOTATIONS
create table quotations (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid references leads(id) on delete cascade,
	agent_id uuid references profiles(id),
	product quotation_product not null,
	language text default 'BM',
	status quotation_status default 'draft',
	raw_payload jsonb not null,
	pdf_url text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

-- QUOTATION PLAN OPTIONS
create table quotation_plans (
	id uuid primary key default gen_random_uuid(),
	quotation_id uuid references quotations(id) on delete cascade,
	sort_order int default 0,
	plan_label text not null,
	monthly_contribution numeric(10,2),
	annual_contribution numeric(12,2),
	coverage_detail jsonb not null default '{}'
);

-- WA FLOW TEMPLATES
create table wa_templates (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	category wa_template_category not null,
	language text default 'BM',
	body text not null,
	usage_count int default 0,
	created_by uuid references profiles(id),
	unit_id uuid references units(id),
	created_at timestamptz default now()
);

-- TARGETS
create table targets (
	id uuid primary key default gen_random_uuid(),
	agent_id uuid references profiles(id),
	month date not null,
	anc_target numeric(10,2),
	noc_target int,
	created_at timestamptz default now()
);

-- AUDIT LOG
create table audit_log (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid references profiles(id),
	target_id uuid references profiles(id),
	action text not null,
	metadata jsonb,
	created_at timestamptz default now()
);

-- LEAD DISTRIBUTION RULES
create table distribution_settings (
	id uuid primary key default gen_random_uuid(),
	unit_id uuid references units(id),
	round_robin_enabled boolean default true,
	stale_after_days int default 3,
	reassign_requires_approval boolean default true
);
