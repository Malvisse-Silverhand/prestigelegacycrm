-- The active/inactive toggle now decides who a lead can be assigned to, so a
-- Group Manager has to be able to reach everyone they actually manage. Their
-- existing policy only covered profiles inside their units (unit_id in
-- my_units()), which misses the people reporting straight to them -- a
-- GM-direct agent or Aspirant UM carries unit_id = null, so it was impossible
-- to deactivate them.
--
-- Column-level GRANT still caps every role's UPDATE reach to is_active alone
-- (see 20260827090000), so widening the row scope here can't widen what can
-- be written.
drop policy if exists "group manager toggles unit active status" on profiles;

create policy "group manager toggles unit active status" on profiles
  for update
  using (
    public.current_role() = 'group_manager'
    and (unit_id in (select public.my_units()) or parent_id = auth.uid())
  )
  with check (
    public.current_role() = 'group_manager'
    and (unit_id in (select public.my_units()) or parent_id = auth.uid())
  );

-- Aspirant UMs had no UPDATE policy at all, yet My Team already renders the
-- toggle for them (team/page.tsx gives them the same roster as a Unit
-- Manager) -- so every toggle they clicked failed with "Couldn't update this
-- member's status". They can now switch their own agents on and off, and
-- nobody else.
drop policy if exists "aspirant unit manager toggles own agent active status" on profiles;

create policy "aspirant unit manager toggles own agent active status" on profiles
  for update
  using (
    public.current_role() = 'aspirant_unit_manager'
    and parent_id = auth.uid()
    and role = 'agent'
  )
  with check (
    public.current_role() = 'aspirant_unit_manager'
    and parent_id = auth.uid()
    and role = 'agent'
  );
