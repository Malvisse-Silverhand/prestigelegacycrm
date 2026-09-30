-- The system-wide brand colour (sidebar, dark cards, primary buttons), chosen
-- by a SuperAdmin in Settings > Branding. Null = the default "Prestige Blue"
-- (#0f2540), i.e. exactly how the system looked before this column existed.
-- The check keeps anything but a plain #rrggbb value out of the table, since
-- the value is later written into a CSS custom property.
alter table public.site_settings add column if not exists brand_primary text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_settings_brand_primary_hex') then
    alter table public.site_settings
      add constraint site_settings_brand_primary_hex
      check (brand_primary is null or brand_primary ~ '^#[0-9a-f]{6}$');
  end if;
end $$;
