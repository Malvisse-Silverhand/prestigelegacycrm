-- One shareable, revocable link per certificate, for the client themselves.
--
-- The client has no account and never will: the token in the URL is the only
-- credential. Everything that follows from that is deliberate --
--
--   * one link per case, so revoking never touches another client;
--   * the token is long and random, generated in the database rather than by
--     the app, so it cannot be derived from a lead number or a certificate;
--   * the portal reads through the service role (the visitor has no session),
--     so this table needs no anon-readable policy and never gets one;
--   * `revoked_at` is a timestamp, not a delete, because "when did we close
--     this" is a question that gets asked after the fact.
create table if not exists public.client_portal_links (
	id uuid primary key default gen_random_uuid(),
	submission_id uuid not null references public.case_submissions(id) on delete cascade,
	token text not null,

	-- What the client sees at the top of the page. Null means "follow the case
	-- status", which is right almost always; the override exists because a
	-- certificate can be in a state the case record has no word for -- a grace
	-- period, a reinstatement in progress -- and the agent servicing it knows
	-- which before the system does.
	display_status text check (display_status in ('inforce', 'grace', 'lapsed', 'pending', 'terminated')),

	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	revoked_at timestamptz,
	revoked_by uuid references public.profiles(id) on delete set null,

	-- Opened counts, so an agent can tell whether the client ever looked
	-- before asking them again. No IP, no user agent, nothing identifying:
	-- this is a servicing signal, not analytics.
	first_opened_at timestamptz,
	last_opened_at timestamptz,
	open_count integer not null default 0
);

-- A case gets one link at a time. Issuing a new one revokes the old one, and
-- this index is what makes that impossible to get wrong.
create unique index if not exists client_portal_links_active_key
	on public.client_portal_links (submission_id)
	where revoked_at is null;

create unique index if not exists client_portal_links_token_key
	on public.client_portal_links (token);

alter table public.client_portal_links enable row level security;

-- Same rule as the case itself: visibility is inherited from the lead, so the
-- owning agent sees it and every AUM / UM / GM / SuperAdmin above them does
-- too -- which is exactly the revoke list this was asked for. No role list is
-- repeated here; if lead visibility changes, this follows.
drop policy if exists "portal links follow case visibility" on public.client_portal_links;
create policy "portal links follow case visibility" on public.client_portal_links for all using (
	exists (select 1 from public.case_submissions s where s.id = client_portal_links.submission_id)
) with check (
	exists (select 1 from public.case_submissions s where s.id = submission_id)
);

-- A v4 uuid with the dashes taken out: 32 characters, 122 bits of randomness.
-- Guessing is not a threat model at that width, and it still pastes into
-- WhatsApp without wrapping. pgcrypto lives in the extensions schema here, so
-- this deliberately uses the built-in rather than gen_random_bytes.
create or replace function public.new_portal_token()
returns text
language sql
volatile
as $tok$
	select replace(gen_random_uuid()::text, '-', '');
$tok$;

alter table public.client_portal_links
	alter column token set default public.new_portal_token();
