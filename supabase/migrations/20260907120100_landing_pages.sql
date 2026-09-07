-- Landing pages: an agent's own public funnel. Each page belongs to exactly
-- one agent, and every lead it captures is assigned to that agent -- which is
-- the whole point of the feature, so ownership is a NOT NULL column rather
-- than something the app fills in later.
--
-- `content` holds the page-builder copy (hero, benefits, testimonials, FAQ)
-- as JSON rather than columns: it is a document the agent edits as a whole,
-- has no field the database ever filters or joins on, and its shape will keep
-- moving as sections are added. Defaults live in lib/landing-content.ts, so a
-- page created before a section existed still renders.
create table landing_pages (
	id uuid primary key default gen_random_uuid(),
	agent_id uuid not null references profiles(id) on delete cascade,
	-- The public URL segment: /p/<slug>. Unique across the whole system, not
	-- per agent, since the URL carries no agent prefix.
	slug text not null unique,
	name text not null,
	product text not null default 'both' check (product in ('medical', 'hibah', 'both')),
	is_published boolean not null default false,
	content jsonb not null default '{}'::jsonb,
	view_count integer not null default 0,
	lead_count integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index landing_pages_slug_idx on landing_pages (slug);
create index landing_pages_agent_idx on landing_pages (agent_id);

alter table landing_pages enable row level security;

-- Who may see and manage a page. Same shape as can_review_invite: your own,
-- plus anyone beneath you in the org, plus everything for a superadmin.
create or replace function public.can_manage_landing_page(page_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
	select case public.current_role()
		when 'superadmin' then true
		when 'group_manager' then
			page_owner = auth.uid()
			or page_owner in (select id from public.profiles where unit_id in (select public.my_units()))
			or page_owner in (select id from public.profiles where parent_id = auth.uid())
		when 'unit_manager' then
			page_owner = auth.uid()
			or page_owner in (select id from public.profiles where unit_id = public.current_unit_id())
		when 'aspirant_unit_manager' then
			page_owner = auth.uid()
			or page_owner in (select id from public.profiles where parent_id = auth.uid())
		when 'agent' then page_owner = auth.uid()
		else false
	end
$$;

create policy "landing pages readable in scope" on landing_pages for select using (
	public.can_manage_landing_page(agent_id)
);
-- An agent creates pages for themselves only. A manager building one on
-- someone's behalf still files it under that person, which keeps "the page
-- owner gets the leads" true no matter who clicked New.
create policy "landing pages created in scope" on landing_pages for insert with check (
	public.can_manage_landing_page(agent_id)
);
create policy "landing pages updated in scope" on landing_pages for update using (
	public.can_manage_landing_page(agent_id)
) with check (
	public.can_manage_landing_page(agent_id)
);
create policy "landing pages deleted in scope" on landing_pages for delete using (
	public.can_manage_landing_page(agent_id)
);

-- Deliberately no anon policy. The public /p/<slug> page resolves the slug
-- through the service role after checking is_published, the same way
-- /join/<token> does -- an anon-readable policy here would expose every
-- agent's unpublished drafts and lead counts to the open internet.

-- Only the columns the app actually writes from a browser session. Everything
-- else (view_count, lead_count) is moved by the server through the service
-- role when a visitor loads the page or converts, so a manager can't hand-edit
-- their own funnel statistics.
revoke update on landing_pages from authenticated, anon;
grant update (name, slug, product, is_published, content, updated_at)
	on landing_pages to authenticated;
