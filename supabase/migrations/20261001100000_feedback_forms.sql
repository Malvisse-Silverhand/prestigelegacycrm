-- Feedback forms: a SuperAdmin builds a form and shares its link; staff fill
-- it in; SuperAdmins, Group Managers and Unit Managers read the submissions.
--
-- Version 1 is staff-only: the share link opens inside the CRM, so whoever
-- fills a form is signed in. That keeps spam out without needing a captcha;
-- a public "anyone with the link" mode can be added later.
--
-- Who can do what is decided here in RLS as well as in the app:
--   * every signed-in user can read OPEN forms (to fill them in); SuperAdmins
--     read all forms, open or closed, and are the only ones who write them;
--   * a submission can only be filed as yourself, only on an open form;
--   * submissions are readable by SuperAdmin, Group Manager and Unit Manager
--     only -- not by the person's own downline, not by agents (an agent does
--     not see other people's submissions, including complaints about them);
--   * nobody edits or deletes a submission through the API; a SuperAdmin can
--     delete a whole form, which removes its submissions with it.

create table if not exists public.feedback_forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  title text not null check (char_length(title) between 2 and 140),
  description text check (description is null or char_length(description) <= 2000),
  -- [{ "id": "type", "label": "...", "type": "short_text|long_text|dropdown|checkboxes|rating",
  --    "required": true, "options": ["..."] }, ...]
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  is_open boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_forms_created_by_idx on public.feedback_forms (created_by);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  -- { "<field id>": "<answer>" | ["<answer>", ...] | <number> }
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 20000),
  page_url text check (page_url is null or char_length(page_url) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_form_idx on public.feedback_submissions (form_id, created_at desc);
create index if not exists feedback_submissions_submitted_by_idx on public.feedback_submissions (submitted_by);

alter table public.feedback_forms enable row level security;
alter table public.feedback_submissions enable row level security;

drop policy if exists "feedback forms: open ones readable, superadmin reads all" on public.feedback_forms;
create policy "feedback forms: open ones readable, superadmin reads all" on public.feedback_forms
  for select to authenticated
  using (is_open or (select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "feedback forms: superadmin inserts" on public.feedback_forms;
create policy "feedback forms: superadmin inserts" on public.feedback_forms
  for insert to authenticated with check ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "feedback forms: superadmin updates" on public.feedback_forms;
create policy "feedback forms: superadmin updates" on public.feedback_forms
  for update to authenticated
  using ((select "current_role"()) = 'superadmin'::user_role)
  with check ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "feedback forms: superadmin deletes" on public.feedback_forms;
create policy "feedback forms: superadmin deletes" on public.feedback_forms
  for delete to authenticated using ((select "current_role"()) = 'superadmin'::user_role);

drop policy if exists "feedback submissions: managers read" on public.feedback_submissions;
create policy "feedback submissions: managers read" on public.feedback_submissions
  for select to authenticated
  using ((select "current_role"()) = any (array['superadmin', 'group_manager', 'unit_manager']::user_role[]));

drop policy if exists "feedback submissions: submit as yourself to an open form" on public.feedback_submissions;
create policy "feedback submissions: submit as yourself to an open form" on public.feedback_submissions
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (select 1 from public.feedback_forms f where f.id = form_id and f.is_open)
  );
-- No update/delete policies on submissions.

-- The first form: a first-impressions survey for agents who are new to the
-- CRM. Only created if no form with this slug exists, so re-running never
-- duplicates or overwrites edits.
insert into public.feedback_forms (slug, title, description, fields, is_open)
select
  'crm-feedback',
  'CRM Feedback: first-time agents',
  'Baru guna CRM ini? Beritahu kami pengalaman anda supaya kami boleh menambah baik. Just started using the CRM? Tell us how it went so we can make it better. Takes about 2 minutes.',
  '[
    {"id":"first_impression","label":"Kesan pertama keseluruhan / Overall first impression of the CRM","type":"rating","required":true},
    {"id":"ease_of_use","label":"Mudah tak untuk anda cari jalan? / How easy was it to find your way around?","type":"rating","required":true},
    {"id":"how_long","label":"Sudah berapa lama anda guna CRM? / How long have you been using it?","type":"dropdown","required":true,
     "options":["Hari pertama / First day","1-7 hari / 1-7 days","1-4 minggu / 1-4 weeks","Lebih sebulan / Over a month"]},
    {"id":"device","label":"Peranti utama anda / Your main device","type":"dropdown","required":true,
     "options":["Telefon / Phone","Komputer / Computer","Kedua-duanya / Both"]},
    {"id":"tried","label":"Ciri yang sudah anda cuba / Features you have tried","type":"checkboxes","required":false,
     "options":["Dashboard","Leads Manager","Sales Pipeline","Lead Generation / Landing Page","Appointment","Quotation","Manage Cases","Servicing","WA Flow","Support Tickets"]},
    {"id":"speed","label":"Kelajuan CRM / How fast does the CRM feel?","type":"dropdown","required":false,
     "options":["Laju / Fast","Sederhana / OK","Perlahan / Slow"]},
    {"id":"liked","label":"Apa yang anda paling suka? / What did you like most?","type":"long_text","required":false},
    {"id":"confusing","label":"Apa yang mengelirukan atau sukar? / What was confusing or hard?","type":"long_text","required":false},
    {"id":"wished","label":"Ciri apa yang anda mahu ada? / What feature do you wish it had?","type":"long_text","required":false},
    {"id":"recommend","label":"Berapa besar kemungkinan anda syorkan CRM ini kepada rakan agen? / How likely are you to recommend it to a fellow agent?","type":"rating","required":true},
    {"id":"contact_ok","label":"Boleh kami hubungi anda tentang maklum balas ini? / May we contact you about this feedback?","type":"dropdown","required":false,
     "options":["Ya / Yes","Tidak / No"]}
  ]'::jsonb,
  true
where not exists (select 1 from public.feedback_forms where slug = 'crm-feedback');
