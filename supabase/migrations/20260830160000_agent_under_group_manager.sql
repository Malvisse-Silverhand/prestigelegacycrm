-- An agent (or aspirant unit manager) may now report directly to a Group
-- Manager, not only to a Unit Manager / Aspirant UM.
--
-- Those people have no unit, so the existing group-manager policies -- which
-- scope purely by unit_id -- would not see them or their leads. Both are
-- widened to also cover the caller's direct reports via my_downline().

-- ===== PROFILES =====
create policy "group manager reads their direct reports" on profiles for select using (
  public.current_role() = 'group_manager' and parent_id = auth.uid()
);

-- ===== LEADS =====
drop policy if exists "leads select" on leads;
create policy "leads select" on leads for select using (
  case public.current_role()
    when 'agent' then agent_id = auth.uid()
    when 'aspirant_unit_manager' then agent_id in (select public.my_downline())
    when 'unit_manager' then unit_id = current_unit_id()
    when 'group_manager' then
      unit_id in (select public.my_units())
      or agent_id in (select public.my_downline())
    when 'superadmin' then true
    else false
  end
);

drop policy if exists "group manager updates their units leads" on leads;
create policy "group manager updates their units leads" on leads for update using (
  public.current_role() = 'group_manager'
  and (
    unit_id in (select public.my_units())
    or agent_id in (select public.my_downline())
  )
);

drop policy if exists "group manager deletes their units leads" on leads;
create policy "group manager deletes their units leads" on leads for delete using (
  public.current_role() = 'group_manager'
  and (
    unit_id in (select public.my_units())
    or agent_id in (select public.my_downline())
  )
);
