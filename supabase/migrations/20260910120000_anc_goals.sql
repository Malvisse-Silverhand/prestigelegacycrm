-- Goal tracking for the ANC dashboard.
--
-- Two separate ideas, deliberately stored separately:
--
--   targets.approach_target  -- how many first approaches a day, per month.
--     Belongs on targets because it is set by the same person, for the same
--     agent, for the same calendar month, in the same Set Target screen.
--
--   anc_campaigns            -- "Road to RM130K by 31 Oct".
--     Cannot live on targets: a campaign spans months and carries its own
--     deadline, so it has no single `month` to hang off.

alter table targets add column if not exists approach_target int;

comment on column targets.approach_target is
	'Daily first-approach target for this agent in this month. Null means no approach target set.';

create table anc_campaigns (
	id uuid primary key default gen_random_uuid(),
	agent_id uuid not null references profiles(id) on delete cascade,
	-- The label above the figure on the dashboard ("SCHA", "Road to Gold").
	name text not null,
	target_anc numeric(12,2) not null check (target_anc > 0),
	-- Closings before this date belong to a previous push, not this one, so
	-- "current ANC" can be counted inside the campaign window rather than
	-- over all time.
	start_date date not null default current_date,
	deadline date not null,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint anc_campaigns_dates check (deadline >= start_date)
);

-- The dashboard shows "the" goal, so two running at once would make that an
-- arbitrary pick. Past campaigns stay as rows with is_active = false.
create unique index anc_campaigns_one_active_per_agent
	on anc_campaigns (agent_id) where is_active;
create index anc_campaigns_agent_idx on anc_campaigns (agent_id);

alter table anc_campaigns enable row level security;

-- Exactly the scope rule targets already uses: your own, plus anyone at or
-- below your own rank. Reusing the helper means the two can't drift apart.
create policy "campaigns readable by rank" on anc_campaigns for select
	using (public.can_set_target_for(agent_id));
create policy "campaigns insert by rank" on anc_campaigns for insert
	with check (public.can_set_target_for(agent_id));
create policy "campaigns update by rank" on anc_campaigns for update
	using (public.can_set_target_for(agent_id))
	with check (public.can_set_target_for(agent_id));
create policy "campaigns delete by rank" on anc_campaigns for delete
	using (public.can_set_target_for(agent_id));
