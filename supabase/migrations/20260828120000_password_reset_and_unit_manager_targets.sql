-- 1. Force-password-change flag, set on every Add User invite, cleared once the
-- new user sets their own password.
alter table profiles add column if not exists must_change_password boolean not null default false;

-- 2. Unit Managers can now set targets for their own agents (Mal's decision) --
-- scoped exactly like the leads/quotations pattern: only rows where the agent's
-- unit_id matches the unit manager's own unit_id.
create policy "unit manager inserts own agent targets" on targets for insert with check (
  public.current_role() = 'unit_manager'
  and agent_id in (select id from profiles where unit_id = public.current_unit_id() and role = 'agent')
);

create policy "unit manager updates own agent targets" on targets for update using (
  public.current_role() = 'unit_manager'
  and agent_id in (select id from profiles where unit_id = public.current_unit_id() and role = 'agent')
);
