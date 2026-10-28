-- Lead form links: a per-lead, revocable link the prospect opens on their phone
-- to fill in what the agent is missing (Stage 1: additional details) or the
-- full application with nominees and a signature (Stage 2).
--
-- Same trust model as the client portal: the prospect has no account, the
-- token in the URL is the credential, and every public read/write goes through
-- the service role in a Server Action. Nothing here gets an anon policy.

-- 1. New lead columns -----------------------------------------------------
-- Everything the two forms collect that a lead could not hold until now. The
-- forms write straight onto the lead, so these are ordinary lead columns,
-- nullable like gender / is_smoker: unknown until somebody asks.
alter table public.leads
	add column if not exists id_no text,
	add column if not exists city text,
	add column if not exists marital_status text,
	add column if not exists nationality text,
	add column if not exists race text,
	add column if not exists religion text,
	add column if not exists height_cm numeric(5, 1),
	add column if not exists weight_kg numeric(5, 1),
	add column if not exists has_medical_condition boolean,
	add column if not exists medical_condition_details text,
	add column if not exists employer_name text,
	add column if not exists employer_address text,
	add column if not exists income_range text,
	add column if not exists correspondence_same boolean,
	add column if not exists correspondence_address text,
	add column if not exists correspondence_city text,
	add column if not exists correspondence_postcode text,
	add column if not exists correspondence_state text,
	add column if not exists bank_name text,
	add column if not exists bank_account_no text,
	add column if not exists payment_frequency text,
	add column if not exists payment_method text;

alter table public.leads drop constraint if exists leads_marital_status_valid;
alter table public.leads add constraint leads_marital_status_valid check (
	marital_status is null or marital_status in ('Single', 'Married', 'Divorced', 'Widowed')
);
alter table public.leads drop constraint if exists leads_payment_frequency_valid;
alter table public.leads add constraint leads_payment_frequency_valid check (
	payment_frequency is null or payment_frequency in ('Monthly', 'Quarterly', 'Yearly')
);
alter table public.leads drop constraint if exists leads_payment_method_valid;
alter table public.leads add constraint leads_payment_method_valid check (
	payment_method is null or payment_method in ('Debit Card', 'Credit Card')
);

comment on column public.leads.city is 'City / district, from the address.';
comment on column public.leads.id_no is 'NRIC / passport number, collected by the Stage 2 form.';

-- RLS is per row, not per column (see 20260829152002): the existing leads
-- policies already gate these columns. No new policy.

-- 2. Links ----------------------------------------------------------------
create table if not exists public.lead_form_links (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	stage smallint not null check (stage in (1, 2)),
	-- Generated in the database, same helper as the client portal: 32 hex
	-- characters, 122 bits, not derivable from anything on the lead.
	token text not null default public.new_portal_token(),

	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null default (now() + interval '7 days'),
	revoked_at timestamptz,
	revoked_by uuid references public.profiles(id) on delete set null,

	-- Opens counted the same way as the portal: a servicing signal, no IP.
	first_opened_at timestamptz,
	last_opened_at timestamptz,
	open_count integer not null default 0,

	-- "expired" and "revoked" are derived from expires_at / revoked_at, never
	-- stored, so they cannot disagree with the timestamps.
	status text not null default 'sent' check (status in ('sent', 'opened', 'in_progress', 'completed')),

	-- Save-and-resume: { values: {field: string}, nominees: [...] }. Cleared on
	-- submit -- the lead row is the record once it is submitted.
	draft jsonb,
	draft_saved_at timestamptz,
	submitted_at timestamptz
);

create unique index if not exists lead_form_links_token_key on public.lead_form_links (token);
create index if not exists lead_form_links_lead_idx on public.lead_form_links (lead_id, created_at desc);

alter table public.lead_form_links enable row level security;

-- Visibility is inherited from the lead (agent: own, leaders: downline, ...),
-- exactly as client_portal_links and case_submissions do. No role list here.
drop policy if exists "form links follow lead visibility" on public.lead_form_links;
create policy "form links follow lead visibility" on public.lead_form_links for all using (
	exists (select 1 from public.leads l where l.id = lead_form_links.lead_id)
) with check (
	exists (select 1 from public.leads l where l.id = lead_id)
);

-- The CRM side may only ever move the lifecycle timestamps. Status, draft and
-- open counters are written by the public form through the service role; an
-- agent must not be able to mark a form completed or edit a prospect's draft
-- through a direct PostgREST call.
revoke update on public.lead_form_links from authenticated, anon;
grant update (expires_at, revoked_at, revoked_by) on public.lead_form_links to authenticated;

-- Counting an open, as one statement (see 20260914210000). Also moves a link
-- from "sent" to "opened" without ever demoting in_progress / completed.
create or replace function public.bump_form_open(link_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $fn$
	update public.lead_form_links
	set open_count = open_count + 1,
	    last_opened_at = now(),
	    first_opened_at = coalesce(first_opened_at, now()),
	    status = case when status = 'sent' then 'opened' else status end
	where id = link_id
	  and revoked_at is null;
$fn$;

revoke all on function public.bump_form_open(uuid) from public;
revoke all on function public.bump_form_open(uuid) from anon;
revoke all on function public.bump_form_open(uuid) from authenticated;

-- 3. Nominees -------------------------------------------------------------
-- Lead-level hibah nominees, up to four. Separate from case_nominees (those
-- belong to a filed case) and from family leads (a nominee is not a prospect).
create table if not exists public.lead_nominees (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	position smallint not null check (position between 1 and 4),
	name text not null,
	id_no text,
	relationship text,
	phone text,
	share_percent numeric(5, 2) check (share_percent is null or (share_percent >= 0 and share_percent <= 100)),
	date_of_birth date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- This pair is what enforces "max 4": positions 1-4, one row each.
	unique (lead_id, position)
);

alter table public.lead_nominees enable row level security;

drop policy if exists "nominees follow lead visibility" on public.lead_nominees;
create policy "nominees follow lead visibility" on public.lead_nominees for all using (
	exists (select 1 from public.leads l where l.id = lead_nominees.lead_id)
) with check (
	exists (select 1 from public.leads l where l.id = lead_id)
);

-- 4. Signatures -----------------------------------------------------------
-- The drawn signature as a PNG data URL, in the row itself. The repo has no
-- private storage bucket (its one bucket is public landing art), a signature
-- is a few KB, and keeping it in the table means it inherits lead visibility
-- through RLS instead of needing signed URLs. History is kept: a re-signed
-- form adds a row, the newest is the current one.
create table if not exists public.lead_signatures (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	link_id uuid references public.lead_form_links(id) on delete set null,
	image_data text not null check (image_data like 'data:image/png;base64,%' and length(image_data) <= 200000),
	signer_name text,
	consent boolean not null default false,
	signed_at timestamptz not null default now(),
	ip text,
	user_agent text
);
create index if not exists lead_signatures_lead_idx on public.lead_signatures (lead_id, signed_at desc);

alter table public.lead_signatures enable row level security;

-- Read-only for the CRM. Written only by the public form (service role), so a
-- signature cannot be forged or replaced from an agent's session.
drop policy if exists "signatures readable with lead" on public.lead_signatures;
create policy "signatures readable with lead" on public.lead_signatures for select using (
	exists (select 1 from public.leads l where l.id = lead_signatures.lead_id)
);

-- 5. Reserve "f" as an agent link name -------------------------------------
-- /f/<token> has the same two-part shape as /<agent>/<page>, so "f" must never
-- be claimable as an agent slug. Same list as 20261001090000, plus 'f'.
create or replace function public.is_reserved_agent_slug(s text)
returns boolean language sql immutable set search_path = public as $$
	select s = any (array[
		'api','app','admin','auth','appointments','change-password','dashboard',
		'forgot-password','join','lead-generation','leads','login','logout','me',
		'my-sales','manage-cases','servicing','notifications','p','pipeline',
		'quotations','reset-password','settings','sijil','statistics','team',
		'tools','wa-flow','monitoring','static','public','assets','images',
		'support','f'
	])
$$;
