-- Takaful closing scripts: the objection-handling and closing library agents
-- work from, sitting under WA Flow next to the message templates.
--
-- Separate from wa_templates on purpose. A wa_template is a message you send
-- as-is, filed by funnel stage; a script is a piece of conversation an agent
-- adapts, filed by the situation they are in ("Saya dah ada polisi"), and it
-- carries the reasoning for why it works. Forcing them into one table would
-- mean a category enum that means two different things.
create table takaful_scripts (
	id uuid primary key default gen_random_uuid(),
	-- The number the script is known by in the source material, so an agent
	-- who learned "#37" can still find it.
	script_no integer not null,
	chapter text not null,
	chapter_order integer not null default 0,
	-- The situation this script is for -- what an agent scans the list for.
	situation text not null,
	body text not null,
	-- Why the script works. The reason is the part that makes an agent able to
	-- improvise when the conversation goes sideways.
	why text,
	tags text[] not null default '{}',
	sort_order integer not null default 0,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	updated_by uuid references profiles(id) on delete set null
);

create unique index takaful_scripts_script_no_key on takaful_scripts (script_no);
create index takaful_scripts_chapter_idx on takaful_scripts (chapter_order, sort_order);

alter table takaful_scripts enable row level security;

-- Every signed-in person reads them: this is the sales library, and an agent
-- who cannot open it has no use for the page.
create policy "everyone reads takaful scripts" on takaful_scripts for select using (
	auth.uid() is not null
);

-- SuperAdmin alone edits. These are the words the whole agency puts in front
-- of clients; a wording change is an org-wide decision, not a personal note.
create policy "superadmin inserts takaful scripts" on takaful_scripts for insert with check (
	public.current_role() = 'superadmin'
);
create policy "superadmin updates takaful scripts" on takaful_scripts for update using (
	public.current_role() = 'superadmin'
) with check (
	public.current_role() = 'superadmin'
);
create policy "superadmin deletes takaful scripts" on takaful_scripts for delete using (
	public.current_role() = 'superadmin'
);
