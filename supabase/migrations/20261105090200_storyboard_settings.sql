-- Financial Storyboard, step 3 of 6: customisable defaults.
--
-- Two layers of the same shape, merged by the app (agent over org):
--
--   scope = 'org'    the agency-wide defaults: plan names, multiples, the
--                    statistics placeholders and their `source` notes. Every
--                    signed-in user reads them; only a SuperAdmin writes them.
--   scope = 'agent'  one agent's own overrides of scripts, objection answers and
--                    checklist items. Visible and writable only by that agent.
--                    Not even their manager reads these -- they are a personal
--                    working script, not a record.
--
-- owner_id is null exactly when scope = 'org', and the CHECK enforces it in both
-- directions so an 'agent' row can never be ownerless (and therefore readable by
-- nobody, or by everybody, depending on how the policy treated null).
--
-- Uniqueness is one row per (scope, owner, module). A plain UNIQUE constraint
-- would treat two NULL owner_ids as distinct and allow duplicate org rows, so
-- the index coalesces null to the all-zero uuid, the usual workaround. Server
-- code upserting these rows must target that same expression.
--
-- Settings are agent-visible only: the portal never receives them (the portal
-- function selects client_summary and nothing else).
create table if not exists public.storyboard_settings (
	id uuid primary key default gen_random_uuid(),
	scope text not null check (scope in ('org', 'agent')),
	owner_id uuid references public.profiles(id) on delete cascade,
	module public.storyboard_module not null,
	settings jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now(),
	updated_by uuid references public.profiles(id) on delete set null,

	constraint storyboard_settings_owner_matches_scope check (
		(scope = 'org' and owner_id is null)
		or (scope = 'agent' and owner_id is not null)
	)
);

create unique index if not exists storyboard_settings_scope_owner_module_key
	on public.storyboard_settings (scope, coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), module);

drop trigger if exists storyboard_settings_touch_updated_at on public.storyboard_settings;
create trigger storyboard_settings_touch_updated_at
	before update on public.storyboard_settings
	for each row execute function public.storyboard_touch_updated_at();

alter table public.storyboard_settings enable row level security;

-- Org rows: readable by any signed-in user, writable by SuperAdmin only. The
-- write policies are split per command (rather than FOR ALL) so that the SELECT
-- policy for everyone and the write policy for one role do not need to be
-- reasoned about together.
drop policy if exists "org settings readable by all" on public.storyboard_settings;
create policy "org settings readable by all" on public.storyboard_settings for select using (
	scope = 'org' and (select auth.uid()) is not null
);

drop policy if exists "org settings inserted by superadmin" on public.storyboard_settings;
create policy "org settings inserted by superadmin" on public.storyboard_settings for insert with check (
	scope = 'org' and (select public.current_role()) = 'superadmin'
);

drop policy if exists "org settings updated by superadmin" on public.storyboard_settings;
create policy "org settings updated by superadmin" on public.storyboard_settings for update using (
	scope = 'org' and (select public.current_role()) = 'superadmin'
) with check (
	scope = 'org' and (select public.current_role()) = 'superadmin'
);

drop policy if exists "org settings deleted by superadmin" on public.storyboard_settings;
create policy "org settings deleted by superadmin" on public.storyboard_settings for delete using (
	scope = 'org' and (select public.current_role()) = 'superadmin'
);

-- Agent rows: the owner, and only the owner, for every command.
drop policy if exists "agent settings select own" on public.storyboard_settings;
create policy "agent settings select own" on public.storyboard_settings for select using (
	scope = 'agent' and owner_id = (select auth.uid())
);

drop policy if exists "agent settings insert own" on public.storyboard_settings;
create policy "agent settings insert own" on public.storyboard_settings for insert with check (
	scope = 'agent' and owner_id = (select auth.uid())
);

drop policy if exists "agent settings update own" on public.storyboard_settings;
create policy "agent settings update own" on public.storyboard_settings for update using (
	scope = 'agent' and owner_id = (select auth.uid())
) with check (
	scope = 'agent' and owner_id = (select auth.uid())
);

drop policy if exists "agent settings delete own" on public.storyboard_settings;
create policy "agent settings delete own" on public.storyboard_settings for delete using (
	scope = 'agent' and owner_id = (select auth.uid())
);

-- Which row a setting belongs to (scope, owner, module) is identity, not data:
-- only the payload and its audit field may be rewritten in place.
revoke all on public.storyboard_settings from anon;
revoke update on public.storyboard_settings from authenticated;
grant update (settings, updated_by) on public.storyboard_settings to authenticated;
