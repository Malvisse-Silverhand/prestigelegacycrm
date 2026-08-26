# Takaful4Us CRM — Master Build Prompt for Claude Code

> **How to use this file**: Paste this entire document as your first message to Claude Code
> in your new project folder, alongside the original `Takaful4Us CRM.dc.html` design file
> (put it at `/design-reference/Takaful4Us CRM.dc.html` in the repo so Claude Code can open
> and re-read it at any time during the build). Tell Claude Code explicitly:
> "Read the design reference file first, then follow this build prompt exactly."

---

## 0. Project Identity

- **Project**: Takaful4Us CRM — proprietary lead & agent management platform
- **Purpose**: Replace/upgrade the existing GAS "Lead 2026" CRM with a role-aware,
  Supabase-backed system for a growing agent team
- **Owner**: Kamal Husaini (SuperAdmin)
- **Design source of truth**: `Takaful4Us CRM.dc.html` (19 screens across 3 design
  iterations — treat "Turn 3" and "Turn 2" sections as final; "Turn 1" sections are
  earlier concepts for Login, Lead Detail, and Empty States that are still valid)
- **Phase scope**: Core CRM only. **AI Layer is explicitly OUT OF SCOPE for this phase** —
  see Section 8.

---

## 1. Tech Stack (non-negotiable)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS, tokens below |
| Database + Auth | Supabase (Postgres, Supabase Auth, Row Level Security) |
| Hosting | **Vercel** (auto-deploy from GitHub main branch) |
| Realtime | Supabase Realtime for pipeline/kanban live updates |
| File storage | Supabase Storage (quotation PDFs, avatars) |

Do not substitute any of these without asking first.

---

## 2. Design System Tokens (extracted directly from the .dc.html file)

### Colors

```js
// tailwind.config.ts -> theme.extend.colors
colors: {
  navy:   "#0F2540",  // sidebar, primary text, dark surfaces
  gold:   "#FAC748",  // primary accent, active states, CTAs on dark bg
  green:  "#0F4C35",  // success, positive stats, secondary dark surface
  cream:  "#FDF9F3",  // page background (light mode)
  // extended warm neutrals (cards, borders, muted text on cream backgrounds)
  sand:     "#EFE7DA",
  sand2:    "#E7DED0",
  sand3:    "#F5EEE3",
  taupe:    "#A29883",
  taupe2:   "#9A8F7C",
  muted:    "#8B8271",
  muted2:   "#7A7161",
  ink:      "#5C5648",
  // status colors
  alertRed:    "#9B2C22",   // overdue / destructive text
  alertRedBg:  "#FDECEB",   // overdue card background
  warnOrange:  "#C9552F",   // warning text (stale leads)
  warnGoldTxt: "#7A5C14",   // amber text on cream badges
  warnGoldBg:  "#FDF3DD",   // warning card background
  successBg:   "#E8F2EC",   // success/positive card background
  infoBlueTxt: "#1C3F66",
  infoBlueBg:  "#E9EDF3",
  infoBlueBg2: "#EEF3F8",
  infoBlueMid: "#7F93AA",
}
```

### Typography

- **Primary font**: `Poppins` (weights 300/400/500/600/700/800) — all UI text
- **Monospace accent**: `JetBrains Mono` — used ONLY inside WhatsApp message preview
  bubbles (WA Flow templates, Send Quotation modal) to visually distinguish "message
  content" from "app chrome"
- Section titles: 20px / 700
- Card titles: 14–17px / 700
- Body: 13–15px / 400–500
- Eyebrow/kicker labels: 11px / 600, uppercase, letter-spacing 0.18em, color `taupe2`

### Shape & elevation

- Large containers (page cards, dashboard screen frame): `border-radius: 18–22px`
- Standard cards / buttons: `border-radius: 10–12px`
- Small chips / badges: `border-radius: 999px` (pill)
- Card shadow (resting): `0 1px 2px rgba(15,37,64,.05), 0 8px 20px -12px rgba(15,37,64,.16)`
- Elevated/modal shadow: `0 24px 50px -18px rgba(15,37,64,.4)`
- Gold focus ring (inputs/buttons): `0 0 0 4px rgba(250,199,72,.18)`

### Layout

- **Desktop**: fixed sidebar 226px wide, navy background (`#0F2540`), full-height,
  logo block "T4" gold square + "Takaful4Us CRM" wordmark at top, user profile card
  pinned at bottom with Sign Out
- **Mobile**: 390×844 reference viewport, bottom tab bar with 5 items:
  **Home · Leads · Pipeline · Quote · Me**
- Page canvas background: `cream (#FDF9F3)`; sidebar stays navy in both light/dark
  variants (only the content area switches for the dark-mode dashboard variant)

---

## 3. Role Hierarchy & Permission Matrix

Four tiers, same menu for everyone — **data scope changes, not the menu**:

```
SuperAdmin
  └── Group Manager        (assigned units)
        └── Unit Manager   (one unit)
              └── Agent    (own leads only)
```

Role descriptions (use verbatim in Settings → Roles & Permissions screen):

- **SuperAdmin** — Full access to every unit, agent and system setting. Can create/remove
  any account, appoint Group Managers, change lead distribution rules.
- **Group Manager** — Monitors every Unit Manager beneath them. Can open any Unit Manager
  or Agent dashboard (read-only monitor mode), and create Unit Manager/Agent accounts.
- **Unit Manager** — Monitors only agents assigned under them. Can reassign leads, open
  an agent dashboard, see every quotation in the unit.
- **Agent** — Own leads only. Kanban pipeline, quotations for own clients, WA Flow
  templates, personal activity log.

### Permission matrix (implement as RLS, mirror in UI)

| Menu | SuperAdmin | Group Manager | Unit Manager | Agent |
|---|---|---|---|---|
| Dashboard | All units | Their units | Their agents | Themselves |
| Leads Manager | All | All (their units) | Their unit | Own leads only |
| Sales Pipeline | All | All (their units) | Their unit | Own leads only |
| My Team | ✓ | ✓ | ✓ | — |
| Quotation | ✓ | ✓ | ✓ | ✓ |
| WA Flow | Manage templates | Manage templates | Use templates | Use templates |
| Statistics | ✓ | ✓ | ✓ (own unit) | — |
| Settings — hierarchy setup | ✓ | ✓ | — | — |

**Privacy rule (critical, from the design's own annotation):** Group Managers and Unit
Managers see lead **metrics and status** when monitoring an agent — never the literal
content of that agent's WhatsApp conversations. Only note/activity-timeline entries the
agent chose to log are visible, not raw WA message history.

**Audit rule:** Every time a Group/Unit Manager opens another user's dashboard in
"monitor mode," write a row to `audit_log` (`actor_id`, `target_id`, `action:
'view_dashboard'`, `timestamp`).

---

## 4. Database Schema (Supabase / Postgres)

```sql
-- ENUMS
create type user_role as enum ('superadmin','group_manager','unit_manager','agent');
create type lead_status as enum ('hot','warm','cold','unassigned','closed');
create type pipeline_stage as enum ('new','contacted','follow_up','quoted','closed_won','closed_lost');
create type quotation_status as enum ('draft','sent','accepted');
create type wa_template_category as enum ('greeting','follow_up','appointment','product_info','closing','reminder','other');

-- UNITS
create table units (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- e.g. "Unit Ampang"
  group_manager_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null,
  unit_id uuid references units(id),          -- null for superadmin/group_manager scope-all
  parent_id uuid references profiles(id),      -- who invited/manages this user
  is_active boolean default true,
  avatar_initials text,
  created_at timestamptz default now(),
  last_activity_at timestamptz
);

-- LEADS
create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  state text,
  occupation text,
  address text,
  lead_source text,                       -- "FB Ads — Medical Card", "Referral", "WhatsApp inbound", "Roadshow", "Walk-in"
  interest text,                          -- product interest note
  budget_indicated text,
  best_time_to_reach text,
  status lead_status default 'unassigned',
  pipeline_stage pipeline_stage default 'new',
  agent_id uuid references profiles(id),
  unit_id uuid references units(id),
  follow_up_date date,
  is_stale boolean default false,          -- auto-flag if no activity > 3 days
  closed_lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LEAD ACTIVITY (timeline: notes, WA sent, assignment changes, stage changes)
create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  actor_id uuid references profiles(id),
  activity_type text not null,             -- 'note' | 'wa_sent' | 'assigned' | 'stage_change' | 'created'
  content text,
  created_at timestamptz default now()
);

-- QUOTATIONS
-- NOTE: quotations are NOT calculated inside the CRM. They are generated by Mal's
-- existing standalone calculators (imedi-evolusi-quote.html, quickquote-hibah-life-
-- takaful.html), served same-origin from /public/tools/, and captured here via a
-- webhook fan-out from those tools. See Section 6a for the integration flow.
create type quotation_product as enum ('imedi_evolusi','hibah_nova','hibah_chinta','hibah_mixed');

create table quotations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  agent_id uuid references profiles(id),
  product quotation_product not null,
  language text default 'BM',              -- 'BM' | 'EN'
  status quotation_status default 'draft', -- 'sent' set when agent uses the WA deep-link, 'accepted' set manually
  raw_payload jsonb not null,              -- full original payload from the calculator, verbatim — source of truth
  pdf_url text,                            -- optional: uploaded copy of the printed PDF, if agent saves one to Storage
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- QUOTATION PLAN OPTIONS (one row per option/column the calculator produced —
-- 2 fixed rows for i-Medi Evolusi, N dynamic rows for Hibah)
create table quotation_plans (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references quotations(id) on delete cascade,
  sort_order int default 0,
  plan_label text not null,                -- "Option 1 (RM150 R&B)" / "Option 1 (Nova)" / "Plan 150"
  monthly_contribution numeric(10,2),
  annual_contribution numeric(12,2),
  coverage_detail jsonb not null default '{}'
  -- imedi_evolusi coverage_detail: { room_and_board, annual_limit }
  -- hibah coverage_detail: { product: 'Nova'|'Chinta', sum_covered, coverage_to_age, payment_term }
);

-- WA FLOW TEMPLATES (manual CRUD only — no AI generation in this phase)
create table wa_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category wa_template_category not null,
  language text default 'BM',
  body text not null,                      -- contains {{tokNama}}, {{tokAgent}}, {{tokProduk}}, {{tokCaruman}}, {{tokHad}}
  usage_count int default 0,
  created_by uuid references profiles(id),
  unit_id uuid references units(id),       -- null = global/org-wide template
  created_at timestamptz default now()
);

-- TARGETS (monthly ANC/NOC per agent, set by Unit Manager/SuperAdmin)
create table targets (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references profiles(id),
  month date not null,                     -- first day of month
  anc_target numeric(10,2),                -- Annual New Contribution target (RM)
  noc_target int,                          -- Number of Cases target
  created_at timestamptz default now()
);

-- AUDIT LOG
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  target_id uuid references profiles(id),
  action text not null,                    -- 'view_dashboard', 'reassign_lead', etc.
  metadata jsonb,
  created_at timestamptz default now()
);

-- LEAD DISTRIBUTION RULES (org-wide settings, SuperAdmin-managed)
create table distribution_settings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  round_robin_enabled boolean default true,
  stale_after_days int default 3,
  reassign_requires_approval boolean default true
);
```

---

## 5. Row Level Security — implement exactly this logic

```sql
alter table leads enable row level security;
alter table quotations enable row level security;
alter table wa_templates enable row level security;
alter table profiles enable row level security;

-- Helper: get current user's role/unit (as a Postgres function or via auth.jwt() claims)

-- LEADS
create policy "agent sees own leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'agent'
    and agent_id = auth.uid()
  );

create policy "unit manager sees unit leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'unit_manager'
    and unit_id = (select unit_id from profiles where id = auth.uid())
  );

create policy "group manager sees their units' leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'group_manager'
    and unit_id in (select id from units where group_manager_id = auth.uid())
  );

create policy "superadmin sees all leads" on leads
  for select using (
    (select role from profiles where id = auth.uid()) = 'superadmin'
  );

-- Mirror equivalent INSERT/UPDATE policies (agents can only update their own leads;
-- unit managers can reassign within their unit; superadmin/group manager read-mostly
-- except explicit reassignment actions).

-- QUOTATIONS: same shape as leads, scoped via the parent lead's unit_id/agent_id.

-- WA_TEMPLATES: everyone can SELECT unit-scoped + global templates;
-- only unit_manager/group_manager/superadmin can INSERT/UPDATE/DELETE ("Manage" vs "Use").
```

---

## 6. Screen Inventory (build in this order)

Each screen below maps to a section in `Takaful4Us CRM.dc.html` — open that file and
find the matching `data-screen-label` before building, and re-check against it after.

| # | Screen | Design ref label | Notes |
|---|---|---|---|
| 1 | Login | `Login` | Email + password, "Keep me signed in," "Forgot password?", invite-only copy: *"New agent? Ask your unit manager to send an invite."* No public sign-up route. |
| 2 | Dashboard (desktop) | `Dashboard desktop` | Stat cards: Leads today, This week, This month (vs target), Pipeline value (RM/mo ACV). Alert cards: Overdue follow-up, Follow up today, No quotation yet. Lead status donut. Lead source quality bars. 14-day leads-in/closed-out chart. Lead assignment list with "Rebalance." |
| 3 | Dashboard (mobile, light & dark) | `Dashboard mobile light` / `Dashboard mobile dark` | Same data, reordered mobile-first: what's late → what's today → then the numbers. Include a light/dark toggle in the top bar. |
| 4 | Leads Manager | `Leads Manager` | Table: Name, Phone, DOB, State, Occupation, Created, Status (badge), Agent, FU Date, Actions. Filters: search, date range, status, agent. Export to CSV. "Tambah Lead" button. Pagination. |
| 5 | Lead Detail (modal) | `Lead detail modal` | Header: name, product tag, stage badge, phone/email/address. Actions: Call, WhatsApp, Add note, Reassign. Activity timeline (note/wa_sent/assigned/created events). Right rail: pipeline stage selector, owner, source, interest, budget, best time to reach, created date. |
| 6 | Sales Pipeline (desktop kanban) | `Sales Pipeline desktop` | Columns: New, Contacted, Follow Up, Quoted, Closed Won, Closed Lost — each with count + RM potential. Card shows name, phone, product tag, source/status chip. Drag card = update `pipeline_stage` + sync `leads.status`. Card quick actions: Open in Leads Manager, Send WA template, Quotation estimate/Open customizer. |
| 7 | Sales Pipeline (mobile) | `Sales Pipeline mobile` | Swipeable stage columns or stage-filtered list; same card content, touch-friendly. |
| 8 | Quotation launcher (**supersedes** `Quotation Customizer`) | `Quotation Customizer` | **Do not build a new plan-comparison calculator.** Instead: a lead-bound screen with two buttons — "Buat Quotation Medical Card" and "Buat Quotation Hibah" — each opens the matching existing calculator (Section 6a) same-origin, prefilled with the lead's name/phone/email. All plan comparison, PDF, and WhatsApp logic stays inside those existing tools untouched. |
| 9 | Quotation Estimate | *(dropped)* | Not needed as a separate screen — the existing calculators already are the "estimate" view. |
| 10 | Quotation List | `Quotation List` | Table: Client, Product, Contribution, Status (Draft/Sent/Accepted), Agent. Reads from the `quotations` table, populated by the webhook fan-out in Section 6a — **no "New Quotation" builder button**, only "Buat Quotation" from a lead (per row #8). |
| 11 | Send Quotation via WhatsApp | *(handled by existing tools)* | Both calculators already build the WA deep-link and message text themselves (`wa.me/...`) — do not rebuild this modal. CRM only needs to mark `quotations.status = 'sent'` when the agent clicks that link (fire a small event from the calculator back to the fan-out endpoint). |
| 12 | My Team | `My Team` | Stat row: Total Members, Active Agents, Active %, Leads Assigned. Agent cards: avatar initials, name, role/stale badge, email, Active toggle, Leads/Conv./Response stats, last activity, "Open Dashboard" + "Assign Leads"/"Reassign." Monitor mode banner when viewing an agent read-only, with "Exit monitor mode." |
| 13 | Group Manager drill-down | `Group Manager drill-down` | Units-under-you side list. Unit Manager league rows (agents, leads, conv., response, stale count, "Open Dashboard"). Expandable agent chips per unit. Privacy note + "View audit log" link. |
| 14 | WA Flow | `WA Flow` | Category filter chips (All/Greeting/Follow Up/Appointment/Product Info/Closing/Reminder/Other). Template cards: title, category badge, language, usage count, message body, "Fill Name"/"Auto-fill," "Copy"/"Send." "Add Template" button. **Manual CRUD only — no AI drafting in this phase.** |
| 15 | Statistics | `Statistics` | Scope tabs (Units/Agents/Products) + month picker. Top stat row: Total leads, Quotations sent, Cases closed, Group conversion, Monthly contribution (with % deltas). Unit Manager league table (rank, agents, leads, quoted, closed, conv., response, trend sparkline). Product mix bars. Response-time distribution + insight line. Stage conversion funnel (New→Contact→FU→Quoted→Won) with a called-out bottleneck insight. |
| 16 | Settings — SuperAdmin | `Settings SuperAdmin` | Tabs: Users & Hierarchy, Roles & Permissions, Set Target, Lead Distribution, Lead Sources, Audit Log. Role definition cards (1–4). Org structure summary counts. User list with role badges + "Manage agents." "Add User" invite form (name, email, role, assigned-under). Set Target table (per-agent ANC/NOC). Lead Distribution toggles: round-robin within unit, auto-flag stale >3 days, reassign requires approval. |
| 17 | Empty states | `Empty state · unit pool` / `Empty state · search` | "Unit pool is clear" (all leads owned) with "Import a lead list"/"View closed cases." "No leads match [query]" with "Clear filters." Reuse this pattern everywhere a list can be empty. |

---

## 6a. Quotation Integration — Reusing Mal's Existing Calculators

**Do not build quotation calculation logic from scratch.** Two production-proven,
standalone HTML tools already do this and must remain the single source of truth for
rate tables and plan math:

| File | Product | Existing behaviour (do not touch) |
|---|---|---|
| `imedi-evolusi-quote.html` | Medical Card i-Medi Evolusi | Form → 2 plan options (RM150/RM200 Room & Board) → PDF print → WhatsApp deep-link to agent number → POSTs lead + quote to a Pabbly webhook (`WEBHOOK_URL`) and a social webhook |
| `quickquote-hibah-life-takaful.html` | Hibah i-Great Nova & Chinta | Form → dynamic multi-plan comparison (mix Nova + Chinta) → PDF print → WhatsApp deep-link → POSTs to `PABBLY_ENDPOINT` and `SOCIAL_ENDPOINT` |

### Integration steps

1. **Place both files as static assets**, unmodified in structure, at:
   `public/tools/imedi-evolusi-quote.html` and
   `public/tools/quickquote-hibah-life-takaful.html`
   — same-origin as the CRM on Vercel, so they can be embedded in an `<iframe>` with
   no `X-Frame-Options` issues.

2. **Small patch #1 — prefill from URL params.** At the top of each tool's script, read
   `?lead_id=&name=&phone=&email=` from `location.search` and pre-populate the existing
   `lead.name` / `lead.phone` / `lead.email` state (or equivalent fields) that the tool
   already tracks internally. This is a ~10 line addition, not a rewrite.

3. **Small patch #2 — fan out to Supabase, alongside the existing webhook.** Inside
   `sendWebhook()` (i-Medi file) and `sendLead()` (Hibah file), right next to the
   existing `fetch(WEBHOOK_URL, ...)` / `fetch(PABBLY_ENDPOINT, ...)` call, add one more
   `fetch()` to a new Supabase Edge Function, e.g. `POST /functions/v1/capture-quotation`,
   with body:
   ```json
   {
     "lead_id": "<from URL param>",
     "product": "imedi_evolusi | hibah_nova | hibah_chinta | hibah_mixed",
     "language": "BM | EN",
     "raw_payload": { /* the exact same payload object already being sent to Pabbly */ },
     "plans": [ /* one entry per option/column, mapped to quotation_plans shape */ ]
   }
   ```
   Do **not** remove or modify the existing Pabbly/social webhook calls — this is
   purely additive.

4. **Edge Function** (`capture-quotation`) inserts one row into `quotations` and N rows
   into `quotation_plans`, using the service role key (this function runs server-side,
   bypassing RLS safely since it only ever writes, scoped to the `lead_id` given).

5. **CRM side (screen #8):** from a Lead Detail view, "Buat Quotation Medical Card" /
   "Buat Quotation Hibah" opens
   `/tools/imedi-evolusi-quote.html?lead_id={id}&name={name}&phone={phone}` (or the
   Hibah equivalent) in an iframe modal or a new tab. When the agent finishes and the
   Edge Function receives the payload, the new quotation appears automatically in the
   Lead's activity timeline and in the Quotation List screen — no manual save step.

6. **Field mapping reference** (from the actual payloads already sent to Pabbly):
   - i-Medi Evolusi → `nama, nombor_telefon, email, tarikh_lahir, umur_anb, jantina,
     merokok, kelas_pekerjaan, sejarah_sakit, option1_bulanan/tahunan,
     option2_bulanan/tahunan, option1_room_board/annual_limit, option2_room_board/annual_limit`
   - Hibah → `name, phone, email, date_of_birth, anb, gender, smoker, occupation_class,
     health_history, chinta_term, plan1_product/sum_covered/monthly/annual/
     coverage_to_age/payment_term ... planN_...`
   - Map these directly into `quotations.raw_payload` (store as-is) and unpack the
     `optionN_...` / `planN_...` groups into individual `quotation_plans` rows.

This keeps rate tables and plan logic in exactly one place (the two existing files),
while giving the CRM a live, queryable record of every quotation per lead.

---

## 7. Mobile Navigation

Bottom tab bar (5 items, all roles): **Home · Leads · Pipeline · Quote · Me**

---

## 8. OUT OF SCOPE for this phase (explicitly deferred — do not build)

- ❌ AI lead scoring / "hot lead" prediction
- ❌ AI-drafted WhatsApp messages or auto-summarized call notes
- ❌ Claude API or MCP integration of any kind
- ❌ Any automation beyond the round-robin/stale-flag rules already in Section 4

WA Flow, Dashboard, and Pipeline should all ship as **fully manual, human-driven**
features exactly as designed. Do not add "smart suggestions," auto-generated content,
or any LLM call anywhere in this phase. If asked to add an AI touch, decline and note
it's deferred to a later phase.

---

## 9. Build Checklist (tick off in order)

- [ ] Next.js + TypeScript + Tailwind scaffolded, repo on GitHub
- [ ] Tailwind theme tokens match Section 2 exactly
- [ ] Supabase project created; schema from Section 4 applied via migration
- [ ] RLS policies from Section 5 applied and tested with 4 test accounts (one per role)
- [ ] Supabase Auth invite flow working; public signup disabled
- [ ] Login screen built and matches design
- [ ] Dashboard (desktop + mobile light/dark) built
- [ ] Leads Manager + Lead Detail modal built
- [ ] Sales Pipeline (desktop kanban + mobile) built, drag-to-update wired to DB
- [ ] Both existing calculator HTML files copied into `public/tools/`, unmodified in logic
- [ ] Prefill patch (URL params) + Supabase fan-out patch added to both calculators
- [ ] `capture-quotation` Edge Function built and tested
- [ ] Quotation launcher screen (from Lead Detail) + Quotation List built, reading live from `quotations`/`quotation_plans`
- [ ] My Team + Group Manager drill-down built, monitor-mode + audit log wired
- [ ] WA Flow template CRUD built (manual only)
- [ ] Statistics screen built
- [ ] Settings (SuperAdmin) — Users & Hierarchy, Roles, Set Target, Lead Distribution built
- [ ] Empty states applied across all lists
- [ ] Visual QA: every screen compared side-by-side against `Takaful4Us CRM.dc.html`
- [ ] Deployed to Vercel, env vars set, custom domain connected
- [ ] Handoff note written for what's deferred (Section 8) for the next phase

---

## 10. Instruction to Claude Code

> Build this project section by section, in the exact order of Section 6. After each
> screen, show me a preview and wait for my confirmation before moving to the next one.
> Always re-open `Takaful4Us CRM.dc.html` to check exact colors, spacing, and copy before
> marking a screen done — do not rely on memory of earlier parts of this conversation.
> Do not implement anything listed in Section 8 unless I explicitly ask for it later.
