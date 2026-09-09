-- Widens takaful_scripts to hold three script libraries instead of one:
-- Takaful, Medical Card, and Hibah & Faraid. Same shape (a chapter, a
-- situation, a body, a "why it works" note), same audience, same edit rule --
-- everyone reads, SuperAdmin writes -- so this is one table with a
-- discriminator column rather than three near-identical tables.
--
-- Kept the table's existing name deliberately, rather than renaming it to
-- something more generic: this table already carries 76 real, edited rows,
-- and a rename earns nothing a comment doesn't already say just as well --
-- see the one below.
--
-- `takaful_scripts` now holds three script libraries -- Takaful, Medical Card,
-- and Hibah & Faraid -- distinguished by script_set. The name is historical.
comment on table takaful_scripts is
	'Closing/objection scripts for three libraries (script_set: takaful, medical, hibah_faraid). Table name is historical -- it started as Takaful-only.';

alter table takaful_scripts add column script_set text not null default 'takaful';
alter table takaful_scripts add constraint takaful_scripts_script_set_valid check (
	script_set in ('takaful', 'medical', 'hibah_faraid')
);

-- script_no was globally unique because there was only ever one set. Each
-- imported library restarts its own numbering at #01, so uniqueness has to
-- be scoped per set instead.
drop index takaful_scripts_script_no_key;
create unique index takaful_scripts_set_script_no_key on takaful_scripts (script_set, script_no);

-- The existing chapter/sort index only ever served one set at a time from the
-- app (always filtered to one script_set first), so leading with script_set
-- keeps that filter+order on a single index scan instead of a scan-then-sort.
drop index if exists takaful_scripts_chapter_idx;
create index takaful_scripts_set_chapter_idx on takaful_scripts (script_set, chapter_order, sort_order);
