-- Submission sits between a booked appointment and an inforced policy: the
-- case has gone to the operator and is waiting on underwriting. It is its own
-- column because that wait is real work an agent has to track -- until now a
-- submitted case looked identical to one still being chased.
--
-- Alone in its own migration on purpose: Postgres will not let a value added
-- by ALTER TYPE be *used* in the same transaction that added it, and Supabase
-- runs each migration file in one. The appointment and servicing stages were
-- added exactly this way.
alter type pipeline_stage add value if not exists 'submission' after 'appointment';
