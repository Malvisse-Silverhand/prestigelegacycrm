alter table leads enable row level security;
alter table quotations enable row level security;
alter table wa_templates enable row level security;
alter table profiles enable row level security;

-- Helper: get current user's role/unit (as a Postgres function or via auth.jwt() claims)

-- LEADS
create policy "agent sees own leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'agent'
    and agent_id = auth.uid()
  );

create policy "unit manager sees unit leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'unit_manager'
    and unit_id = (select unit_id from profiles where id = auth.uid())
  );

create policy "group manager sees their units' leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'group_manager'
    and unit_id in (select id from units where group_manager_id = auth.uid())
  );

create policy "superadmin sees all leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'superadmin'
  );

-- Mirror equivalent INSERT/UPDATE policies (agents can only update their own leads;
-- unit managers can reassign within their unit; superadmin/group manager read-mostly
-- except explicit reassignment actions).

-- QUOTATIONS: same shape as leads, scoped via the parent lead's unit_id/agent_id.

-- WA_TEMPLATES: everyone can SELECT unit-scoped + global templates;
-- only unit_manager/group_manager/superadmin can INSERT/UPDATE/DELETE ("Manage" vs "Use").