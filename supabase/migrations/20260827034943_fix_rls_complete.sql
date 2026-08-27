-- Helper functions (SECURITY DEFINER = bypasses RLS on profiles when checking role,
-- avoids "infinite recursion detected in policy" errors)
create or replace function public.current_role() returns user_role
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_unit_id() returns uuid
language sql security definer stable as $$
  select unit_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_units() returns setof uuid
language sql security definer stable as $$
  select id from public.units where group_manager_id = auth.uid()
$$;

-- ===== PROFILES =====
create policy "read own profile" on profiles for select using (id = auth.uid());
create policy "unit manager reads their agents" on profiles for select using (
  public.current_role() = 'unit_manager' and unit_id = current_unit_id()
);
create policy "group manager reads their units profiles" on profiles for select using (
  public.current_role() = 'group_manager' and unit_id in (select my_units())
);
create policy "superadmin reads all profiles" on profiles for select using (
  public.current_role() = 'superadmin'
);
-- Inserts/updates to profiles happen via a server route using the service_role key
-- (user invites need the Auth Admin API too, not just a table insert) — no client
-- INSERT/UPDATE policy needed yet.

-- ===== LEADS (replace the 4 existing SELECT-only policies with full CRUD) =====
drop policy if exists "agent sees own leads" on leads;
drop policy if exists "unit manager sees unit leads" on leads;
drop policy if exists "group manager sees their units' leads" on leads;
drop policy if exists "superadmin sees all leads" on leads;

create policy "leads select" on leads for select using (
  case public.current_role()
    when 'agent' then agent_id = auth.uid()
    when 'unit_manager' then unit_id = current_unit_id()
    when 'group_manager' then unit_id in (select my_units())
    when 'superadmin' then true
    else false
  end
);
create policy "agent updates own leads" on leads for update using (agent_id = auth.uid());
create policy "unit manager updates unit leads" on leads for update using (
  public.current_role() = 'unit_manager' and unit_id = current_unit_id()
);
create policy "managers insert leads" on leads for insert with check (
  public.current_role() in ('unit_manager','group_manager','superadmin')
);

-- ===== QUOTATIONS (scoped via the lead it belongs to) =====
create policy "quotations select" on quotations for select using (
  lead_id in (select id from leads)  -- relies on leads SELECT policy already scoping correctly
);
create policy "quotations insert" on quotations for insert with check (agent_id = auth.uid());
create policy "quotations update own" on quotations for update using (agent_id = auth.uid());

-- ===== WA_TEMPLATES (Use vs Manage per Section 3) =====
create policy "everyone reads templates in scope" on wa_templates for select using (
  unit_id is null or unit_id = current_unit_id() or public.current_role() in ('group_manager','superadmin')
);
create policy "managers manage templates" on wa_templates for all using (
  public.current_role() in ('unit_manager','group_manager','superadmin')
);

-- ===== LEAD_ACTIVITY, TARGETS, AUDIT_LOG, UNITS, QUOTATION_PLANS, DISTRIBUTION_SETTINGS =====
alter table lead_activity enable row level security;
create policy "activity visible if lead visible" on lead_activity for select using (
  lead_id in (select id from leads)
);
create policy "activity insert by actor" on lead_activity for insert with check (actor_id = auth.uid());

create policy "quotation_plans follow quotation" on quotation_plans for select using (
  quotation_id in (select id from quotations)
);

create policy "targets self or manager" on targets for select using (
  agent_id = auth.uid() or public.current_role() in ('unit_manager','group_manager','superadmin')
);

create policy "audit log managers only" on audit_log for select using (
  public.current_role() in ('unit_manager','group_manager','superadmin')
);
create policy "audit log insert any authenticated" on audit_log for insert with check (auth.uid() is not null);

create policy "units visible to relevant roles" on units for select using (
  public.current_role() = 'superadmin'
  or group_manager_id = auth.uid()
  or id = current_unit_id()
);

create policy "distribution settings managers only" on distribution_settings for select using (
  public.current_role() in ('unit_manager','group_manager','superadmin')
);