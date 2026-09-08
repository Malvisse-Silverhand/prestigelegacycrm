-- Tracking code for the public landing pages: Meta Pixel, TikTok Pixel, and
-- whatever else marketing needs next. Three slots so a snippet can go where
-- its vendor says it should, rather than everything being crammed into one.
--
-- A single row, not a row per agent. These are org-level ad accounts, and a
-- per-agent version would mean every agent could put arbitrary script on a
-- public page -- see the RLS below for why that matters.
create table site_settings (
	id boolean primary key default true,
	-- Belt and braces: this table holds exactly one row, forever.
	constraint site_settings_singleton check (id),
	tracking_head text not null default '',
	tracking_body text not null default '',
	tracking_footer text not null default '',
	tracking_enabled boolean not null default true,
	updated_at timestamptz not null default now(),
	updated_by uuid references profiles(id) on delete set null
);

insert into site_settings (id) values (true);

alter table site_settings enable row level security;

-- SuperAdmin only, read and write. This column holds script that runs in the
-- browser of every visitor to every landing page, so being able to edit it is
-- being able to run code on the public site: it belongs with the one role that
-- already has full control, not with anyone who can manage a team.
--
-- The public landing page does not read this through RLS at all -- it goes
-- through the service role, like getPublicLandingPage, because the visitor has
-- no session.
create policy "superadmin reads site settings" on site_settings for select using (
	public.current_role() = 'superadmin'
);
create policy "superadmin updates site settings" on site_settings for update using (
	public.current_role() = 'superadmin'
) with check (
	public.current_role() = 'superadmin'
);

-- No insert or delete policy on purpose: the single row already exists and
-- nothing should ever add another or remove it.
