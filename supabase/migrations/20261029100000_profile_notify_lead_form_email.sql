-- Per-agent switch for the "lead has submitted their form" email (see
-- lib/lead-forms.ts). On by default: an agent opts out, not in.
--
-- Written only through a Server Action with the service role, like the rest of
-- the own-profile fields (see updateMyProfile), so no new grant or policy.
alter table public.profiles
	add column if not exists notify_lead_form_email boolean not null default true;

comment on column public.profiles.notify_lead_form_email is
	'Email this user when one of their leads submits a lead form link.';
