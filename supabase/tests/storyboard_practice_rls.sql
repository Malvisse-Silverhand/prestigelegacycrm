-- RLS test for storyboard practice sessions (20261112090000_storyboard_practice.sql).
--
-- Run it in the Supabase SQL Editor (as postgres) AFTER the migration. It builds
-- throwaway users/leads, acts as each of them (set_config request.jwt.claims +
-- set local role authenticated), records PASS / FAIL lines, then ends with
-- RAISE EXCEPTION carrying the report so EVERYTHING rolls back and nothing is
-- left behind. Read the "STORYBOARD PRACTICE RLS REPORT" error text: every line
-- should start with PASS.
--
-- The two helper functions live in pg_temp (session-only, never persisted).
create or replace function pg_temp.act(p_uid uuid) returns void
language plpgsql as $f$
begin
	reset role;
	perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	perform set_config('request.jwt.claim.sub', p_uid::text, true);
	set local role authenticated;
end;
$f$;

create or replace function pg_temp.chk(p_name text, p_ok boolean) returns text
language sql as $f$
	select case when p_ok then 'PASS  ' else 'FAIL  ' end || p_name || E'\n';
$f$;

do $test$
declare
	r text := '';
	u1 uuid := gen_random_uuid();   -- unit 1
	u2 uuid := gen_random_uuid();   -- unit 2
	um uuid := gen_random_uuid();   -- unit manager, unit 1
	a  uuid := gen_random_uuid();   -- agent, unit 1
	b  uuid := gen_random_uuid();   -- agent, unit 2
	la uuid := gen_random_uuid();   -- A's lead
	lb uuid := gen_random_uuid();   -- B's lead
	p1 uuid;
	p2 uuid;
	p3 uuid;
	n int;
	res text;
	failed boolean;
begin
	-- ---- fixtures (as postgres) ----
	insert into public.units (id, name) values (u1, 'rls-test-unit-1'), (u2, 'rls-test-unit-2');
	insert into auth.users (id, email) values
		(um, 'rls-um-' || um || '@example.test'),
		(a,  'rls-a-'  || a  || '@example.test'),
		(b,  'rls-b-'  || b  || '@example.test');
	insert into public.profiles (id, full_name, email, role, unit_id) values
		(um, 'RLS UM', 'rls-um-' || um || '@example.test', 'unit_manager', u1),
		(a,  'RLS A',  'rls-a-'  || a  || '@example.test', 'agent', u1),
		(b,  'RLS B',  'rls-b-'  || b  || '@example.test', 'agent', u2)
	on conflict (id) do nothing;
	insert into public.leads (id, full_name, phone, agent_id, unit_id) values
		(la, 'RLS Lead A', '0100000001', a, u1),
		(lb, 'RLS Lead B', '0100000002', b, u2);

	-- ---- A creates a practice session ----
	perform pg_temp.act(a);
	insert into public.storyboards (module, owner_id, title) values ('hibah', a, 'rehearsal') returning id into p1;
	r := r || pg_temp.chk('A creates a practice session', p1 is not null);

	failed := false;
	begin
		insert into public.storyboards (module, owner_id) values ('hibah', b);
	exception when others then failed := true; end;
	r := r || pg_temp.chk('A cannot create a practice session owned by B', failed);

	failed := false;
	begin
		insert into public.storyboards (module) values ('hibah');
	exception when others then failed := true; end;
	r := r || pg_temp.chk('a row with neither lead nor owner is rejected', failed);

	failed := false;
	begin
		insert into public.storyboards (module, owner_id, shared_to_portal) values ('medical', a, true);
	exception when others then failed := true; end;
	r := r || pg_temp.chk('a practice row cannot be shared to the portal', failed);

	failed := false;
	begin
		update public.storyboards set lead_id = la where id = p1;
	exception when others then failed := true; end;
	r := r || pg_temp.chk('A cannot move a practice row to a lead with a direct update', failed);

	update public.storyboards set title = 'renamed' where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('A can rename own practice session', n = 1);

	-- ---- B is blocked ----
	perform pg_temp.act(b);
	select count(*) into n from public.storyboards where id = p1;
	r := r || pg_temp.chk('B cannot read A practice session', n = 0);
	update public.storyboards set notes = 'x' where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('B cannot update A practice session', n = 0);
	delete from public.storyboards where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('B cannot delete A practice session', n = 0);
	select public.attach_practice_storyboard(p1, lb) into res;
	r := r || pg_temp.chk('B attaching A practice session gets not_found (got ' || res || ')', res = 'not_found');

	-- ---- A's unit manager: read yes, write no ----
	perform pg_temp.act(um);
	select count(*) into n from public.storyboards where id = p1;
	r := r || pg_temp.chk('A unit manager can read the practice session', n = 1);
	update public.storyboards set notes = 'x' where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('A unit manager cannot update it', n = 0);
	delete from public.storyboards where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('A unit manager cannot delete it', n = 0);

	-- ---- B's side of the world cannot see it from the other unit either ----
	-- (covered by the B checks above: B is in unit 2.)

	-- ---- attach ----
	perform pg_temp.act(a);
	select public.attach_practice_storyboard(p1, lb) into res;
	r := r || pg_temp.chk('attach to someone else lead -> not_allowed (got ' || res || ')', res = 'not_allowed');
	select public.attach_practice_storyboard(gen_random_uuid(), la) into res;
	r := r || pg_temp.chk('attach an unknown practice id -> not_found (got ' || res || ')', res = 'not_found');
	select public.attach_practice_storyboard(p1, la) into res;
	r := r || pg_temp.chk('attach to own lead -> ok (got ' || res || ')', res = 'ok');

	reset role;
	select count(*) into n from public.storyboards where id = p1 and lead_id = la and owner_id is null;
	r := r || pg_temp.chk('after attach: lead_id set and owner_id cleared', n = 1);

	perform pg_temp.act(a);
	insert into public.storyboards (module, owner_id) values ('hibah', a) returning id into p2;
	select public.attach_practice_storyboard(p2, la) into res;
	r := r || pg_temp.chk('second practice of the same module on the same lead -> duplicate (got ' || res || ')', res = 'duplicate');

	-- ---- lead rows keep their old rules ----
	perform pg_temp.act(b);
	select count(*) into n from public.storyboards where id = p1;
	r := r || pg_temp.chk('B cannot read A lead storyboard', n = 0);
	update public.storyboards set notes = 'x' where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('B cannot update A lead storyboard', n = 0);

	perform pg_temp.act(a);
	select count(*) into n from public.storyboards where id = p1;
	r := r || pg_temp.chk('A can read own lead storyboard', n = 1);
	delete from public.storyboards where id = p1;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('A still cannot delete a lead storyboard (superadmin only)', n = 0);

	-- ---- A deletes own practice session ----
	delete from public.storyboards where id = p2;
	get diagnostics n = row_count;
	r := r || pg_temp.chk('A can delete own practice session', n = 1);

	-- ---- the portal never sees practice rows ----
	reset role;
	insert into public.storyboards (module, owner_id) values ('ci', a) returning id into p3;
	select count(*) into n from public.portal_storyboards(la);
	r := r || pg_temp.chk('portal_storyboards(lead) returns no unshared or practice rows', n = 0);

	reset role;
	raise exception E'STORYBOARD PRACTICE RLS REPORT (everything rolled back)\n%', r;
end;
$test$;
