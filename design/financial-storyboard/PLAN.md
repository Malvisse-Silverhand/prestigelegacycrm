# Financial Storyboard + Client Portal + Mortgage (MRTT vs MLTT) — Phase 0 Plan

## Context
Each lead currently has no structured, saved needs analysis. Mal designed **Financial Storyboard**: a 22-screen bundle, extracted from `docs/design/Financial_Storyboard.html`. It has:
- 4 modules (Hibah, Medical Card, Critical Illness, Business Protection), each with 4 steps: Fill & Calculate · Explanation · Rejection Risk · Objection.
- Two agent entry points: the lead popup and a sidebar list.
- A mobile Client Portal that shows only the storyboards the agent has shared, and only their client-safe parts.

Mal also wants a **5th module, Mortgage Protection (MRTT vs MLTT)**. No design exists for it, so Claude designs it in the same visual system.

Goal: add value and analysis to every lead and client. Everything persists in Supabase, follows the GE-only and no-guarantee rules, and the portal cannot leak agent-only data, by construction.

How we work: Opus 5.5 plans and reviews. Each phase is executed by a Sonnet 5.5 subagent. After every phase we stop and wait for Mal's "go".

## Decisions locked with Mal

| Topic | Decision |
|---|---|
| MRTT/MLTT placement | 5th module `mortgage`, with the same 4 steps, shareable to the portal |
| What Mortgage shows | Coverage curve (loan balance vs MRTT reducing cover vs MLTT level cover). Surplus to the family under MLTT. Contribution comparison, using agent-entered figures only |
| Loan math | Standard monthly annuity amortisation. The agent can override the cover term and the rate the plan assumes |
| Plan names | Editable placeholders `[GE MRTT plan]` and `[GE MLTT plan]` |
| Mortgage ↔ Hibah | **Auto-feed.** Hibah's home-loan amount prefills Mortgage. The chosen plan sets Hibah `homeCov` to covered or partial (using the cover at the current policy year). Skipped if the agent has set it manually |
| Design source | Bundle extracted to `design/financial-storyboard/*.html` (22 files) plus a README index |
| Compliance edits | Medical bill costs and the 15% medical inflation become editable placeholders with a `source` field. The CI "[Your story]" becomes an empty, agent-only field. Hibah's "fills the gap · 100%" becomes "could fill the gap, subject to the PDS & certificate terms" |
| Hibah formula | Keep the 80% default and keep "unsure = not covered", so the default gap stays RM545,806 as in the design. Fix the copy to read "Default: replace 80%" |
| Portal modules | All 5 modules shareable. Hibah and Medical follow the design; CI, Business and Mortgage reuse the same portal template |
| Portal auth | **No WhatsApp OTP.** Login needs the magic link (a per-lead token, revocable, expires in 30 days) **plus** full name and phone. The Verify screen is dropped |
| Customize | Org defaults, set by SuperAdmin only: plan names, multiples, statistics placeholders. Agents can override scripts, objection answers and checklist items for themselves |
| Export | Copy-to-WhatsApp text ships with each module. PDF, image and "Combine all modules" go to Phase 7 |
| Step 4 outcome | Wired to the pipeline stage, `follow_up_date` and `lead_activity` |
| Tests | Add **vitest**, plus `test` and `typecheck` scripts. RLS and portal-leak tests run against local Supabase. Lighthouse is checked manually |
| Portal URL | A separate `/portal/*`, not `/sijil` (that portal uses NRIC, which conflicts with the "no IC" rule) |

## Repo recon (Phase 0 findings)

**Stack**
- Next **16.3.3** and React 19.2, TypeScript, Tailwind v4 (`@theme inline` in `app/globals.css`).
- No UI library and no state library.
- eslint 9 flat config, no Prettier. Path alias `@/*`.
- No test framework.

**Next 16 differences**
- `params`, `cookies()` and `headers()` are async; the repo already follows this.
- `middleware.ts` is deprecated in favour of `proxy.ts`. **Out of scope**; we leave it as is.

**Supabase access**
- `lib/supabase/server.ts` `createClient()`: RLS-scoped, used for agent actions.
- `lib/supabase/admin.ts` `createAdminClient()`: service role, `server-only`.
- `lib/supabase/profile.ts` `getCurrentProfile()`: the guard used in actions.
- Server action pattern, from `app/(app)/leads/[id]/actions.ts`:
  1. `"use server"`, then the `getCurrentProfile()` guard.
  2. Write through the RLS client.
  3. Insert a `lead_activity` row.
  4. `revalidatePath`.
  5. Return `{ error }`.

**Roles and RLS**
- `user_role` covers superadmin, group_manager, unit_manager, aspirant_unit_manager and agent. `ROLE_RANK` lives in `lib/profile-types.ts`.
- RLS helpers: `current_role()`, `current_unit_id()`, `my_units()`, `my_downline()`, `owns_lead()`.
- The visibility pattern to copy is `client_portal_links`: its policy is `exists (select 1 from leads …)`, so it inherits lead visibility.

**Migrations**
- Named `supabase/migrations/YYYYMMDDHHMMSS_snake_case.sql`, 80 files so far.
- Each opens with a long explanatory comment, and new enum values get their own file.
- Service-role-only tables have RLS enabled with no policies.

**Leads table**
- `leads.phone` is stored as typed. Phone normalisation lives only in code (`lib/whatsapp.ts` `waLink`, `lib/landing-public.ts` `toWaNumber`).
- Pipeline stages are new, contacted, follow_up, quoted, appointment, submission, closed_won, servicing and closed_lost.
- There are no need-analysis columns.

**Lead popup**
- Intercepted modal: `app/(app)/@modal/(.)leads/[id]/page.tsx` renders `LeadDetailContent` from `app/(app)/leads/[id]/lead-detail-content.tsx`.
- The action bar (Call / WhatsApp / Add note) is at roughly lines 356–379.
- Tabs are `"details" | "case"` (line 173).
- **No "Need Analysis" tab exists**, so we *add* a "Financial Storyboard" tab instead of renaming one.

**Navigation**
- `lib/nav.ts` holds `SIDEBAR_NAV` and `visibleNav(role)`, used by `components/sidebar.tsx` and `components/mobile-nav.tsx`.

**Patterns to reuse**
- `/f/[token]`: token, then a name + phone gate, then a per-link HMAC cookie. Code in `lib/lead-forms.ts` and `lib/lead-form-session.ts`.
- `lib/portal-session.ts`: HMAC session signed with a key derived from the service role key.
- `lib/rate-limit.ts`: `checkRateLimit(bucket, subject, max, windowSec)` and `clientIp()`.
- `bump_portal_open` RPC: an example open counter.
- Public route allowlist: `lib/supabase/middleware.ts`.

**Integrations**
- No WhatsApp API; deep links only, via `waLink()`.
- No i18n framework. The `/sijil` portal has a local `COPY[lang]` object (`lib/portal-copy.ts`).
- Audit: the `audit_log` table, which has a FK to profiles.

## Formula notes, ported exactly from `renderVals()` / `buildFlow()`

**Hibah**
- monthly = max(0, base − other), where base is either the itemised total or income × replace%.
- support = Σ monthly·12·(1+inf)^t for t < years, with years clamped to 1–30.
- Debts depend on cover status: covered = 0, partial = max(0, amt − part), unsure/no = amt.
- need = support + debts + one-off.
- have = savings + existing.
- gap = max(0, need − have).
- pct = need > 0 ? min(100, round(have/need·100)) : 100.
- **Fixture:** need RM720,806, have RM175,000, gap RM545,806.

**Medical**
- Weighted 4-group risk checklist score.
- Bill scenarios: gap = max(0, bill − company cover used − savings used).
- Bill amounts and inflation become placeholders, so fixtures use explicit test values.

**CI**
- total = recovery + extra + caregiver loss + contribution total.
- Inputs include commitments × months × pct, waiver, and early vs late structure with earlyPct.
- Concern to guard: months = 0 must give 0, never NaN.

**Business**
- Keyman: profit, salary-multiple or replacement method, with succession factor 1 / 0.75 / 0.5. CI uses 0.5 × cost.
- Buy-sell: multiple or manual valuation, less partner existing cover.
- Loan gap = guaranteed amount − existing loan protection.
- Estate slide only for non-company entities.
- Concern: partner % is never checked to sum to 100. We add a warning only; the math is unchanged.

**Mortgage (new)**
- r = rate/12. balance_k = P(1+r)^k − PMT·((1+r)^k − 1)/r.
- MRTT cover_k follows the balance at the plan's assumed rate over the cover term.
- MLTT cover is level.
- gap_k = max(0, balance_k − cover_k). surplus_k = max(0, cover_k − balance_k).
- Contributions are shown only when the agent has entered them; otherwise "From official illustration".

**Shared rules**
- Money is integer sen inside the engine, rounded once at output. Display as `RM1,234` with en-MY grouping.
- Engine output is the same shape the design uses: `out`, `scene`, `legend`, `caption` and `flow[]` of `{tag,title,value,desc,meterLabel,meterText,meter,tone}`.
- The Step 4 outcome never moves a lead **backwards**:

| Outcome | Stage | Also sets |
|---|---|---|
| Ready for quote | `quoted` | — |
| Needs spouse discussion | `follow_up` | follow-up date +3 days |
| Follow up later | `follow_up` | the date the agent picks |
| Not interested | `closed_lost` | the reason |

  A lead that is already at appointment or a later stage keeps its stage.

## Layout (new files)
```
design/financial-storyboard/          22 extracted screens + README (screen → file map)
lib/storyboard/
  engine/  money.ts hibah.ts medical.ts ci.ts business.ts mortgage.ts scenario-flow.ts index.ts
  engine/__tests__/*.test.ts          fixtures = design defaults + edge cases
  types.ts  defaults/<module>.ts      default inputs, scripts, checklists, objections (GE-only)
  settings.ts                         merge org defaults ← agent overrides
  client-summary.ts                   builds the ONLY client-visible payload
  i18n/ en.ts bm.ts(stub) index.ts    t(key) helper, EN default
  phone.ts                            E.164 +60 normaliser (012…, 12…, +6012…)
  portal.ts portal-session.ts         token lookup, name+phone gate, HMAC cookie (path /portal)
components/storyboard/
  scene-frame scenario-flow save-button accordion share-switch step-tabs module-tabs
  prospect-profile customize-toggle copy-to-wa
  scenes/ hibah-shield medical-* ci-* business-3d (CSS 3D) mortgage-curve
app/(app)/storyboards/page.tsx                                  sidebar list
app/(app)/leads/[id]/storyboard/[module]/[step]/page.tsx        fill|explain|risk|objections
app/(app)/leads/[id]/storyboard/actions.ts                      save, share, outcome, portal link
app/(app)/leads/[id]/lead-storyboard-tab.tsx                    tab + status + portal card
app/(app)/settings/tabs/storyboard-tab.tsx                      SuperAdmin org defaults
app/portal/[token]/page.tsx  app/portal/page.tsx  app/portal/storyboard/[id]/page.tsx
app/portal/actions.ts  app/portal/logout/route.ts
```

**Existing files we edit**
- `lead-detail-content.tsx`: new tab, plus a gold button in the action bar.
- `lib/nav.ts`: new sidebar item.
- `lib/supabase/middleware.ts`: add `/portal/` to the public routes.
- `next.config.ts`: `headers()` for `/portal/:path*` setting `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- `package.json`: vitest, plus the `test` and `typecheck` scripts.
- `.env.example`: `PORTAL_SESSION_SECRET` (optional; falls back to the derived key, as `/sijil` does).

## Migrations (Phase 1)

**1. `…_storyboard_module_enum.sql`**
- Enum `storyboard_module`: hibah, medical, ci, business, mortgage.

**2. `…_storyboards.sql`**
- Columns: `id, lead_id, module, inputs jsonb, outputs jsonb, client_summary jsonb, step_status jsonb, notes, outcome, saved_at, saved_by, shared_to_portal bool default false, shared_at, shared_by`.
- Unique on `(lead_id, module)`. Index on `(shared_to_portal)`.
- RLS select: follows lead visibility via `exists(select 1 from leads …)`, so managers see their downline automatically.
- RLS insert/update: `owns_lead(lead_id)` or superadmin.

**3. `…_storyboard_settings.sql`**
- Columns: `scope ('org'|'agent'), owner_id, module, settings jsonb`.
- Unique on `(scope, owner_id, module)`.
- Org rows: everyone can read, only superadmin can write. Agent rows: own only.

**4. `…_storyboard_portal_links.sql`**
- Columns: `lead_id, token (new_portal_token()), expires_at (+30d), created_by, revoked_at/by, open counters`.
- One active link per lead.
- Service role only (RLS on, a select policy follows lead visibility so the agent UI can show it).

**5. `…_portal_access_log.sql`**
- Columns: `lead_id, storyboard_id, event, ip_hash (HMAC), user_agent, created_at`.
- Events: link_open, login_ok, login_fail, locked, view, share_on, share_off, link_revoked.
- Managers can select; inserts come from the service role.

**6. `…_portal_storyboard_view.sql`**
- A view and RPC `portal_storyboards(p_lead_id)` that returns **only** `id, module, client_summary, saved_at`, and only where `shared_to_portal`.
- It never selects inputs, notes, step_status, outcome or settings, so a leak is impossible by construction.
- `client_summary` is computed server-side by the engine on save. It holds gap, need, have, the flow slides, the plan card (name, cover discussed, why), next steps, the agent's first name and WA number, and the disclaimer key. Contribution is always "From official illustration" unless the agent has entered a figure.

**Seed data**
- Fictional leads only: Aiman Hakim, Nurul Izzah, Faris Daniel, Siti Aisyah, Hafiz Rahman.
- 2 agents, 1 unit manager.
- Storyboards for several modules, one of them shared.

## Portal flow
1. The agent turns sharing on for a storyboard (off by default; logged as `share_on`).
2. "Send portal link on WhatsApp" creates or reuses the lead's active link and opens `waLink(phone, template)`.
   - Template (editable): "Salam {first name}, your storyboard is ready to view: {link}". No figures and no product names.
   - The button is disabled until at least one storyboard is shared.
3. `/portal/[token]`: the client enters full name and phone. Both are compared only against **that token's lead**, which removes cross-lead enumeration and ambiguity entirely.
   - Matching: trim, collapse whitespace, case-insensitive name; phone compared in E.164.
   - On failure the client sees one generic message. Rate limits are 5 per 15 min per token+IP and 20/hour per token, then lockout. Everything is logged.
4. On success the client gets an HMAC cookie with `lead_id`, `iat` and `exp`.
   - Flags: httpOnly, Secure, SameSite=Lax, path `/portal`.
   - Session lasts 30 min sliding, 8 h maximum. Logout clears it. Nothing is stored in localStorage.
5. Every render re-checks that the link is not revoked or expired and that the storyboard is still shared. Turning sharing off therefore takes effect immediately.
6. `/portal`: the client's shared storyboards. `/portal/storyboard/[id]`: one storyboard, built from `client_summary` only, with the disclaimer on every screen.
7. Branding is Prestige Legacy only. No GE logo and no GE colours.

## Phases (each on its own `feat/storyboard-pN` branch; never pushed to main; conventional commits)
Each phase ends with: what changed, files touched, how to test, risks, and what we need from Mal. Then we stop for "go".

**P1 Data layer**
- Migrations 1–6, hand-written TypeScript row types (matching repo style), seed data.
- Policy test: agent A cannot select or update agent B's storyboard; the unit manager can select both.

**P2 Engine and shared components**
- Add vitest.
- 5 engine modules plus `scenario-flow`, with tests: design-default snapshots; zero income, debts and months; cover greater than need (gap clamps to 0); empty inputs.
- `client-summary` tests.
- Shared components: scene-frame, scenario-flow (swipe, range input, dots, play/pause, prev/next, `aria-live`), save button ("Saved ✓ HH:MM" from DB `saved_at`), accordion (open by default), share-switch.
- i18n scaffold and a shared motion system (2.4 s / 4.8 s, `cubic-bezier(.16,1,.3,1)`, `prefers-reduced-motion`).

**P3 Hibah end to end** (the reference module)
- All 4 steps, persistence, customize (org + agent), save, Copy-to-WA, Step 4 outcome.
- Lead popup tab, gold button and status card. Sidebar `/storyboards` list with a "Shared to portal" column.
- Stop for review.

**P4a Medical, CI, Business**
- Reuse everything from P3. Business keeps its pure CSS 3D chart.

**P4b Mortgage**
- First show Mal a static design mock for approval (scene: house, loan-balance line, MRTT and MLTT cover lines, gap in red, surplus in green).
- Then build it: Explain, Risk (MRTT-specific: refinance/transfer, joint borrowers) and Objection content as editable defaults, plus the Hibah auto-feed.

**P5 Client Portal**
- Migrations 4–6 applied (if deferred), the token/login/session code, rate limits, the 3 screens (Login, Home, Story), share switch, WA link action, audit log.

**P6 QA and hardening**
- Portal leak test: call the portal data function with a valid session, then assert that no forbidden keys are present (scripts, objection, checklist, notes, settings, inputs, pipeline_stage, other lead ids).
- Operator-name grep test: no other operator names in `app/`, `lib/`, `components/`, `supabase/seed`.
- Reduced-motion check.
- Lighthouse mobile on the portal (Performance ≥ 90, Accessibility ≥ 95).
- `lint`, `typecheck`, `test` and `build` all green. No `any` in the engine.

**P7 Export**
- PDF and image via print CSS and a canvas snapshot (no external CDN scripts).
- "Combine all modules".

## Verification
- `npm run lint && npm run typecheck && npm test && npm run build` on every phase.
- `supabase start` then `supabase db reset` applies migrations and seed. The vitest RLS suite signs in as seed agents A and B and the unit manager.
- Manual run with `npm run dev`:
  - Open Aiman Hakim's lead → Financial Storyboard tab → Hibah: the gap shows RM545,806. Edit income and confirm the scene, legend, caption and flow all update together.
  - Save, reload on another browser, and confirm "Saved ✓" shows the database time.
  - Share the storyboard, then send the portal link.
  - In incognito: open `/portal/<token>`. Try a wrong name, then a wrong phone (same generic error each time). After 6 attempts, confirm lockout.
  - Log in correctly and view the storyboard. Turn sharing off, refresh, and confirm access is gone. Check `portal_access_log` has the rows.
- Response headers on `/portal/*` include `no-store` and `noindex`.
