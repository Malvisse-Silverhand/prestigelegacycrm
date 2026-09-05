-- Appointments: a scheduled meeting with a lead, set from the Appointment
-- workspace, from Lead Detail, or from the dashboard calendar.
create table appointments (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references leads(id) on delete cascade,
	-- Whose diary this sits in. Defaults to the lead's owner, but survives a
	-- later reassignment of the lead so the person who booked it keeps it.
	agent_id uuid not null references profiles(id) on delete cascade,
	scheduled_at timestamptz not null,
	location text,
	remarks text,
	status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
	created_by uuid references profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index appointments_scheduled_idx on appointments (scheduled_at);
create index appointments_lead_idx on appointments (lead_id);
create index appointments_agent_idx on appointments (agent_id, scheduled_at);

alter table appointments enable row level security;

-- Visibility is inherited from the lead rather than restated. RLS applies to
-- tables referenced inside a policy too, so this subquery is itself filtered
-- by the leads policies -- an agent sees appointments on their own leads, a
-- unit manager on their unit's, and so on, and it can never drift out of step
-- with how leads are scoped.
create policy "appointments follow lead visibility" on appointments for select using (
	exists (select 1 from public.leads l where l.id = appointments.lead_id)
);
create policy "appointments created on visible leads" on appointments for insert with check (
	exists (select 1 from public.leads l where l.id = lead_id)
);
create policy "appointments updated on visible leads" on appointments for update using (
	exists (select 1 from public.leads l where l.id = appointments.lead_id)
);
create policy "appointments deleted on visible leads" on appointments for delete using (
	exists (select 1 from public.leads l where l.id = appointments.lead_id)
);

-- In-app notifications, shown in the bell at the top right.
--
-- Reminders are written up front, one row per offset, each with the wall-clock
-- time it becomes due. The bell simply asks for rows whose fire_at has passed,
-- which means the 24h/1h/15min reminders need no scheduler or background job
-- at all -- there is no cron in this deployment, and a reminder that depends
-- on one would silently never arrive.
create table notifications (
	id uuid primary key default gen_random_uuid(),
	profile_id uuid not null references profiles(id) on delete cascade,
	kind text not null,
	title text not null,
	body text,
	href text,
	-- Set for reminder rows so rescheduling an appointment can replace exactly
	-- the reminders it owns.
	appointment_id uuid references appointments(id) on delete cascade,
	fire_at timestamptz not null default now(),
	read_at timestamptz,
	created_at timestamptz not null default now()
);

create index notifications_inbox_idx on notifications (profile_id, fire_at desc);

alter table notifications enable row level security;

-- Strictly personal: a notification is addressed to one person, and even a
-- SuperAdmin has no reason to read someone else's bell.
create policy "notifications readable by owner" on notifications for select using (
	profile_id = auth.uid()
);
create policy "notifications updated by owner" on notifications for update using (
	profile_id = auth.uid()
);
create policy "notifications deleted by owner" on notifications for delete using (
	profile_id = auth.uid()
);
-- No insert policy: reminders are written by the server through the service
-- role, because booking an appointment notifies the lead's owner, who is often
-- not the person clicking Save.
