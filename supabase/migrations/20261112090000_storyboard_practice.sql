-- Financial Storyboard: practice sessions.
--
-- An agent can rehearse a module with a made-up prospect WITHOUT a lead. Such a
-- row ("practice session") has lead_id = null and owner_id = the agent. It can
-- be attached to one of the agent's own leads later (attach_practice_storyboard
-- below), and the app deletes practice rows that nobody touched for 30 days
-- (opportunistic purge on the hub page, RLS delete of the user's own rows).
--
-- Safe to re-run (idempotent). Paste it in the Supabase SQL Editor AFTER
-- 20261105090100_storyboards.sql and 20261105090500_portal_storyboard_view.sql.
--
-- What changes
--   * storyboards.lead_id becomes nullable; new owner_id (the practice owner)
--     and title (an optional label, <= 80 chars).
--   * check: a row belongs to a lead OR to an owner. A practice row can never be
--     shared to the portal (check below), and the portal functions select by
--     lead_id = p_lead_id, which a null lead_id never matches, so practice rows
--     cannot reach the portal by either route.
--   * RLS is rebuilt. LEAD rows (lead_id not null) behave exactly as before:
--     visible with the lead, written by the lead's agent or a superadmin,
--     deleted by a superadmin. PRACTICE rows (lead_id null):
--       SELECT  the owner, plus their leaders scoped the way leads are:
--               aspirant_unit_manager -> owner in my_downline(); unit_manager ->
--               owner's profile in current_unit_id(); group_manager -> owner's
--               unit in my_units(); superadmin -> all.
--       INSERT  owner_id = auth.uid() and lead_id is null.
--       UPDATE  the owner only (leaders are read-only).
--       DELETE  the owner (superadmin may delete any row, as before).
--   * title joins the updatable columns. owner_id and lead_id stay NOT
--     directly updatable: the only way to move a practice row onto a lead is the
--     SECURITY DEFINER function attach_practice_storyboard(), which checks the
--     caller owns both the practice row and the lead.
--
-- Helpers used (all exist): public.current_role(), public.current_unit_id(),
-- public.my_units(), public.my_downline().

-- ---------------------------------------------------------------- columns
alter table public.storyboards alter column lead_id drop not null;

alter table public.storyboards
	add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.storyboards
	add column if not exists title text;

alter table public.storyboards drop constraint if exists storyboards_title_len;
alter table public.storyboards
	add constraint storyboards_title_len check (title is null or char_length(title) <= 80);

alter table public.storyboards drop constraint if exists storyboards_has_parent;
alter table public.storyboards
	add constraint storyboards_has_parent check (lead_id is not null or owner_id is not null);

-- A practice row is never shown to a client.
alter table public.storyboards drop constraint if exists storyboards_practice_not_shared;
alter table public.storyboards
	add constraint storyboards_practice_not_shared check (lead_id is not null or shared_to_portal = false);

-- "My practice sessions" and the 30-day purge both filter on the owner.
create index if not exists storyboards_owner_idx
	on public.storyboards (owner_id, updated_at)
	where lead_id is null;

-- ---------------------------------------------------------------- helper
-- Can the caller read a practice row owned by p_owner? SECURITY DEFINER so the
-- profiles lookup does not depend on (and cannot recurse into) profiles RLS.
create or replace function public.storyboard_practice_visible(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
	select p_owner is not null and (
		p_owner = auth.uid()
		or case public.current_role()
			when 'superadmin' then true
			when 'aspirant_unit_manager' then p_owner in (select public.my_downline())
			when 'unit_manager' then exists (
				select 1 from public.profiles p
				where p.id = p_owner and p.unit_id is not null and p.unit_id = public.current_unit_id()
			)
			when 'group_manager' then exists (
				select 1 from public.profiles p
				where p.id = p_owner and p.unit_id in (select public.my_units())
			)
			else false
		end
	);
$fn$;

revoke all on function public.storyboard_practice_visible(uuid) from public;
revoke all on function public.storyboard_practice_visible(uuid) from anon;
grant execute on function public.storyboard_practice_visible(uuid) to authenticated;

-- -------------------------------------------------------------------- RLS
-- The four lead-row policies are replaced by policies that keep the lead
-- branch word for word and add the practice branch.
drop policy if exists "storyboards follow lead visibility" on public.storyboards;
drop policy if exists "storyboards written by lead owner" on public.storyboards;
drop policy if exists "storyboards updated by lead owner" on public.storyboards;
drop policy if exists "storyboards deleted by superadmin" on public.storyboards;

drop policy if exists "storyboards select" on public.storyboards;
create policy "storyboards select" on public.storyboards for select using (
	(lead_id is not null and exists (select 1 from public.leads l where l.id = storyboards.lead_id))
	or (lead_id is null and (select public.storyboard_practice_visible(storyboards.owner_id)))
);

drop policy if exists "storyboards insert" on public.storyboards;
create policy "storyboards insert" on public.storyboards for insert with check (
	(
		lead_id is not null
		and (exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
		and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
	)
	or (lead_id is null and owner_id = (select auth.uid()))
);

drop policy if exists "storyboards update" on public.storyboards;
create policy "storyboards update" on public.storyboards for update using (
	(
		lead_id is not null
		and (exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
		and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
	)
	or (lead_id is null and owner_id = (select auth.uid()))
) with check (
	(
		lead_id is not null
		and (exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
		and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
	)
	or (lead_id is null and owner_id = (select auth.uid()))
);

drop policy if exists "storyboards delete" on public.storyboards;
create policy "storyboards delete" on public.storyboards for delete using (
	(select public.current_role()) = 'superadmin'
	or (lead_id is null and owner_id = (select auth.uid()))
);

-- ----------------------------------------------------------------- grants
revoke update on public.storyboards from authenticated;
grant update (
	inputs, outputs, client_summary, step_status, notes, outcome,
	saved_at, saved_by, shared_to_portal, shared_at, shared_by, title
) on public.storyboards to authenticated;

-- ----------------------------------------------------------------- attach
-- Moves a practice row onto a lead. Returns:
--   'ok'          attached (lead_id set, owner_id cleared)
--   'not_found'   no such practice row owned by the caller
--   'not_allowed' the lead does not exist / is deleted / is not the caller's
--                 (a superadmin may attach to any live lead)
--   'duplicate'   that lead already has a storyboard for this module
create or replace function public.attach_practice_storyboard(p_id uuid, p_lead_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
	v_uid uuid := auth.uid();
	v_module public.storyboard_module;
	v_agent uuid;
begin
	if v_uid is null then
		return 'not_allowed';
	end if;

	select s.module into v_module
	from public.storyboards s
	where s.id = p_id and s.lead_id is null and s.owner_id = v_uid;
	if not found then
		return 'not_found';
	end if;

	select l.agent_id into v_agent
	from public.leads l
	where l.id = p_lead_id and l.deleted_at is null;
	if not found or not (v_agent = v_uid or public.current_role() = 'superadmin') then
		return 'not_allowed';
	end if;

	if exists (select 1 from public.storyboards x where x.lead_id = p_lead_id and x.module = v_module) then
		return 'duplicate';
	end if;

	begin
		update public.storyboards
		set lead_id = p_lead_id, owner_id = null
		where id = p_id and lead_id is null and owner_id = v_uid;
	exception when unique_violation then
		-- Two attaches raced for the same (lead, module).
		return 'duplicate';
	end;
	if not found then
		return 'not_found';
	end if;
	return 'ok';
end;
$fn$;

revoke all on function public.attach_practice_storyboard(uuid, uuid) from public;
revoke all on function public.attach_practice_storyboard(uuid, uuid) from anon;
grant execute on function public.attach_practice_storyboard(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------- portal
-- portal_storyboards() / portal_storyboard() are unchanged and need no edit:
-- they select `where s.lead_id = p_lead_id and s.shared_to_portal`, and a
-- practice row has lead_id null (and cannot be shared, see the check above).
-- Re-stated here only so the guarantee is visible next to the change.
comment on column public.storyboards.owner_id is
	'Owner of a practice session (lead_id is null). Cleared when the row is attached to a lead.';
comment on column public.storyboards.title is
	'Optional label for a practice session (max 80 chars).';
