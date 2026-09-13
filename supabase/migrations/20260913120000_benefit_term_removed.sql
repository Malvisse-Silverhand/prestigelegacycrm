-- Term comes off the benefit rows: it is on the operator's own certificate
-- print-out but an agent never has to key it, and a column that is always
-- null is worse than no column. Dropped rather than left in place because the
-- table shipped hours ago and holds no rows yet.
alter table case_benefits drop column if exists term;
