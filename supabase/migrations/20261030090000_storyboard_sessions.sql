-- Financial Storyboard: one row per needs-analysis session an agent runs with a
-- prospect (Hibah, Medical Card, ...). Unlike the third-party tools agents used
-- before, the session is kept: it is reopened at the follow-up meeting and is
-- what My Insights / Leader Insights count.
--
-- A session without a lead is a practice run. It works the same, can be
-- attached to a lead later, and is purged after 30 days if it never is (the
-- purge runs in app/(app)/storyboard/data.ts when the owner opens the hub).

create table if not exists public.storyboard_sessions (
	id uuid primary key default gen_random_uuid(),
	agent_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
	lead_id uuid references public.leads(id) on delete set null,
	module text not null check (module in ('hibah', 'medical', 'ci')),
	-- Bumped when a module's formula changes, so an old session still renders
	-- with the maths it was presented with.
	engine_version smallint not null default 1,
	lang text not null default 'bm' check (lang in ('bm', 'en')),

	-- Shared prospect snapshot (nickname, age, gender, ...). Never an IC number
	-- or medical detail: the form has no field for either.
	profile jsonb not null default '{}'::jsonb,
	inputs jsonb not null default '{}'::jsonb,
	-- Stored, not just derived, so lists and insights needn't recompute.
	-- { need, have, gap, coveredPct, ... } -- shape depends on module.
	result jsonb not null default '{}'::jsonb,
	risk_flags text[] not null default '{}',
	notes text,

	status text not null default 'draft' check (status in ('draft', 'presented', 'shared')),
	presented_at timestamptz,
	shared_via text[] not null default '{}',

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists storyboard_sessions_agent_idx on public.storyboard_sessions (agent_id, updated_at desc);
create index if not exists storyboard_sessions_lead_idx on public.storyboard_sessions (lead_id) where lead_id is not null;
create index if not exists storyboard_sessions_presented_idx on public.storyboard_sessions (presented_at) where presented_at is not null;

alter table public.storyboard_sessions enable row level security;

-- Reads: the owner, plus leaders over the same people they see on My Team --
-- the scoping mirrors the "leads select" policy, keyed on the session's agent
-- rather than on a lead (a practice session has none).
drop policy if exists "storyboard select" on public.storyboard_sessions;
create policy "storyboard select" on public.storyboard_sessions for select using (
	agent_id = (select auth.uid())
	or case (select public.current_role())
		when 'aspirant_unit_manager' then agent_id in (select public.my_downline())
		when 'unit_manager' then exists (
			select 1 from public.profiles p where p.id = storyboard_sessions.agent_id and p.unit_id = (select public.current_unit_id())
		)
		when 'group_manager' then exists (
			select 1 from public.profiles p where p.id = storyboard_sessions.agent_id and p.unit_id in (select public.my_units())
		)
		when 'superadmin' then true
		else false
	end
);

-- Writes: the owner only. A leader can look at a downline session but not
-- edit what was presented. A lead can only be attached if the agent can see it.
drop policy if exists "storyboard insert" on public.storyboard_sessions;
create policy "storyboard insert" on public.storyboard_sessions for insert with check (
	agent_id = (select auth.uid())
	and (lead_id is null or exists (select 1 from public.leads l where l.id = lead_id))
);

drop policy if exists "storyboard update" on public.storyboard_sessions;
create policy "storyboard update" on public.storyboard_sessions for update using (
	agent_id = (select auth.uid())
) with check (
	agent_id = (select auth.uid())
	and (lead_id is null or exists (select 1 from public.leads l where l.id = lead_id))
);

drop policy if exists "storyboard delete" on public.storyboard_sessions;
create policy "storyboard delete" on public.storyboard_sessions for delete using (
	agent_id = (select auth.uid())
);
