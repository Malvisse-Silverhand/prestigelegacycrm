-- Agent Landing Page: per-agent URL namespace (/<agent_slug>/<page_slug>),
-- profile-level landing images, the new 'agent' layout, and a public
-- Storage bucket for landing images (read: anyone; write: own folder only).

-- 1. Profile columns -------------------------------------------------------
alter table public.profiles
	add column if not exists agent_slug text,
	add column if not exists landing_logo_url text,
	add column if not exists landing_header_url text,
	add column if not exists landing_photo_url text;
-- No grants: authenticated can only UPDATE profiles.is_active; these are
-- written by server actions through the service role, like updateMyProfile.

-- 2. Reserved words (top-level routes) ------------------------------------
create or replace function public.is_reserved_agent_slug(s text)
returns boolean language sql immutable set search_path = public as $$
	select s = any (array[
		'api','app','admin','auth','appointments','change-password','dashboard',
		'forgot-password','join','lead-generation','leads','login','logout','me',
		'my-sales','manage-cases','servicing','notifications','p','pipeline',
		'quotations','reset-password','settings','sijil','statistics','team',
		'tools','wa-flow','monitoring','static','public','assets','images'
	])
$$;

do $$ begin
	if not exists (select 1 from pg_constraint where conname = 'profiles_agent_slug_valid') then
		alter table public.profiles add constraint profiles_agent_slug_valid check (
			agent_slug is null or (
				agent_slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'
				and agent_slug !~ '--'
				and not public.is_reserved_agent_slug(agent_slug)
			)
		);
	end if;
end $$;

create unique index if not exists profiles_agent_slug_key on public.profiles (agent_slug);

-- 3. Default slug = full name slugified, de-duplicated with -2, -3 ... ------
create or replace function public.generate_agent_slug(p_name text, p_id uuid)
returns text language plpgsql volatile set search_path = public as $$
declare
	base text;
	candidate text;
	n int := 1;
begin
	base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
	base := trim(both '-' from left(base, 50));
	if base = '' then base := 'ejen'; end if;
	if public.is_reserved_agent_slug(base) then base := base || '-ejen'; end if;
	candidate := base;
	while exists (select 1 from public.profiles where agent_slug = candidate and id <> p_id) loop
		n := n + 1;
		candidate := base || '-' || n;
	end loop;
	return candidate;
end $$;

create or replace function public.profiles_set_agent_slug()
returns trigger language plpgsql set search_path = public as $$
begin
	if new.agent_slug is null or new.agent_slug = '' then
		new.agent_slug := public.generate_agent_slug(new.full_name, new.id);
	end if;
	return new;
end $$;

drop trigger if exists profiles_set_agent_slug on public.profiles;
create trigger profiles_set_agent_slug
	before insert on public.profiles
	for each row execute function public.profiles_set_agent_slug();

-- Service-role only (same pattern as increment_landing_view).
revoke execute on function public.generate_agent_slug(text, uuid) from public, anon, authenticated;
grant execute on function public.generate_agent_slug(text, uuid) to service_role;

-- Backfill one row per statement so each sees the previous row's slug.
do $$ declare r record; begin
	for r in select id, full_name from public.profiles where agent_slug is null order by created_at, id loop
		update public.profiles set agent_slug = public.generate_agent_slug(r.full_name, r.id) where id = r.id;
	end loop;
end $$;

-- 4. New layout ------------------------------------------------------------
alter table public.landing_pages drop constraint if exists landing_pages_layout_check;
alter table public.landing_pages
	add constraint landing_pages_layout_check
	check (layout in ('full', 'quickquote', 'medical', 'agent'));

-- 5. Storage bucket for landing images ------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landing-assets', 'landing-assets', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
	public = true,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: reads go through the public URL and need no SELECT policy.
-- Writes: signed-in users, only inside a folder named after their own uid.
drop policy if exists "landing assets: read own folder" on storage.objects;
create policy "landing assets: read own folder" on storage.objects
	for select to authenticated
	using (bucket_id = 'landing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "landing assets: upload to own folder" on storage.objects;
create policy "landing assets: upload to own folder" on storage.objects
	for insert to authenticated
	with check (bucket_id = 'landing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "landing assets: update own folder" on storage.objects;
create policy "landing assets: update own folder" on storage.objects
	for update to authenticated
	using (bucket_id = 'landing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
	with check (bucket_id = 'landing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "landing assets: delete own folder" on storage.objects;
create policy "landing assets: delete own folder" on storage.objects
	for delete to authenticated
	using (bucket_id = 'landing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
