-- Set Target is no longer superadmin/GM-only over agents. Every role may now
-- set targets for themselves and for anyone at or below their own rank inside
-- the scope they can already see:
--   superadmin          -> everyone
--   group_manager       -> self + their units + their direct reports
--   unit_manager        -> self + UM/AUM/Agent in their own unit
--   aspirant_unit_mgr   -> self + the agents reporting to them
--   agent               -> self only
--
-- One helper expresses the rule so the INSERT and UPDATE policies can't drift
-- apart. SECURITY DEFINER for the same reason my_units()/my_downline() are:
-- it reads profiles, and the profiles policies would otherwise recurse. It
-- takes a single uuid and returns a boolean already scoped by auth.uid(), so
-- it exposes nothing the caller can't already determine.
create or replace function public.can_set_target_for(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_role()
    when 'superadmin' then true
    when 'group_manager' then
      target_profile = auth.uid()
      or target_profile in (select id from public.profiles where unit_id in (select public.my_units()))
      or target_profile in (select id from public.profiles where parent_id = auth.uid())
    when 'unit_manager' then
      target_profile = auth.uid()
      or target_profile in (
        select id from public.profiles
        where unit_id = public.current_unit_id()
          and role in ('unit_manager', 'aspirant_unit_manager', 'agent')
      )
    when 'aspirant_unit_manager' then
      target_profile = auth.uid()
      or target_profile in (
        select id from public.profiles where parent_id = auth.uid() and role = 'agent'
      )
    when 'agent' then target_profile = auth.uid()
    else false
  end
$$;

-- Replaces the four narrower policies: superadmin/GM-over-their-units
-- (20260828000000) and unit-manager-over-own-agents (20260828120000).
drop policy if exists "settings inserts targets" on targets;
drop policy if exists "settings updates targets" on targets;
drop policy if exists "unit manager inserts own agent targets" on targets;
drop policy if exists "unit manager updates own agent targets" on targets;

create policy "targets insert by rank" on targets
  for insert with check (public.can_set_target_for(agent_id));

create policy "targets update by rank" on targets
  for update using (public.can_set_target_for(agent_id));
