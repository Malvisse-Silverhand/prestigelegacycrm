-- Per-agent switch for the "you have a new lead" emails. On by default; an agent
-- turns it off in Settings > My Profile.
--
-- Written only through a server action (service role) that checks the caller is
-- changing their own row: authenticated users can UPDATE nothing on profiles
-- except is_active (see 20260828150000_section2_rls_fixes.sql), so nobody can
-- flip someone else's switch through the API.

alter table public.profiles
  add column if not exists lead_emails_enabled boolean not null default true;
