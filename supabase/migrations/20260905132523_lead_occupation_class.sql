-- Occupation Class: the takaful risk-rating band (1-4) for the lead's job,
-- same scale the standalone calculators already collect (mq-occ in
-- imedi-evolusi-quote.html) and the same occupation directory link an agent
-- checks it against. Nullable -- unknown until an agent asks, same as
-- gender/is_smoker.
create type occupation_class as enum ('1', '2', '3', '4');

alter table leads
	add column occupation_class occupation_class;

-- RLS is enforced per-row, not per-column (see 20260829152002's note on the
-- same point for gender/is_smoker) -- no new policy needed.
