-- Lead documents: the IC (front + back) and bank card (front only) photos the
-- prospect uploads from the Stage 2 lead form.
--
-- These are identity documents, so unlike the public landing-assets bucket the
-- bucket here is PRIVATE and has no storage policies at all: nothing can read
-- or write it with an anon / authenticated key. The public form gets a
-- one-shot signed upload URL from a Server Action (after checking the form
-- token), and the CRM reads through short-lived signed URLs minted by a Server
-- Action after an RLS-scoped lookup of the lead_documents row.

-- 1. Private bucket -------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-documents', 'lead-documents', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
	public = false,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- 2. Rows -----------------------------------------------------------------
create table if not exists public.lead_documents (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leads(id) on delete cascade,
	link_id uuid references public.lead_form_links(id) on delete set null,
	kind text not null check (kind in ('ic_front', 'ic_back', 'bank_card')),
	-- Path inside the lead-documents bucket: <lead_id>/<kind>-<random>.<ext>
	storage_path text not null,
	mime_type text not null,
	size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
	uploaded_at timestamptz not null default now(),
	-- One current document per kind per lead: a re-upload replaces the row.
	unique (lead_id, kind)
);
create index if not exists lead_documents_lead_idx on public.lead_documents (lead_id);

alter table public.lead_documents enable row level security;

-- Read-only for the CRM, inheriting lead visibility (agent: own, leaders:
-- downline, ...) exactly like lead_signatures. Written only by the public form
-- through the service role, so an agent cannot forge or swap a client's ID.
drop policy if exists "documents readable with lead" on public.lead_documents;
create policy "documents readable with lead" on public.lead_documents for select using (
	exists (select 1 from public.leads l where l.id = lead_documents.lead_id)
);

revoke insert, update, delete on public.lead_documents from authenticated, anon;
