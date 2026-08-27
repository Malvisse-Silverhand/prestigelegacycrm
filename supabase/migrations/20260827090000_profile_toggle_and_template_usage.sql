-- ===== PROFILES: is_active toggle (unit_manager / group_manager / superadmin) =====
--
-- RLS policies alone can't restrict *which columns* a permitted UPDATE touches --
-- USING/WITH CHECK only see the row, not the SET clause. Postgres's own
-- column-level GRANT system is the clean way to say "only this column":
-- Supabase's default schema setup grants `authenticated` (and `anon`) blanket
-- table-level UPDATE, so that has to be revoked first or the narrower grant
-- below is a no-op.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant update (is_active) on public.profiles to authenticated;

create policy "unit manager toggles agent active status" on profiles
  for update
  using (
    public.current_role() = 'unit_manager'
    and unit_id = public.current_unit_id()
  )
  with check (
    public.current_role() = 'unit_manager'
    and unit_id = public.current_unit_id()
  );

create policy "group manager toggles unit active status" on profiles
  for update
  using (
    public.current_role() = 'group_manager'
    and unit_id in (select public.my_units())
  )
  with check (
    public.current_role() = 'group_manager'
    and unit_id in (select public.my_units())
  );

create policy "superadmin updates any profile" on profiles
  for update
  using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

-- Agents get no UPDATE policy on profiles at all -- My Team isn't in their
-- menu per Section 3's permission matrix, so there's nothing for them to
-- toggle, and the column-level grant above already caps every role's reach
-- to is_active regardless.

-- ===== WA_TEMPLATES: usage_count increment without a raw-UPDATE hole =====
--
-- Every authenticated user needs to bump usage_count on a template they can
-- already SELECT (their unit's, or global), but only "managers manage
-- templates" should be able to touch title/category/body/language. A second
-- UPDATE policy scoped to usage_count alone runs into the same column-vs-row
-- limitation as profiles above, and a bare column-GRANT would let a caller
-- set usage_count to anything (including back to 0, or a huge number) rather
-- than only ever incrementing it by exactly one. A SECURITY DEFINER function
-- closes both gaps: it re-checks the same visibility rule the SELECT policy
-- already uses, and the only operation it exposes is "+1".
create or replace function public.increment_template_usage(template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update wa_templates
  set usage_count = usage_count + 1
  where id = template_id
    and (
      unit_id is null
      or unit_id = public.current_unit_id()
      or public.current_role() in ('group_manager', 'superadmin')
    );
end;
$$;

grant execute on function public.increment_template_usage(uuid) to authenticated;
