-- New hierarchy level, sitting between Unit Manager and Agent:
--   Superadmin > Group Manager > Unit Manager > Aspirant Unit Manager > Agent
--
-- Postgres won't let a newly added enum value be *used* in the same
-- transaction that adds it, and `supabase db push` wraps each migration file
-- in one transaction -- so this file does nothing but add the value. Every
-- function/policy that references it lives in the next migration.
--
-- `before 'agent'` keeps the enum's own ordering matching the org ranking,
-- so any future `order by role` sorts top-down without a CASE.

alter type user_role add value if not exists 'aspirant_unit_manager' before 'agent';
