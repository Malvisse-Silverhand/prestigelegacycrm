-- Support: tickets (with a reply thread) and the product roadmap.
--
-- Who sees what is decided HERE, in RLS, not only in the app:
--   * a ticket and its replies are visible to the agent who raised it and to
--     SuperAdmins -- nobody else, not even that agent's managers;
--   * only SuperAdmins change a ticket's status/assignee (the raiser can add
--     replies and that is all);
--   * every signed-in user can read the roadmap; only SuperAdmins write it.
-- The app's server actions check the same rules again and write through the
-- service role, so these policies are the backstop for anyone calling the
-- API directly with their own session.
--
-- The changelog is not here: it is a file in the codebase (lib/changelog.ts),
-- written alongside each release, so it never needs a table.

-- 1. Tickets ----------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no bigint generated always as identity unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 140),
  category text not null default 'question'
    check (category in ('bug', 'question', 'feature_request', 'data_fix', 'access', 'other')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_on_agent', 'resolved', 'closed')),
  description text not null check (char_length(description) between 1 and 5000),
  page_url text check (page_url is null or char_length(page_url) <= 500),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_created_by_idx on public.support_tickets (created_by);
create index if not exists support_tickets_status_idx on public.support_tickets (status, updated_at desc);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
create index if not exists support_ticket_messages_author_idx on public.support_ticket_messages (author_id);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists "tickets: raiser or superadmin reads" on public.support_tickets;
create policy "tickets: raiser or superadmin reads" on public.support_tickets
  for select to authenticated
  using (created_by = (select auth.uid()) or (select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "tickets: raise your own" on public.support_tickets;
create policy "tickets: raise your own" on public.support_tickets
  for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'open' and assigned_to is null);

drop policy if exists "tickets: superadmin updates" on public.support_tickets;
create policy "tickets: superadmin updates" on public.support_tickets
  for update to authenticated
  using ((select "current_role"()) = 'superadmin'::user_role)
  with check ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "ticket messages: visible with the ticket" on public.support_ticket_messages;
create policy "ticket messages: visible with the ticket" on public.support_ticket_messages
  for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (t.created_by = (select auth.uid()) or (select "current_role"()) = 'superadmin'::user_role)
  ));

drop policy if exists "ticket messages: reply on a ticket you can see" on public.support_ticket_messages;
create policy "ticket messages: reply on a ticket you can see" on public.support_ticket_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and t.status <> 'closed'
        and (t.created_by = (select auth.uid()) or (select "current_role"()) = 'superadmin'::user_role)
    )
  );
-- No update/delete policies on either table: a reply, once sent, stays.

-- 2. Roadmap -----------------------------------------------------------------
create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 2000),
  area text check (area is null or char_length(area) <= 60),
  status text not null default 'planned'
    check (status in ('shipped', 'in_progress', 'planned', 'exploring')),
  target text check (target is null or char_length(target) <= 40),
  shipped_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists roadmap_items_status_idx on public.roadmap_items (status, sort_order);
create index if not exists roadmap_items_updated_by_idx on public.roadmap_items (updated_by);

alter table public.roadmap_items enable row level security;

drop policy if exists "roadmap: everyone signed in reads" on public.roadmap_items;
create policy "roadmap: everyone signed in reads" on public.roadmap_items
  for select to authenticated using (true);

drop policy if exists "roadmap: superadmin inserts" on public.roadmap_items;
create policy "roadmap: superadmin inserts" on public.roadmap_items
  for insert to authenticated with check ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "roadmap: superadmin updates" on public.roadmap_items;
create policy "roadmap: superadmin updates" on public.roadmap_items
  for update to authenticated
  using ((select "current_role"()) = 'superadmin'::user_role)
  with check ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "roadmap: superadmin deletes" on public.roadmap_items;
create policy "roadmap: superadmin deletes" on public.roadmap_items
  for delete to authenticated using ((select "current_role"()) = 'superadmin'::user_role);

-- 3. Reserve "support" as an agent link name --------------------------------
-- /support/tickets has the same two-part shape as an agent landing page URL
-- (/<agent>/<page>), so "support" must never be claimable as an agent slug.
-- Same list as 20260927090000, plus 'support'.
create or replace function public.is_reserved_agent_slug(s text)
returns boolean language sql immutable set search_path = public as $$
	select s = any (array[
		'api','app','admin','auth','appointments','change-password','dashboard',
		'forgot-password','join','lead-generation','leads','login','logout','me',
		'my-sales','manage-cases','servicing','notifications','p','pipeline',
		'quotations','reset-password','settings','sijil','statistics','team',
		'tools','wa-flow','monitoring','static','public','assets','images',
		'support'
	])
$$;
