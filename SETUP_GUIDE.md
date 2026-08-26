# Takaful4Us CRM — Vercel + Supabase Setup Guide

**Repo:** `https://github.com/Malvisse-Silverhand/prestigelegacycrm.git` (currently empty)
**Companion doc:** `CRM_MASTER_BUILD_PROMPT.md` — read that first for schema/screens/rules.
This guide is only about **infrastructure setup**: getting Next.js, Supabase, and Vercel
wired together and deployed, so Claude Code has a live foundation to build screens on.

Follow every step in order. Each step tells you exactly where to run the command
(your terminal, the Supabase dashboard, or the Vercel dashboard).

---

## Phase 1 — Prerequisites (install once)

> **You're on Windows PowerShell** — commands below are PowerShell-native. `brew` is
> macOS-only; ignore any Mac/Linux command you see referenced elsewhere.

```powershell
# 1. Check Node.js is installed (need v18.18+ or v20+)
node -v

# If not installed, install via winget (built into Windows 10 2004+ / Windows 11 —
# no extra setup needed):
winget install --id OpenJS.NodeJS.LTS -e --source winget

# IMPORTANT: close this PowerShell window and open a NEW one after installing —
# Windows only refreshes PATH in new terminal sessions, not the current one.
node -v   # confirm it now shows a version number
```

```powershell
# 2. Check git is installed
git --version

# If not installed, install via winget:
winget install --id Git.Git -e --source winget

# Close and reopen PowerShell again, then confirm:
git --version

# Set your identity (needed before your first commit anywhere)
git config --global user.name "Kamal Husaini"
git config --global user.email "webdev.kamalhusaini@gmail.com"
```

```powershell
# 3. Vercel CLI (installs fine via npm, no restriction — safe to install globally)
npm install -g vercel

# Confirm:
vercel --version
```

> **About the Supabase CLI**: skip installing it globally for now. `npm install -g supabase`
> is blocked on purpose (all platforms), and the Scoop method (`scoop bucket add
> supabase ...`) depends on git-cloning a bucket repo over the network — if your
> connection, VPN, or antivirus interferes with that clone, you'll hit an error like
> *"Please check the repository URL or network connection and try again."*
>
> Instead, you'll install Supabase CLI **as a project dependency** in Phase 2, right
> after the Next.js project is scaffolded (`npm install -D supabase`) — this is
> officially supported, needs no Scoop, and every command in this guide from Phase 4
> onward is written as `npx supabase ...` to match.
>
> If you still want the Scoop route later for a shorter global `supabase` command,
> see the **Troubleshooting** note at the end of this section.

> **If `winget` itself isn't recognized:** you're likely on an older Windows 10 build.
> Update via **Microsoft Store → search "App Installer" → Update**, or just download
> installers manually: Node.js from https://nodejs.org (LTS version) and Git from
> https://git-scm.com/download/win — run each `.exe`, click through with defaults,
> then reopen PowerShell.

> **Troubleshooting — Scoop `git clone` failed:** if you tried the Scoop method and
> got *"Please check the repository URL or network connection and try again"*, it's
> almost always one of these — you don't need to fix it now since we're using the npm
> method instead, but keep this in your back pocket:
> 1. You ran it in the same PowerShell window from before installing git — close and
>    reopen, then confirm `git --version` works, before retrying `scoop bucket add`.
> 2. A VPN, proxy, or antivirus (common on some ISPs/office networks in Malaysia) is
>    blocking the git protocol — test with `git clone https://github.com/supabase/scoop-bucket.git`
>    directly; if that also fails, it confirms a network/firewall block, not a Scoop bug.
> 3. As a universal fallback that needs no git clone at all: download the CLI `.zip`
>    directly from https://github.com/supabase/cli/releases (grab the
>    `windows_amd64.zip`), extract it, and add the extracted folder to your PATH manually.

Accounts you need (create these in the browser, free tier is fine to start):
- [ ] GitHub account with access to `Malvisse-Silverhand/prestigelegacycrm`
- [ ] Supabase account → https://supabase.com
- [ ] Vercel account → https://vercel.com (sign up with your GitHub account — this
      makes Phase 7 one click)

Accounts you need (create these in the browser, free tier is fine to start):
- [ ] GitHub account with access to `Malvisse-Silverhand/prestigelegacycrm`
- [ ] Supabase account → https://supabase.com
- [ ] Vercel account → https://vercel.com (sign up with your GitHub account — this
      makes Phase 7 one click)

---

## Phase 2 — Clone the repo & scaffold Next.js

```bash
# 1. Clone your empty repo
git clone https://github.com/Malvisse-Silverhand/prestigelegacycrm.git
cd prestigelegacycrm

# 2. Scaffold Next.js directly into this folder
#    (answer the prompts: TypeScript = Yes, ESLint = Yes, Tailwind = Yes,
#     src/ directory = Yes, App Router = Yes, import alias = keep default @/*)
npx create-next-app@latest . 

# 3. Confirm it runs
npm run dev
# open http://localhost:3000 — you should see the default Next.js page
# stop it with Ctrl+C when confirmed
```

```bash
# 4. First commit
git add .
git commit -m "chore: scaffold Next.js app"
git push origin main
```

```powershell
# 5. Install Supabase CLI as a project dependency (not global — see Phase 1 note)
npm install -D supabase

# Confirm it works — note the npx prefix, needed since it's not a global install
npx supabase --version
```

> From here on, every `supabase ...` command in this guide should be run as
> `npx supabase ...` inside this project folder. If that gets tedious, add a script
> to `package.json`: `"scripts": { "supabase": "supabase" }` and run `npm run supabase -- <command>`.

> If `git push` complains about branch name, run `git branch -M main` first.

---

## Phase 3 — Create the Supabase project

**In the browser** (https://supabase.com/dashboard):

1. Click **New Project**
2. Organisation: create one if you don't have one yet (e.g. "Takaful4Us")
3. Project name: `takaful4us-crm`
4. Database password: generate a strong one, **save it somewhere safe** (password
   manager) — you'll need it for direct DB access later
5. Region: pick **Singapore (ap-southeast-1)** — closest to Malaysia, lowest latency
6. Pricing plan: Free tier is enough to start
7. Click **Create new project** — takes ~2 minutes to provision

**Once created**, go to **Project Settings → API** and note down these 3 values
(you'll need them in Phase 5 and Phase 7):

| Value | Where to find it | Used where |
|---|---|---|
| Project URL | Settings → API → "Project URL" | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | Settings → API → "Project API keys" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | Settings → API → "Project API keys" (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` — **server-only, never expose to browser** |

Also note your **Project Ref** (the short ID in the URL, e.g. `abcdefghijklmnop`) —
you'll need it to link the CLI in the next step.

---

## Phase 4 — Database schema via Supabase CLI (schema as code)

Back in your terminal, inside the `prestigelegacycrm` folder:

```bash
# 1. Log in to Supabase CLI (opens browser for auth)
npx supabase login

# 2. Initialise Supabase config in this repo
npx supabase init

# 3. Link this local repo to your cloud project
#    (replace <project-ref> with the Project Ref you noted in Phase 3)
npx supabase link --project-ref <project-ref>
# it will ask for the database password you saved in Phase 3
```

Now create your first migration file:

```bash
npx supabase migration new init_schema
```

This creates an empty file at `supabase/migrations/<timestamp>_init_schema.sql`.
Open it and paste the **full schema from `CRM_MASTER_BUILD_PROMPT.md` Section 4**
(enums, `units`, `profiles`, `leads`, `lead_activity`, `quotations`, `quotation_plans`,
`wa_templates`, `targets`, `audit_log`, `distribution_settings`) — copy it exactly as
written there so it matches the build prompt Claude Code will follow.

Then create a second migration for RLS:

```bash
npx supabase migration new rls_policies
```

Paste the **RLS policy SQL from `CRM_MASTER_BUILD_PROMPT.md` Section 5** into this file.

Push both migrations to your live Supabase project:

```bash
npx supabase db push
```

Verify: open **Supabase Dashboard → Table Editor** — you should see all your tables
(`profiles`, `units`, `leads`, `quotations`, etc.) with RLS marked as "Enabled."

> **Why CLI + migration files instead of clicking in the dashboard UI:** every schema
> change is now version-controlled in your repo, and Claude Code can read/write
> migration files directly instead of you manually clicking through the dashboard.

---

## Phase 5 — Turn off public signup, set up invite-only auth

**In the browser** (Supabase Dashboard → Authentication → Providers):
1. Under **Email**, keep it enabled (you still need email/password login)
2. Go to **Authentication → Settings**
3. Turn **OFF** "Allow new users to sign up" — matches the Login screen copy:
   *"New agent? Ask your unit manager to send an invite."*
4. Under **Authentication → URL Configuration**, leave Site URL as `http://localhost:3000`
   for now — you'll update this to your Vercel URL in Phase 8

You will create users manually (or via an "Add User" invite flow built later) rather
than letting anyone self-register.

---

## Phase 6 — Connect Next.js to Supabase

```bash
# 1. Install the Supabase client libraries
npm install @supabase/supabase-js @supabase/ssr
```

Create `.env.local` in your project root (this file is git-ignored by default in
Next.js — confirm `.gitignore` contains `.env*.local`):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

> `NEXT_PUBLIC_*` variables are exposed to the browser — only put the anon key there,
> never the service role key. The service role key is used only in server-side code
> (API routes, Edge Functions) that you write yourself.

Create the Supabase client helpers (ask Claude Code to generate these using the
current `@supabase/ssr` pattern for Next.js App Router):
- `src/lib/supabase/client.ts` — browser client (for client components)
- `src/lib/supabase/server.ts` — server client (for server components, API routes,
  reads cookies for the logged-in session)
- `src/middleware.ts` — refreshes the auth session on every request

---

## Phase 7 — Test locally

```bash
npm run dev
```

Ask Claude Code to build a throwaway test page at `/test-connection` that does a
simple `supabase.from('units').select('*')` and prints the result (should be an empty
array `[]` at this point, since no data yet — an empty array with no error means the
connection works). Delete this test page once confirmed.

Commit your progress:

```bash
git add .
git commit -m "feat: connect Supabase client, add env template"
git push origin main
```

> Tip: also commit a `.env.local.example` file (same keys, no real values) so future-you
> or Claude Code knows what env vars the project needs, without leaking real secrets.

---

## Phase 8 — Deploy to Vercel

**Option A — via the Vercel dashboard (recommended first time):**

1. Go to https://vercel.com/new
2. Click **Import Git Repository**, select `Malvisse-Silverhand/prestigelegacycrm`
3. Framework Preset: Vercel auto-detects **Next.js** — leave defaults
4. Expand **Environment Variables** and add all 3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   (Set each for **Production, Preview, and Development** environments)
5. Click **Deploy** — takes ~1–2 minutes
6. Once done, Vercel gives you a live URL like
   `https://prestigelegacycrm.vercel.app`

**Option B — via CLI** (once you're comfortable, for future deploys):

```bash
vercel login
vercel link          # links this folder to a Vercel project
vercel env pull .env.local   # pulls env vars FROM Vercel if set there first
vercel --prod         # deploy straight to production
```

From here on, **every `git push` to `main` auto-deploys to production**, and every
push to any other branch / pull request gets its own preview URL automatically — no
extra setup needed, this is Vercel's default GitHub integration behaviour.

---

## Phase 9 — Post-deploy: allowlist the live URL + create your SuperAdmin account

**Back in Supabase Dashboard → Authentication → URL Configuration:**
1. Set **Site URL** to your real Vercel URL (`https://prestigelegacycrm.vercel.app`,
   or your custom domain once you attach one)
2. Add the same URL under **Redirect URLs**

**Create your own SuperAdmin account** (since public signup is off, the very first
user has to be created manually):

1. Supabase Dashboard → **Authentication → Users → Add User**
2. Enter your email (e.g. `webdev.kamalhusaini@gmail.com`) + a temporary password
3. Go to **Table Editor → profiles → Insert row**:
   - `id` = the UUID of the user you just created (copy from the Users list)
   - `full_name` = `Kamal Husaini`
   - `email` = same email
   - `role` = `superadmin`
   - `unit_id` = leave null
4. Go to your live URL `/login`, sign in with that email + temporary password
5. You're in as SuperAdmin — from here, use the Settings → Add User flow (once built)
   to invite everyone else, matching the hierarchy in the design file

---

## Phase 10 — Custom domain (do this later, once the CRM is stable)

**Vercel Dashboard → your project → Settings → Domains:**
1. Add your domain (e.g. `crm.takaful4us.com`)
2. Vercel gives you a CNAME or A record to add
3. Add that record wherever your domain's DNS is managed
4. Wait for propagation (usually minutes, sometimes up to a few hours) — Vercel
   auto-issues an SSL certificate once it verifies

Remember to also update **Supabase → Authentication → URL Configuration → Site URL**
to the new custom domain once it's live.

---

## Ongoing workflow, going forward

- **Schema changes**: always via `supabase migration new <name>` → edit the SQL file →
  `supabase db push`. Never make ad-hoc changes by clicking in the dashboard once
  you're past initial setup — keep schema in git, matching migrations Claude Code writes.
- **Branching**: build each screen from `CRM_MASTER_BUILD_PROMPT.md` Section 6 on its
  own branch, open a PR, review the Vercel preview URL, merge to `main` when confirmed.
- **Secrets**: if you ever need a new secret (e.g. Pabbly webhook capture endpoint auth
  token), add it in Vercel → Settings → Environment Variables, and `supabase secrets set`
  for anything used inside an Edge Function.

---

## Quick command reference

```bash
# Local dev
npm run dev

# New DB migration
npx supabase migration new <name>
npx supabase db push

# New Edge Function (for the quotation capture endpoint from the build prompt)
npx supabase functions new capture-quotation
npx supabase functions deploy capture-quotation

# Deploy manually (normally automatic via git push)
vercel --prod

# Pull the latest env vars Vercel has, into local .env.local
vercel env pull .env.local
```
