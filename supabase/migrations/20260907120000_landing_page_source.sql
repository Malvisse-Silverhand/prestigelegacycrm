-- Leads that arrive through an agent's own landing page get their own source,
-- so Lead Sources reporting can tell self-generated funnel traffic apart from
-- paid ads and referrals. Its own migration because a new enum value can't be
-- used in the same transaction that adds it.
alter type lead_source_enum add value if not exists 'Landing Page' after 'Threads';
