-- Shareable recruitment links: a manager generates a link, sends it to a
-- prospective agent over WhatsApp, and that person fills in their details
-- without ever having access to the CRM. The submission lands as a pending
-- request that a Unit Manager, Group Manager or SuperAdmin approves or denies.
--
-- No account exists until approval -- that is the whole point of the review
-- step, and it keeps unapproved strangers out of auth.users entirely.

create table agent_invite_links (
	id uuid primary key default gen_random_uuid(),
	token text not null unique,
	label text,
	created_by uuid not null references profiles(id) on delete cascade,
	-- Where an approved registrant lands. Resolved when the link is created
	-- (by the same resolveAssignment used by the Add User form) so approval
	-- never has to re-derive it, and so the approver's own scope can't move
	-- someone somewhere the link's creator couldn't have put them.
	assigned_under_id uuid not null references profiles(id) on delete cascade,
	unit_id uuid references units(id) on delete set null,
	is_active boolean not null default true,
	expires_at timestamptz,
	created_at timestamptz not null default now()
);

create index agent_invite_links_token_idx on agent_invite_links (token);

create table agent_registrations (
	id uuid primary key default gen_random_uuid(),
	invite_id uuid not null references agent_invite_links(id) on delete cascade,
	full_name text not null,
	email text not null,
	phone text not null,
	note text,
	status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
	reviewed_by uuid references profiles(id) on delete set null,
	reviewed_at timestamptz,
	review_note text,
	-- Set on approval, so a request can be traced to the account it became.
	created_profile_id uuid references profiles(id) on delete set null,
	created_at timestamptz not null default now()
);

create index agent_registrations_status_idx on agent_registrations (status, created_at desc);
-- One pending application per email per link: re-submitting the same form
-- should not queue a second copy for the reviewer.
create unique index agent_registrations_pending_email_idx
	on agent_registrations (invite_id, lower(email))
	where status = 'pending';

-- Who may review a request: the manager who created the link, anyone above
-- them in scope, and SuperAdmin. Mirrors can_set_target_for's shape -- a group
-- manager reaches into their own units and direct reports, a unit manager into
-- their own unit.
create or replace function public.can_review_invite(link_creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
	select case public.current_role()
		when 'superadmin' then true
		when 'group_manager' then
			link_creator = auth.uid()
			or link_creator in (select id from public.profiles where unit_id in (select public.my_units()))
			or link_creator in (select id from public.profiles where parent_id = auth.uid())
		when 'unit_manager' then
			link_creator = auth.uid()
			or link_creator in (select id from public.profiles where unit_id = public.current_unit_id())
		else false
	end
$$;

alter table agent_invite_links enable row level security;
alter table agent_registrations enable row level security;

-- Deliberately no policy for anon on either table. The public /join page is
-- served through the service role after validating the token server-side; an
-- anon SELECT policy on agent_invite_links would let anyone list every token
-- and defeat the secrecy of the link itself.

create policy "invite links readable in scope" on agent_invite_links for select using (
	public.can_review_invite(created_by)
);
create policy "invite links created by managers" on agent_invite_links for insert with check (
	created_by = auth.uid()
	and public.current_role() in ('superadmin', 'group_manager', 'unit_manager')
);
create policy "invite links updated in scope" on agent_invite_links for update using (
	public.can_review_invite(created_by)
);
create policy "invite links deleted in scope" on agent_invite_links for delete using (
	public.can_review_invite(created_by)
);

create policy "registrations readable in scope" on agent_registrations for select using (
	exists (
		select 1 from public.agent_invite_links l
		where l.id = agent_registrations.invite_id and public.can_review_invite(l.created_by)
	)
);
create policy "registrations reviewed in scope" on agent_registrations for update using (
	exists (
		select 1 from public.agent_invite_links l
		where l.id = agent_registrations.invite_id and public.can_review_invite(l.created_by)
	)
);
