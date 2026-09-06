-- Servicing sits after a policy is inforced: the client is on the books and
-- being looked after, which is a different job from chasing a sale. Keeping it
-- as its own column stops closed business from piling up in Closed Won
-- forever.
alter type pipeline_stage add value if not exists 'servicing' after 'closed_won';
