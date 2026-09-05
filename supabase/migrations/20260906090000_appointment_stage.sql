-- The Appointment column sits between Quoted and Closed Won: a lead that has
-- a confirmed meeting in the diary is further along than one that has only
-- been quoted, but isn't closed yet.
--
-- Its own migration because a new enum value can't be used in the same
-- transaction that adds it, and the appointments table below references leads
-- that will be moved into this stage.
alter type pipeline_stage add value if not exists 'appointment' after 'quoted';
