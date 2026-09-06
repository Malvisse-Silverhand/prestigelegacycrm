-- Every table below had no index beyond its primary key. That matters more
-- than it looks: RLS policies run on every single query against these
-- tables, and most of them filter by exactly the columns indexed here
-- (agent_id, unit_id, parent_id, lead_id, ...) -- current_role()/current_
-- unit_id() are cheap (keyed by profiles' primary key already), but
-- my_units() (units.group_manager_id) and my_downline() (profiles.parent_id)
-- were sequential-scanning their tables on every row-check, and every list
-- page in the app (leads, pipeline, dashboard, statistics, team) does its
-- own filtering/sorting on top of that. None of this changes what any query
-- returns -- purely additive, and there's no reason to wait for the data to
-- grow large enough to notice before it's in place.

-- leads: the busiest table in the system. agent_id/unit_id back both RLS
-- and the app's own scoping (dashboard monitor mode, the agent filter on
-- Leads Manager and Pipeline); pipeline_stage and status back the board and
-- the Overdue/Follow-up-today/No-quotation views; created_at desc backs
-- every list's default sort; follow_up_date is partial (most leads carry no
-- date yet) since only the Overdue/Follow-up-today views ever filter on it.
create index leads_agent_id_idx on leads (agent_id);
create index leads_unit_id_idx on leads (unit_id);
create index leads_pipeline_stage_idx on leads (pipeline_stage);
create index leads_status_idx on leads (status);
create index leads_created_at_idx on leads (created_at desc);
create index leads_follow_up_date_idx on leads (follow_up_date) where follow_up_date is not null;

-- lead_activity: RLS is "visible if the parent lead is visible" (a join back
-- to leads on every row), and the dashboard calendar pulls a date range
-- across every lead the viewer can see.
create index lead_activity_lead_id_idx on lead_activity (lead_id);
create index lead_activity_created_at_idx on lead_activity (created_at);

-- quotations / quotation_plans: RLS on both is "visible if the parent is
-- visible" the same way, and Lead Detail's quotations list, capture-
-- quotation's find-the-existing-one lookup, and the pipeline/dashboard
-- premium figures all join through lead_id / quotation_id.
create index quotations_lead_id_idx on quotations (lead_id);
create index quotations_agent_id_idx on quotations (agent_id);
create index quotations_created_at_idx on quotations (created_at desc);
create index quotation_plans_quotation_id_idx on quotation_plans (quotation_id);

-- profiles: unit_id and parent_id are read by my_units()/my_downline() and
-- the profiles RLS policies themselves on every request from a manager
-- role; role and is_active back the org tree, the reassign/target-setting
-- pickers, and Settings > Users & Hierarchy.
create index profiles_unit_id_idx on profiles (unit_id);
create index profiles_parent_id_idx on profiles (parent_id);
create index profiles_role_idx on profiles (role);
create index profiles_is_active_idx on profiles (is_active);

-- units: my_units() filters by exactly this column on every group-manager
-- request.
create index units_group_manager_id_idx on units (group_manager_id);

-- targets: Set Target and the dashboard both scope by agent then filter to
-- the current month; the composite serves both orders of that filter in one
-- index rather than two separate scans.
create index targets_agent_id_month_idx on targets (agent_id, month);

-- audit_log: always ordered by created_at desc with a limit, and the Audit
-- Log tab filters by an OR across actor_id/target_id for a manager's scope.
create index audit_log_created_at_idx on audit_log (created_at desc);
create index audit_log_actor_id_idx on audit_log (actor_id);
create index audit_log_target_id_idx on audit_log (target_id);
