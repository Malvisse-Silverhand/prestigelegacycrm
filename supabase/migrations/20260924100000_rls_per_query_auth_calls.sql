-- Migration: RLS per-query auth call optimization
--
-- Supabase's performance advisor (auth_rls_initplan) flags RLS policies that call
-- auth.uid() directly: Postgres evaluates the call once for every row it checks.
-- current_role() and current_unit_id() have the same problem and cost more -- each
-- call is a lookup on public.profiles, so today that lookup runs once per row.
-- Wrapping each call in a scalar subquery, e.g. (select auth.uid()), turns it into
-- an initplan evaluated once per statement. All three are STABLE and argument-free,
-- and STABLE functions already see the statement's starting snapshot, so the result
-- -- and every row each policy allows -- is unchanged. Only evaluation count moves.
--
-- Generated mechanically from pg_policies: the only edits are those three wraps.
-- my_downline()/my_units() already sit inside IN (SELECT ...) and are untouched,
-- as are roles, commands and permissive/restrictive settings.

begin;

alter policy "invite links created by managers" on public."agent_invite_links"
  with check (((created_by = (select auth.uid())) AND ((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role, 'unit_manager'::user_role]))));

alter policy "appointments created on visible leads" on public."appointments"
  with check (((EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.id = appointments.lead_id) AND ((appointments.agent_id = COALESCE(l.agent_id, (select auth.uid()))) OR (appointments.agent_id = (select auth.uid())))))) AND ((created_by IS NULL) OR (created_by = (select auth.uid())))));

alter policy "appointments updated on visible leads" on public."appointments"
  using ((EXISTS ( SELECT 1
   FROM leads l
  WHERE (l.id = appointments.lead_id))))
  with check ((EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.id = appointments.lead_id) AND ((appointments.agent_id = COALESCE(l.agent_id, (select auth.uid()))) OR (appointments.agent_id = (select auth.uid())))))));

alter policy "audit log insert any authenticated" on public."audit_log"
  with check (((select auth.uid()) IS NOT NULL));

alter policy "audit log managers only" on public."audit_log"
  using (((select "current_role"()) = ANY (ARRAY['unit_manager'::user_role, 'group_manager'::user_role, 'superadmin'::user_role])));

alter policy "benefit catalogue deleted by admins" on public."benefit_catalogue"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "benefit catalogue inserted by admins" on public."benefit_catalogue"
  with check (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "benefit catalogue readable by all" on public."benefit_catalogue"
  using (((select auth.uid()) IS NOT NULL));

alter policy "benefit catalogue updated by admins" on public."benefit_catalogue"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "distribution settings managers only" on public."distribution_settings"
  using (((select "current_role"()) = ANY (ARRAY['unit_manager'::user_role, 'group_manager'::user_role, 'superadmin'::user_role])));

alter policy "settings inserts distribution" on public."distribution_settings"
  with check (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "settings updates distribution" on public."distribution_settings"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "activity insert by actor" on public."lead_activity"
  with check ((actor_id = (select auth.uid())));

alter policy "agent updates own leads" on public."leads"
  using ((agent_id = (select auth.uid())));

alter policy "aspirant unit manager updates downline leads" on public."leads"
  using ((((select "current_role"()) = 'aspirant_unit_manager'::user_role) AND (agent_id IN ( SELECT my_downline() AS my_downline))));

alter policy "group manager updates their units leads" on public."leads"
  using ((((select "current_role"()) = 'group_manager'::user_role) AND ((unit_id IN ( SELECT my_units() AS my_units)) OR (agent_id IN ( SELECT my_downline() AS my_downline)))));

alter policy "leads insert" on public."leads"
  with check (
CASE (select "current_role"())
    WHEN 'agent'::user_role THEN (agent_id = (select auth.uid()))
    WHEN 'aspirant_unit_manager'::user_role THEN ((agent_id = (select auth.uid())) OR (agent_id IN ( SELECT my_downline() AS my_downline)))
    WHEN 'unit_manager'::user_role THEN true
    WHEN 'group_manager'::user_role THEN true
    WHEN 'superadmin'::user_role THEN true
    ELSE false
END);

alter policy "leads select" on public."leads"
  using ((((deleted_at IS NULL) OR ((select "current_role"()) = 'superadmin'::user_role)) AND
CASE (select "current_role"())
    WHEN 'agent'::user_role THEN (agent_id = (select auth.uid()))
    WHEN 'aspirant_unit_manager'::user_role THEN (agent_id IN ( SELECT my_downline() AS my_downline))
    WHEN 'unit_manager'::user_role THEN (unit_id = (select current_unit_id()))
    WHEN 'group_manager'::user_role THEN ((unit_id IN ( SELECT my_units() AS my_units)) OR (agent_id IN ( SELECT my_downline() AS my_downline)))
    WHEN 'superadmin'::user_role THEN true
    ELSE false
END));

alter policy "superadmin deletes leads" on public."leads"
  using (((select "current_role"()) = 'superadmin'::user_role));

alter policy "superadmin updates all leads" on public."leads"
  using (((select "current_role"()) = 'superadmin'::user_role));

alter policy "unit manager updates unit leads" on public."leads"
  using ((((select "current_role"()) = 'unit_manager'::user_role) AND (unit_id = (select current_unit_id()))));

alter policy "notifications deleted by owner" on public."notifications"
  using ((profile_id = (select auth.uid())));

alter policy "notifications readable by owner" on public."notifications"
  using ((profile_id = (select auth.uid())));

alter policy "notifications updated by owner" on public."notifications"
  using ((profile_id = (select auth.uid())));

alter policy "aspirant unit manager reads their agents" on public."profiles"
  using ((((select "current_role"()) = 'aspirant_unit_manager'::user_role) AND (parent_id = (select auth.uid()))));

alter policy "aspirant unit manager toggles own agent active status" on public."profiles"
  using ((((select "current_role"()) = 'aspirant_unit_manager'::user_role) AND (parent_id = (select auth.uid())) AND (role = 'agent'::user_role)))
  with check ((((select "current_role"()) = 'aspirant_unit_manager'::user_role) AND (parent_id = (select auth.uid())) AND (role = 'agent'::user_role)));

alter policy "group manager reads their direct reports" on public."profiles"
  using ((((select "current_role"()) = 'group_manager'::user_role) AND (parent_id = (select auth.uid()))));

alter policy "group manager reads their units profiles" on public."profiles"
  using ((((select "current_role"()) = 'group_manager'::user_role) AND (unit_id IN ( SELECT my_units() AS my_units))));

alter policy "group manager toggles unit active status" on public."profiles"
  using ((((select "current_role"()) = 'group_manager'::user_role) AND ((unit_id IN ( SELECT my_units() AS my_units)) OR (parent_id = (select auth.uid())))))
  with check ((((select "current_role"()) = 'group_manager'::user_role) AND ((unit_id IN ( SELECT my_units() AS my_units)) OR (parent_id = (select auth.uid())))));

alter policy "read own profile" on public."profiles"
  using ((id = (select auth.uid())));

alter policy "superadmin reads all profiles" on public."profiles"
  using (((select "current_role"()) = 'superadmin'::user_role));

alter policy "superadmin updates any profile" on public."profiles"
  using (((select "current_role"()) = 'superadmin'::user_role))
  with check (((select "current_role"()) = 'superadmin'::user_role));

alter policy "unit manager reads their agents" on public."profiles"
  using ((((select "current_role"()) = 'unit_manager'::user_role) AND (unit_id = (select current_unit_id()))));

alter policy "unit manager toggles agent active status" on public."profiles"
  using ((((select "current_role"()) = 'unit_manager'::user_role) AND (unit_id = (select current_unit_id()))))
  with check ((((select "current_role"()) = 'unit_manager'::user_role) AND (unit_id = (select current_unit_id()))));

alter policy "managers delete quotations" on public."quotations"
  using ((((select "current_role"()) <> 'agent'::user_role) AND (lead_id IN ( SELECT leads.id
   FROM leads))));

alter policy "quotations insert" on public."quotations"
  with check ((agent_id = (select auth.uid())));

alter policy "quotations update own" on public."quotations"
  using ((agent_id = (select auth.uid())));

alter policy "superadmin reads site settings" on public."site_settings"
  using (((select "current_role"()) = 'superadmin'::user_role));

alter policy "superadmin updates site settings" on public."site_settings"
  using (((select "current_role"()) = 'superadmin'::user_role))
  with check (((select "current_role"()) = 'superadmin'::user_role));

alter policy "everyone reads takaful scripts" on public."takaful_scripts"
  using (((select auth.uid()) IS NOT NULL));

alter policy "superadmin deletes takaful scripts" on public."takaful_scripts"
  using (((select "current_role"()) = 'superadmin'::user_role));

alter policy "superadmin inserts takaful scripts" on public."takaful_scripts"
  with check (((select "current_role"()) = 'superadmin'::user_role));

alter policy "superadmin updates takaful scripts" on public."takaful_scripts"
  using (((select "current_role"()) = 'superadmin'::user_role))
  with check (((select "current_role"()) = 'superadmin'::user_role));

alter policy "targets self or manager" on public."targets"
  using (((agent_id = (select auth.uid())) OR ((select "current_role"()) = ANY (ARRAY['unit_manager'::user_role, 'group_manager'::user_role, 'superadmin'::user_role, 'aspirant_unit_manager'::user_role]))));

alter policy "units visible to relevant roles" on public."units"
  using ((((select "current_role"()) = 'superadmin'::user_role) OR (group_manager_id = (select auth.uid())) OR (id = (select current_unit_id()))));

alter policy "everyone reads templates in scope" on public."wa_templates"
  using (((unit_id IS NULL) OR (unit_id = (select current_unit_id())) OR ((select "current_role"()) = ANY (ARRAY['group_manager'::user_role, 'superadmin'::user_role]))));

alter policy "group manager and superadmin manage templates" on public."wa_templates"
  using (((select "current_role"()) = ANY (ARRAY['group_manager'::user_role, 'superadmin'::user_role])));

alter policy "webhooks deleted by admins" on public."webhooks"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "webhooks inserted by admins" on public."webhooks"
  with check (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "webhooks readable by admins" on public."webhooks"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

alter policy "webhooks updated by admins" on public."webhooks"
  using (((select "current_role"()) = ANY (ARRAY['superadmin'::user_role, 'group_manager'::user_role])));

commit;
