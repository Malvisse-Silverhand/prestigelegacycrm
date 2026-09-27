-- Landing page header background cover, shared by every Agent Landing Page
-- that hasn't set its own header image, uploaded by a SuperAdmin in
-- Settings > Branding. Null = the page falls back to the built-in red
-- pattern (public/brand/ge-pattern-red.jpg), same as before this column
-- existed.
alter table public.site_settings add column if not exists brand_cover_url text;
