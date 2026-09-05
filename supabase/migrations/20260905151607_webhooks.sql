-- Outgoing webhooks, so lead generation can be pushed into Pabbly Connect (or
-- anything else that accepts a POST) without hard-coding a URL the way the
-- standalone calculators do. Several can be registered, each on one event.
create table webhooks (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	url text not null,
	event text not null,
	is_enabled boolean not null default true,
	created_by uuid references profiles(id),
	last_status text,
	last_fired_at timestamptz,
	created_at timestamptz default now()
);

alter table webhooks enable row level security;

-- Org-wide integration config, same audience as the Lead Distribution tab:
-- superadmin and group managers. Everyone else has no policy at all, so the
-- table is invisible to them.
create policy "webhooks readable by admins" on webhooks for select using (
	public.current_role() in ('superadmin', 'group_manager')
);
create policy "webhooks inserted by admins" on webhooks for insert with check (
	public.current_role() in ('superadmin', 'group_manager')
);
create policy "webhooks updated by admins" on webhooks for update using (
	public.current_role() in ('superadmin', 'group_manager')
);
create policy "webhooks deleted by admins" on webhooks for delete using (
	public.current_role() in ('superadmin', 'group_manager')
);
