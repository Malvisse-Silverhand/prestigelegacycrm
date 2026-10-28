-- Each agent's own MTA (registered agent) number, set by the agent in
-- Settings > My Profile. The quotation calculators print it, with the agent's
-- name, in their footer and exported reports instead of a hardcoded person.
--
-- Written only through the service role (updateMyProfile), like name/phone, so
-- no new column grant to `authenticated` is needed.

alter table public.profiles
  add column if not exists mta_number text;

do $$
begin
  alter table public.profiles add constraint profiles_mta_number_valid
    check (mta_number is null or mta_number ~ '^[A-Za-z0-9-]{3,20}$');
exception when duplicate_object then null;
end $$;
