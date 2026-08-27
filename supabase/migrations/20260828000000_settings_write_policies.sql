-- Settings screen (Section 6 #16) write access: Set Target and Lead Distribution
-- tabs are only reachable by superadmin/group_manager per the Section 3 permission
-- matrix ("Settings -- hierarchy setup"), so their writes are scoped the same way.
-- Reads on both tables already have policies from the earlier RLS migration --
-- this only adds the missing INSERT/UPDATE.

create policy "settings inserts targets" on targets for insert with check (
  public.current_role() = 'superadmin'
  or (
    public.current_role() = 'group_manager'
    and agent_id in (select id from profiles where unit_id in (select my_units()))
  )
);

create policy "settings updates targets" on targets for update using (
  public.current_role() = 'superadmin'
  or (
    public.current_role() = 'group_manager'
    and agent_id in (select id from profiles where unit_id in (select my_units()))
  )
);

-- distribution_settings has no per-row ownership to check beyond role -- the
-- Lead Distribution tab edits a single org-wide row (unit_id is null).
create policy "settings inserts distribution" on distribution_settings for insert with check (
  public.current_role() in ('superadmin', 'group_manager')
);

create policy "settings updates distribution" on distribution_settings for update using (
  public.current_role() in ('superadmin', 'group_manager')
);
