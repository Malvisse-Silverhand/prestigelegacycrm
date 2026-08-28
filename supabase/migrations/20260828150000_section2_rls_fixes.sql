-- Section 2 RLS matrix audit fixes.

-- ============================================================
-- 1. profiles: close a self-reactivation hole.
--
-- "users clear their own password flag" (id = auth.uid()) makes a caller's
-- own row reachable for UPDATE with no restriction on which policy-checked
-- row was touched -- RLS policies gate ROWS, not columns. Combined with the
-- pre-existing blanket `grant update (is_active) to authenticated`, this
-- accidentally let ANY authenticated user -- including an agent a manager
-- just deactivated -- flip their own is_active back to true, bypassing the
-- manager-only UPDATE policies entirely. Confirmed live: an agent client
-- could self-reactivate with a plain .update({is_active:true}).eq('id',self).
--
-- Fix: replace the raw-column-grant approach for this one flag with a
-- SECURITY DEFINER function that does exactly one thing -- clear the
-- caller's own flag -- mirroring increment_template_usage. Drop the policy
-- and its column grant so there's no longer a general "own row" UPDATE
-- policy on profiles for regular authenticated users at all.
drop policy if exists "users clear their own password flag" on profiles;
revoke update (must_change_password) on public.profiles from authenticated;

create or replace function public.clear_own_password_flag()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set must_change_password = false where id = auth.uid();
end;
$$;

grant execute on function public.clear_own_password_flag() to authenticated;

-- ============================================================
-- 2. leads: SuperAdmin and Group Manager had SELECT but no UPDATE policy at
-- all -- Section 3's permission matrix gives them "All" / "All (their
-- units)" access to Leads Manager, and the Edit Lead feature has no role
-- restriction, so both roles could open the edit form and have it silently
-- (pre Section-1-fix) or visibly (post-fix) fail every time.
create policy "superadmin updates all leads" on leads for update using (
  public.current_role() = 'superadmin'
);

create policy "group manager updates their units leads" on leads for update using (
  public.current_role() = 'group_manager'
  and unit_id in (select public.my_units())
);

-- ============================================================
-- 3. wa_templates: "managers manage templates" included unit_manager, but
-- Section 3's matrix draws the line at "Manage templates" for SuperAdmin/
-- Group Manager vs "Use templates" for Unit Manager/Agent. RLS, the server
-- actions, and the UI all agreed with each other but not with the spec --
-- fixing all three. Unit Manager keeps read access via the existing
-- "everyone reads templates in scope" policy; only write access narrows.
drop policy if exists "managers manage templates" on wa_templates;

create policy "group manager and superadmin manage templates" on wa_templates for all using (
  public.current_role() in ('group_manager', 'superadmin')
);
