-- ============================================================================
-- DEMO DATA ONLY -- every name, phone number and figure below is fictional.
-- Do not run this against production.
--
-- Seeds five demo leads and four Financial Storyboards so the lead popup tab,
-- the sidebar list and the portal can be exercised locally.
--
-- It needs three existing profiles, looked up by email (it creates no auth
-- users itself, because profiles.id is a foreign key to auth.users):
--
--     demo.agent.a@example.com   role agent
--     demo.agent.b@example.com   role agent
--     demo.um@example.com        role unit_manager (same unit as both agents)
--
-- To create them locally: Supabase Studio (http://127.0.0.1:54323) ->
-- Authentication -> Add user (tick "Auto Confirm"), then insert the matching
-- profiles rows -- or invite them from the CRM as a SuperAdmin -- giving all
-- three the same unit_id. The RLS test suite
-- (lib/storyboard/__tests__/rls.test.ts) uses the same three accounts.
--
-- If any of the three is missing this script prints a NOTICE and does nothing.
-- It is idempotent: leads are matched on (full_name, phone, agent_id) and
-- storyboards on (lead_id, module), so re-running neither duplicates nor
-- overwrites later edits.
--
-- Demo split:  agent A owns Aiman, Nurul, Hafiz.   agent B owns Faris, Siti.
-- Only Aiman's Hibah storyboard is shared to the portal.
-- ============================================================================
do $seed$
declare
	agent_a public.profiles%rowtype;
	agent_b public.profiles%rowtype;
	um public.profiles%rowtype;
	v_aiman uuid;
	v_nurul uuid;
	v_faris uuid;
	v_siti uuid;
begin
	select * into agent_a from public.profiles where lower(email) = 'demo.agent.a@example.com';
	select * into agent_b from public.profiles where lower(email) = 'demo.agent.b@example.com';
	select * into um from public.profiles where lower(email) = 'demo.um@example.com';

	if agent_a.id is null or agent_b.id is null or um.id is null then
		raise notice 'storyboard-demo: demo.agent.a / demo.agent.b / demo.um @example.com not all found; skipping demo seed.';
		return;
	end if;

	-- ---- leads (DEMO) -------------------------------------------------------
	insert into public.leads (full_name, phone, agent_id, unit_id, occupation, lead_source)
	select v.full_name, v.phone, v.agent_id, v.unit_id, v.occupation, 'demo seed'
	from (values
		('Aiman Hakim',   '0123456701', agent_a.id, agent_a.unit_id, 'Engineer (DEMO)'),
		('Nurul Izzah',   '0123456702', agent_a.id, agent_a.unit_id, 'Teacher (DEMO)'),
		('Faris Daniel',  '0123456703', agent_b.id, agent_b.unit_id, 'Business owner (DEMO)'),
		('Siti Aisyah',   '0123456704', agent_b.id, agent_b.unit_id, 'Designer (DEMO)'),
		('Hafiz Rahman',  '0123456705', agent_a.id, agent_a.unit_id, 'Executive (DEMO)')
	) as v(full_name, phone, agent_id, unit_id, occupation)
	where not exists (
		select 1 from public.leads l
		where l.full_name = v.full_name and l.phone = v.phone and l.agent_id = v.agent_id
	);

	select id into v_aiman from public.leads where full_name = 'Aiman Hakim' and phone = '0123456701' and agent_id = agent_a.id;
	select id into v_nurul from public.leads where full_name = 'Nurul Izzah' and phone = '0123456702' and agent_id = agent_a.id;
	select id into v_faris from public.leads where full_name = 'Faris Daniel' and phone = '0123456703' and agent_id = agent_b.id;
	select id into v_siti  from public.leads where full_name = 'Siti Aisyah' and phone = '0123456704' and agent_id = agent_b.id;

	-- ---- Aiman: Hibah, shared (DEMO) ---------------------------------------
	-- Inputs are the design defaults (design/financial-storyboard/02-Main.src.html),
	-- which give need RM720,806, have RM175,000, gap RM545,806.
	insert into public.storyboards (
		lead_id, module, inputs, outputs, client_summary, step_status,
		saved_at, saved_by, shared_to_portal, shared_at, shared_by
	)
	values (
		v_aiman, 'hibah',
		'{
			"nick": "Aiman", "age": 34, "scenario": "death",
			"income": 6000, "method": "replace", "replace": 80, "other": 0, "years": 5, "inflation": 3,
			"eFood": 1500, "eUtil": 400, "eSchool": 800, "eTrans": 600, "eRent": 0, "eOther": 500,
			"home": 320000, "homeCov": "unsure", "homePart": 0,
			"car": 60000, "carCov": "covered", "carPart": 0, "otherDebt": 12000,
			"edu": 60000, "emergency": 15000, "funeral": 8000,
			"savings": 25000, "existing": 150000
		}'::jsonb,
		'{"need": 720806, "have": 175000, "gap": 545806, "pct": 24}'::jsonb,
		'{
			"moduleLabel": "Hibah",
			"kicker": "If something happened to you",
			"gap": "RM545,806",
			"need": "RM720,806",
			"have": "RM175,000",
			"gapNote": "This is a planning estimate based on the figures you shared, not a quotation.",
			"meaning": [
				"Your family would need about RM720,806 to stay on their feet.",
				"What you have set aside today could cover about RM175,000 of that.",
				"The difference, about RM545,806, is the gap worth talking about."
			],
			"flow": [
				{"tag": "1", "title": "Monthly support", "value": "RM4,800", "desc": "Household costs your family would still carry each month.", "meterLabel": "Covered today", "meterText": "24%", "meter": 24, "tone": "warn"},
				{"tag": "2", "title": "Debts to settle", "value": "RM332,000", "desc": "Loans that do not disappear if income stops.", "meterLabel": "Protected", "meterText": "Partly", "meter": 20, "tone": "bad"},
				{"tag": "3", "title": "One-off needs", "value": "RM83,000", "desc": "Education, emergency fund and funeral.", "meterLabel": "Set aside", "meterText": "Some", "meter": 30, "tone": "neutral"},
				{"tag": "4", "title": "The gap", "value": "RM545,806", "desc": "What is still missing after your savings and existing cover.", "meterLabel": "Gap", "meterText": "76%", "meter": 76, "tone": "bad"}
			],
			"haveVsNeed": [
				{"label": "Need", "value": "RM720,806", "tone": "neutral"},
				{"label": "Have", "value": "RM175,000", "tone": "good"},
				{"label": "Gap", "value": "RM545,806", "tone": "bad"}
			],
			"plan": {
				"name": "[Great Eastern Takaful plan - to be confirmed with your agent]",
				"cover": "Cover amount to be discussed",
				"why": "A plan like this could help fill the gap, subject to the PDS and certificate terms.",
				"contribution": "From official illustration"
			},
			"nextSteps": [
				"Review these figures with your agent",
				"Check the official illustration for any plan discussed",
				"Decide together whether and when to proceed"
			],
			"agentFirstName": "Demo",
			"agentWa": "60123456789",
			"disclaimerKey": "hibah_default"
		}'::jsonb,
		'{"fill": "saved", "explain": "saved", "risk": "none", "objections": "none"}'::jsonb,
		now(), agent_a.id, true, now(), agent_a.id
	)
	on conflict (lead_id, module) do nothing;

	-- ---- Nurul: Medical, not shared (DEMO) ---------------------------------
	insert into public.storyboards (lead_id, module, inputs, outputs, step_status, saved_at, saved_by)
	values (
		v_nurul, 'medical',
		'{"nick": "Nurul", "age": 29, "hasCompanyCard": true, "savings": 10000}'::jsonb,
		'{}'::jsonb,
		'{"fill": "saved", "explain": "none", "risk": "none", "objections": "none"}'::jsonb,
		now(), agent_a.id
	)
	on conflict (lead_id, module) do nothing;

	-- ---- Faris: Business protection, not shared (DEMO) ---------------------
	insert into public.storyboards (lead_id, module, inputs, outputs, step_status, saved_at, saved_by)
	values (
		v_faris, 'business',
		'{"nick": "Faris", "entity": "sdn_bhd", "partners": 2, "loan": 250000}'::jsonb,
		'{}'::jsonb,
		'{"fill": "saved", "explain": "none", "risk": "none", "objections": "none"}'::jsonb,
		now(), agent_b.id
	)
	on conflict (lead_id, module) do nothing;

	-- ---- Siti: Critical illness, not shared (DEMO) -------------------------
	insert into public.storyboards (lead_id, module, inputs, outputs, step_status, saved_at, saved_by)
	values (
		v_siti, 'ci',
		'{"nick": "Siti", "age": 31, "income": 5000, "months": 24}'::jsonb,
		'{}'::jsonb,
		'{"fill": "saved", "explain": "none", "risk": "none", "objections": "none"}'::jsonb,
		now(), agent_b.id
	)
	on conflict (lead_id, module) do nothing;

	raise notice 'storyboard-demo: demo leads and storyboards seeded.';
end
$seed$;
