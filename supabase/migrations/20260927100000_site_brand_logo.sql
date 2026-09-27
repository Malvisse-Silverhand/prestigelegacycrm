-- Official insurer logo shown on Agent Landing Pages, uploaded by a SuperAdmin
-- in Settings > Branding. Null = the page shows a text placeholder instead.
alter table public.site_settings add column if not exists brand_logo_url text;
