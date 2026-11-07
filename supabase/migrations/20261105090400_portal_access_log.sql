-- Financial Storyboard, step 5 of 6: who touched the portal, and when.
--
-- An append-only trail of portal events for one lead, so an agent or manager can
-- answer "did they open it? did someone keep guessing the phone number? when did
-- I turn sharing off?":
--
--   link_open    the link was opened (login screen shown)
--   login_ok     name and phone matched
--   login_fail   they did not (the visitor only ever sees one generic message)
--   locked       the rate limit tripped
--   view         a storyboard was viewed after logging in
--   share_on     the agent shared a storyboard
--   share_off    the agent un-shared it
--   link_revoked the agent revoked the link
--
-- Privacy: ip_hash is an HMAC computed by the server (never the raw address), so
-- the log supports "same person retried" without becoming a location record.
-- user_agent is stored as sent. No name, phone or IC number is ever written
-- here -- not even the wrong ones typed on a failed login.
--
-- storyboard_id is set null if the storyboard is deleted: the fact that it was
-- viewed outlives the row. lead_id cascades, so deleting a lead takes its trail
-- with it.
--
-- Writes: NO insert policy. Every event is written by the server with the
-- service role. A signed-in user therefore cannot forge or erase entries.
-- Reads: follows lead visibility, so the owning agent and the managers above
-- them can read it, and nobody else.
create table if not exists public.portal_access_log (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	storyboard_id uuid references public.storyboards(id) on delete set null,
	event text not null check (event in (
		'link_open', 'login_ok', 'login_fail', 'locked',
		'view', 'share_on', 'share_off', 'link_revoked'
	)),
	ip_hash text,
	user_agent text,
	created_at timestamptz not null default now()
);

create index if not exists portal_access_log_lead_created_idx
	on public.portal_access_log (lead_id, created_at desc);

alter table public.portal_access_log enable row level security;

drop policy if exists "portal log follows lead visibility" on public.portal_access_log;
create policy "portal log follows lead visibility" on public.portal_access_log for select using (
	exists (select 1 from public.leads l where l.id = portal_access_log.lead_id)
);

revoke all on public.portal_access_log from anon;
revoke insert, update, delete on public.portal_access_log from authenticated;
