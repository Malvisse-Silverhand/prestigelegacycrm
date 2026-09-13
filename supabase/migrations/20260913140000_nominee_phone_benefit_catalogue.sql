-- Two additions to case submission.
--
-- 1. A nominee's phone number. Nominees are the people who have to be reached
--    when a claim happens, and the agent has those numbers at the moment they
--    fill the form -- not two years later when they are needed.
alter table public.case_nominees add column if not exists phone text;

-- 2. The benefit list stops being hard-coded.
--
--    The four benefits were a constant in the app, so adding a fifth meant a
--    deploy. The operator adds products faster than that, and the name on the
--    certificate has to match theirs exactly, so this belongs in data the
--    business can edit. `default_sum_covered` prefills the row when a benefit
--    is picked -- most benefits are sold at one standard sum -- and the
--    description is the note the agent needs at the moment of choosing.
create table if not exists public.benefit_catalogue (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	default_sum_covered numeric(12, 2),
	description text,
	is_active boolean not null default true,
	sort_order integer not null default 0,
	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- One row per product name. A duplicate would show twice in the dropdown and
-- make "which one did they mean" unanswerable.
create unique index if not exists benefit_catalogue_name_key on public.benefit_catalogue (lower(name));

alter table public.benefit_catalogue enable row level security;

-- Read by everyone: every agent filing a case needs the list. Written by the
-- roles that own org-wide configuration, matching the Webhooks audience.
create policy "benefit catalogue readable by all" on public.benefit_catalogue for select using (
	auth.uid() is not null
);
create policy "benefit catalogue inserted by admins" on public.benefit_catalogue for insert with check (
	public.current_role() in ('superadmin', 'group_manager')
);
create policy "benefit catalogue updated by admins" on public.benefit_catalogue for update using (
	public.current_role() in ('superadmin', 'group_manager')
);
create policy "benefit catalogue deleted by admins" on public.benefit_catalogue for delete using (
	public.current_role() in ('superadmin', 'group_manager')
);

-- Seeded with the four that were hard-coded, so the dropdown is unchanged on
-- the day this ships and nothing already filed refers to a name that is gone.
insert into public.benefit_catalogue (name, sort_order) values
	('i-GREAT NOVA', 0),
	('i-ADDITIONAL LIFETIME CRITICAL ILLNESS TERM RIDER', 1),
	('SAVER i-NOVA', 2),
	('i-PROVIDER CRITICAL ILLNESS TERM RIDER', 3)
on conflict do nothing;
