-- Manual lead management: a manager uploads a lead database, it is staged,
-- distributed to their team, and the resulting leads carry a "Leader Assigned"
-- tag.
--
-- Two staging tables hold an upload between "file read" and "leads created",
-- so a half-finished assignment can be resumed and the manager can review the
-- plan before anything lands on an agent. Both are reachable only through the
-- service role (RLS on, no policies -- the same posture as rate_limits): every
-- read and write goes through a server action that checks the caller is the
-- batch's creator (or a SuperAdmin).

create table if not exists public.lead_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('csv', 'sheet')),
  filename text check (filename is null or char_length(filename) <= 200),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  invalid_rows integer not null default 0,
  -- 'self' = the uploader keeps everything (agents, or a manager keeping all).
  mode text not null default 'self' check (mode in ('self', 'even', 'percent', 'count', 'manual')),
  status text not null default 'staged' check (status in ('staged', 'assigning', 'done', 'cancelled')),
  plan jsonb,
  inserted_rows integer not null default 0,
  emails_sent integer not null default 0,
  emails_skipped integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists lead_import_batches_created_by_idx
  on public.lead_import_batches (created_by, created_at desc);

create table if not exists public.lead_import_rows (
  batch_id uuid not null references public.lead_import_batches(id) on delete cascade,
  idx integer not null,
  data jsonb not null,
  -- Filled when the assignment plan is saved; null until then.
  agent_id uuid references public.profiles(id) on delete set null,
  primary key (batch_id, idx)
);

create index if not exists lead_import_rows_agent_idx on public.lead_import_rows (agent_id);

alter table public.lead_import_batches enable row level security;
alter table public.lead_import_rows enable row level security;

-- Leads: who assigned it (non-null = "Leader Assigned"), when, and from which
-- upload. Left null for leads an agent adds or uploads for themselves and for
-- leads a manager keeps for themselves.
alter table public.leads
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists import_batch_id uuid references public.lead_import_batches(id) on delete set null;

create index if not exists leads_import_batch_idx on public.leads (import_batch_id) where import_batch_id is not null;
create index if not exists leads_assigned_by_idx on public.leads (assigned_by) where assigned_by is not null;
