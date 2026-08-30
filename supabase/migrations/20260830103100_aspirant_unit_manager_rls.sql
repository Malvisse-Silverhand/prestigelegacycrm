-- RLS for the aspirant_unit_manager role added in the previous migration.
--
-- An Aspirant Unit Manager is a "unit manager in training": they have agents
-- reporting directly to them (profiles.parent_id = their id) and can see and
-- work those agents' leads -- but unlike a real Unit Manager they are scoped
-- to their own downline, NOT to the whole unit.

-- Profile ids reporting directly to the caller, plus the caller themselves.
-- SECURITY DEFINER so it can read profiles without tripping the profiles
-- policies that call it (same reason as current_role/my_units above it).
create or replace function public.my_downline() returns setof uuid
language sql security definer stable as $$
  select id from public.profiles where parent_id = auth.uid()
  union
  select auth.uid()
$$;

-- ===== PROFILES =====
create policy "aspirant unit manager reads their agents" on profiles for select using (
  public.current_role() = 'aspirant_unit_manager' and parent_id = auth.uid()
);

-- ===== LEADS =====
-- Rebuilt rather than added to: the existing policy is a single CASE over the
-- caller's role, so the new branch has to go inside it.
drop policy if exists "leads select" on leads;
create policy "leads select" on leads for select using (
  case public.current_role()
    when 'agent' then agent_id = auth.uid()
    when 'aspirant_unit_manager' then agent_id in (select public.my_downline())
    when 'unit_manager' then unit_id = current_unit_id()
    when 'group_manager' then unit_id in (select public.my_units())
    when 'superadmin' then true
    else false
  end
);

create policy "aspirant unit manager updates downline leads" on leads for update using (
  public.current_role() = 'aspirant_unit_manager'
  and agent_id in (select public.my_downline())
);

create policy "aspirant unit manager deletes downline leads" on leads for delete using (
  public.current_role() = 'aspirant_unit_manager'
  and agent_id in (select public.my_downline())
);

-- They run a team, so they can create leads like the other manager roles.
drop policy if exists "managers insert leads" on leads;
create policy "managers insert leads" on leads for insert with check (
  public.current_role() in ('unit_manager','group_manager','superadmin','aspirant_unit_manager')
);

-- ===== TARGETS =====
-- So My Team / Set Target can show their own agents' numbers.
drop policy if exists "targets self or manager" on targets;
create policy "targets self or manager" on targets for select using (
  agent_id = auth.uid()
  or public.current_role() in ('unit_manager','group_manager','superadmin','aspirant_unit_manager')
);
