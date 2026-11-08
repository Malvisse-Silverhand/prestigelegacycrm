-- Financial Storyboard, step 2 of 6: the storyboard itself.
--
-- One row per (lead, module). It is the agent's working copy AND the source of
-- what the client may later see, so the columns are split by audience:
--
--   AGENT ONLY   inputs, outputs, step_status, notes, outcome
--                (the numbers the agent typed, the engine's full result, which
--                 of the four steps are done, private notes, how it ended)
--   CLIENT SAFE  client_summary
--                (a payload the app builds on save from `outputs`: the gap,
--                 the flow slides, the plan card, next steps. Nothing else.)
--
-- The portal never reads this table. It goes through public.portal_storyboards()
-- (see the portal_storyboard_view migration), which can only ever return
-- client_summary, so a client cannot be shown an agent-only column by a bug in
-- a page. This table's own RLS is purely about agents and managers.
--
-- Money inside inputs/outputs is whatever the engine produces; this table does
-- not interpret it. No IC number or other national identifier is stored here
-- on purpose -- identity stays on the lead record.
--
-- step_status is a jsonb object keyed by step: {"fill":"saved","explain":"none",
-- "risk":"none","objections":"none"}. The values are 'none' | 'saved'. A missing
-- key means 'none'.
--
-- Visibility and who can write
--   SELECT  follows lead visibility through `exists (select 1 from leads ...)`.
--           The leads policy already scopes agent (own), aspirant UM (downline),
--           UM (unit), GM (units + downline) and superadmin (all), and hides
--           soft-deleted leads from everyone below superadmin. Repeating that
--           role list here would be a second copy to forget; if lead visibility
--           changes, this follows. Same approach as client_portal_links.
--   INSERT / UPDATE
--           the lead's own agent (leads.agent_id = auth.uid(), checked inline: the
--           owns_lead() helper was dropped in 20260909100000) or a superadmin. Managers are
--           deliberately READ-ONLY: they can open a storyboard to coach, but
--           the analysis is the owning agent's work and the "saved by" trail
--           should not be muddied. The extra `exists (...leads...)` keeps the visibility check in
--           step with the select policy; the ownership check also requires
--           deleted_at is null, so a soft-deleted lead cannot be written to.
--   DELETE  superadmin only.
--
-- Column grants: authenticated may update only the working columns. lead_id and
-- module identify the row and never change; moving a storyboard to another lead
-- by a direct PostgREST call is not something any screen does.
create table if not exists public.storyboards (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	module public.storyboard_module not null,

	inputs jsonb not null default '{}'::jsonb,
	outputs jsonb not null default '{}'::jsonb,
	client_summary jsonb,
	step_status jsonb not null default '{}'::jsonb,
	notes text,

	-- How the conversation ended (step 4). Wired to the pipeline stage by the
	-- server action, not by this table.
	outcome text check (outcome in ('ready_for_quote', 'needs_spouse', 'follow_up_later', 'not_interested')),

	saved_at timestamptz,
	saved_by uuid references public.profiles(id) on delete set null,

	-- Off by default. Turning it on is what makes client_summary visible to the
	-- portal; turning it off takes effect on the next portal request.
	shared_to_portal boolean not null default false,
	shared_at timestamptz,
	shared_by uuid references public.profiles(id) on delete set null,

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint storyboards_lead_module_key unique (lead_id, module)
);

-- "Which storyboards are shared" is the sidebar list's filter and the portal's
-- whole query; the partial index keeps it tiny because most rows are not shared.
create index if not exists storyboards_shared_idx
	on public.storyboards (shared_to_portal)
	where shared_to_portal;

-- updated_at is maintained here, not by the app, so a direct write cannot leave
-- it stale. Shared with storyboard_settings.
create or replace function public.storyboard_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
	new.updated_at := now();
	return new;
end;
$fn$;

drop trigger if exists storyboards_touch_updated_at on public.storyboards;
create trigger storyboards_touch_updated_at
	before update on public.storyboards
	for each row execute function public.storyboard_touch_updated_at();

alter table public.storyboards enable row level security;

-- auth.uid() / current_role() are wrapped in (select ...) so Postgres evaluates
-- them once per statement rather than once per row (see
-- 20260924100000_rls_per_query_auth_calls.sql).
drop policy if exists "storyboards follow lead visibility" on public.storyboards;
create policy "storyboards follow lead visibility" on public.storyboards for select using (
	exists (select 1 from public.leads l where l.id = storyboards.lead_id)
);

drop policy if exists "storyboards written by lead owner" on public.storyboards;
create policy "storyboards written by lead owner" on public.storyboards for insert with check (
	(exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
	and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
);

drop policy if exists "storyboards updated by lead owner" on public.storyboards;
create policy "storyboards updated by lead owner" on public.storyboards for update using (
	(exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
	and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
) with check (
	(exists (select 1 from public.leads o where o.id = storyboards.lead_id and o.agent_id = (select auth.uid()) and o.deleted_at is null) or (select public.current_role()) = 'superadmin')
	and exists (select 1 from public.leads l where l.id = storyboards.lead_id)
);

drop policy if exists "storyboards deleted by superadmin" on public.storyboards;
create policy "storyboards deleted by superadmin" on public.storyboards for delete using (
	(select public.current_role()) = 'superadmin'
);

-- Anonymous visitors never touch this table (the portal uses the service role
-- through a security-definer function), so take the default grants away
-- entirely, then narrow what a signed-in user can rewrite.
revoke all on public.storyboards from anon;
revoke update on public.storyboards from authenticated;
grant update (
	inputs, outputs, client_summary, step_status, notes, outcome,
	saved_at, saved_by, shared_to_portal, shared_at, shared_by
) on public.storyboards to authenticated;
