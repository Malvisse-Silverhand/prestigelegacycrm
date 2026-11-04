-- Daily lead distribution + weekly report.
--
-- A manager uploads a lead list into a "pool" (an upload batch whose staged rows
-- wait, unassigned), sets a schedule (how many a day, what time, which days,
-- how to split between which agents), and the hourly job hands out that many
-- leads each day. Every run is logged; the distributor's upline and every
-- SuperAdmin get an email report.
--
-- All new tables are service-role only (RLS on, no policies -- the same posture
-- as lead_import_batches and rate_limits): every read and write goes through
-- server code that checks who the caller is first.

-- 1. Pools are upload batches with a new status / mode ------------------------
alter table public.lead_import_batches drop constraint if exists lead_import_batches_status_check;
alter table public.lead_import_batches
  add constraint lead_import_batches_status_check
  check (status in ('staged', 'assigning', 'done', 'cancelled', 'pooled'));

alter table public.lead_import_batches drop constraint if exists lead_import_batches_mode_check;
alter table public.lead_import_batches
  add constraint lead_import_batches_mode_check
  check (mode in ('self', 'even', 'percent', 'count', 'manual', 'pool'));

create index if not exists lead_import_batches_pooled_idx
  on public.lead_import_batches (created_by, created_at)
  where status = 'pooled';

-- 2. One schedule per manager --------------------------------------------------
create table if not exists public.lead_distribution_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  is_active boolean not null default false,
  daily_count integer not null default 10 check (daily_count between 1 and 500),
  -- Hour of day in Malaysia time (UTC+8), 0-23.
  run_hour smallint not null default 9 check (run_hour between 0 and 23),
  -- ISO weekdays: 1 = Monday ... 7 = Sunday.
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(days_of_week) between 1 and 7 and days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[]),
  mode text not null default 'even' check (mode in ('even', 'percent', 'count')),
  recipients uuid[] not null default '{}',
  -- agent id -> percent (mode 'percent') or daily number (mode 'count').
  split_values jsonb not null default '{}'::jsonb check (jsonb_typeof(split_values) = 'object'),
  -- Malaysia calendar date of the last run (cron or manual) -- one run a day.
  last_run_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_distribution_schedules_due_idx
  on public.lead_distribution_schedules (run_hour)
  where is_active;

-- 3. Run history ---------------------------------------------------------------
create table if not exists public.lead_distribution_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.lead_distribution_schedules(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  run_date date not null,
  trigger text not null check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'done', 'skipped', 'failed')),
  requested integer not null default 0,
  distributed integer not null default 0,
  -- [{ "agent_id": "...", "name": "...", "count": 3 }, ...]
  per_agent jsonb not null default '[]'::jsonb,
  pool_remaining integer,
  note text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The hourly job may fire twice (pg_cron + the Vercel fallback): only one
-- scheduled run per schedule per day can ever be claimed.
create unique index if not exists lead_distribution_runs_one_cron_per_day
  on public.lead_distribution_runs (schedule_id, run_date)
  where trigger = 'cron';
create index if not exists lead_distribution_runs_owner_idx
  on public.lead_distribution_runs (owner_id, started_at desc);

-- 4. Weekly report -------------------------------------------------------------
create table if not exists public.weekly_report_runs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'sending' check (status in ('sending', 'sent', 'skipped', 'failed')),
  note text,
  created_at timestamptz not null default now(),
  unique (week_start, recipient_id)
);

alter table public.profiles
  add column if not exists weekly_report_opt_in boolean not null default true;

alter table public.site_settings
  add column if not exists weekly_report_enabled boolean not null default true;

alter table public.lead_distribution_schedules enable row level security;
alter table public.lead_distribution_runs enable row level security;
alter table public.weekly_report_runs enable row level security;
