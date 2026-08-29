-- No DELETE policy exists on `leads` at all yet -- RLS defaults to deny, so
-- nobody (not even superadmin) can currently delete a lead. Add one scoped
-- the same way as the existing UPDATE policies: managers only (never
-- agents, matching the "managers insert leads" INSERT policy), each scoped
-- to the leads they can already reach.

create policy "superadmin deletes leads" on leads for delete using (
  public.current_role() = 'superadmin'
);

create policy "group manager deletes their units leads" on leads for delete using (
  public.current_role() = 'group_manager'
  and unit_id in (select public.my_units())
);

create policy "unit manager deletes unit leads" on leads for delete using (
  public.current_role() = 'unit_manager' and unit_id = current_unit_id()
);
