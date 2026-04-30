---
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Skill, AskUserQuestion
argument-hint: <path-to-old-site> (absolute or relative to cwd)
description: Port an old site into this Secure Vibe Coding OS install — homepage, blogs, dashboard, and backend pages — without opening new vulnerabilities
---

# /port-old-site — Port a legacy site onto this Secure Vibe Coding OS install

You are porting an existing application (the **old site**) onto this repo (the **new site** — a Secure Vibe Coding OS install). Your job is to translate the old site's purpose, content, and feature surface into this repo's framework **without weakening its security posture**.

## Hard rules (apply to every phase)

1. **Never make assumptions about behavior, data, or auth.** When in doubt, stop and `AskUserQuestion`.
2. **Default to this repo's stack** (Next.js App Router, Convex, Clerk, Tailwind, shadcn/ui, Doppler/.env.local for secrets). If the old site used a different stack, you re-implement equivalent functionality on this stack — do NOT copy-paste server code, framework configs, middleware, auth code, payment code, or env loading from the old site.
3. **Always recommend the more secure option.** If the user requests something that weakens posture (disable CSRF, skip auth on a route, embed third-party scripts, hardcode secrets, accept arbitrary HTML, etc.), explain the risk, propose the secure alternative, and only proceed with the insecure path on explicit confirmation — and document the deviation in the phase's PR description.
4. **Consult the security skills** in `.claude/skills/security/` for every change that touches an attack surface. Map work to skills:
   - New API routes / server actions → `input-validation`, `rate-limiting`, `csrf-protection`, `error-handling`
   - Auth-touching code → `auth-security`
   - Payments / billing → `payment-security`
   - AI/chat surfaces → `ai-chat-protection`
   - Headers, CSP, cookies → `security-headers`
   - New deps → `dependency-security`
   - Tests → `security-testing`
5. **No hardcoded secrets, no `@ts-ignore`, no `npm run dev` started by you** (per project CLAUDE.md). Use the env layer the install picked (Doppler if `.doppler.yaml` exists, else `.env.local`).
6. **Each phase is a separate branch + PR** per the project's `CLAUDE.md` rules. Branch from `main` with `feat/port-<phase>-<slug>`. Don't push directly to `main`.
7. **Plan, then confirm, then execute.** At the start of every phase, present the concrete change list and `AskUserQuestion` to confirm before editing files.

## Usage

```
/port-old-site <path-to-old-site>
```

The path is **required** but can be **absolute or relative to the current working directory** (e.g. `/Users/me/code/oldsite`, `~/code/oldsite`, `../oldsite`, or `oldsite`). Always normalize it to an absolute path before any further use, and from that point on store/print the absolute form (so the plan file is unambiguous if the user later runs the command from a different `cwd`).

Resolution recipe — run this once at the very top, after the resume check:

```bash
RAW="$ARGUMENTS"
# Expand ~ if the user typed it
EXPANDED="${RAW/#\~/$HOME}"
# Resolve to absolute. -m so it doesn't fail if a sub-segment is symlinked oddly.
OLD="$(cd "$(dirname -- "$EXPANDED")" 2>/dev/null && cd "$(basename -- "$EXPANDED")" 2>/dev/null && pwd -P)"
# Fallback if the cd-twice form failed (e.g., path is a single segment in cwd):
[ -z "$OLD" ] && OLD="$(cd "$EXPANDED" 2>/dev/null && pwd -P)"
echo "$OLD"
```

If `$ARGUMENTS` is empty, or the resolved `$OLD` is empty / not a directory / not readable, `AskUserQuestion` for a corrected path. **Reject** any resolved path that equals the new-site path (`pwd -P` of this repo) — porting a repo onto itself is a mistake; ask the user for the correct old-site path. From here on, every reference to "the old-site path" means the absolute, resolved `$OLD`.

## Living plan document

The full port is tracked in **`docs/PORT-PLAN.md`** in this repo. It is the single source of truth for what's done and what's next, and it survives across Claude Code sessions. Treat it as a living checklist:

- Every phase's tasks live there as `- [ ]` items grouped under a phase heading.
- When you finish a task, flip its checkbox to `- [x]` and append the date.
- When the user confirms a phase passed their test, mark the phase's "User accepted" line and update the "Status" line.
- Never rewrite the file from scratch mid-port — only append, edit specific lines, or check off boxes.

### Resume check (run FIRST, before anything else)

```bash
test -f docs/PORT-PLAN.md && echo PLAN_EXISTS || echo NO_PLAN
```

- **If `PLAN_EXISTS`**: read the file fully. Identify the old-site path it was created for, the current phase, and which items are still unchecked. Then `AskUserQuestion`:

  > "I found an existing port plan in `docs/PORT-PLAN.md` targeting `<old-path-from-plan>`, currently at `<current-phase>` with `<N>` items still open. Continue this plan, or start over?"

  Options:
  - `Continue this plan` — verify the `$ARGUMENTS` old-site path matches the plan; if it doesn't, ask which is correct. Then jump straight to the next unchecked item under the next active phase. **Skip Phase 0 discovery** — re-read the existing summary from the plan instead.
  - `Start over (replace the plan)` — confirm a second time (this is destructive): `AskUserQuestion` "Confirm: I will overwrite docs/PORT-PLAN.md and any in-flight `feat/port-*` branches you have are unaffected on disk but will no longer be referenced by the plan. Proceed?". On confirm, `Read` the existing file once for archival reference, rename it to `docs/PORT-PLAN.archive-<YYYY-MM-DD>.md`, then continue with Phase 0.
  - `Cancel` — stop.

- **If `NO_PLAN`**: continue to Phase 0.

---

## Phase 0 — Pre-flight (run before showing any plan)

### 0.1 Confirm Secure Vibe Coding OS is installed *here*

Run these checks in the current working directory (`pwd`):

```bash
test -f package.json && test -f app/layout.tsx && test -d app/dashboard && test -d convex && test -d .claude/skills/security && echo OS_PRESENT || echo OS_MISSING
test -f .doppler.yaml && echo DOPPLER || (test -f .env.local && echo LEGACY || echo NO_ENV)
test -f docs/INSTALL.md && echo INSTALLED || echo NOT_INSTALLED
```

- If `OS_MISSING`: STOP. Tell the user this directory does not look like a Secure Vibe Coding OS install and ask them to run `/install` first or `cd` to the right project.
- If `NOT_INSTALLED` or `NO_ENV`: tell the user the OS files are present but `/install` has not run. Ask whether to abort and run `/install` first (recommended) or proceed knowing env wiring may be incomplete.
- Capture the env mode (`DOPPLER` or `LEGACY`) — every later command that touches secrets or runs the app must respect it.

### 0.2 Confirm the old-site path is reachable and reviewable

`$OLD` was already resolved to an absolute path in the **Usage** step above. Confirm two things now:

**(a) Reachable from this Claude Code session.** A path can resolve and still be unreadable if it lies outside the harness's allowed directories. Probe before relying on it:

```bash
test -d "$OLD" -a -r "$OLD" && echo READABLE || echo UNREADABLE
ls -1 "$OLD" 2>/dev/null | head -5
```

If `UNREADABLE` (or the listing is empty when the dir clearly should not be), the path resolves but Claude can't read it — the user likely needs to add the parent dir to `additionalDirectories` in their settings, or move/symlink the repo into an already-allowed directory. Stop, explain that, and `AskUserQuestion` whether to retry the same path, accept a different path, or cancel.

**(b) Enough markers to actually review.** Look for at least one credible codebase marker (read-only, don't execute):

```bash
for f in package.json requirements.txt pyproject.toml composer.json Gemfile go.mod Cargo.toml \
         next.config.js next.config.ts next.config.mjs vite.config.ts vite.config.js \
         astro.config.mjs nuxt.config.ts svelte.config.js \
         index.html app.py manage.py main.go README.md README.rst; do
  test -f "$OLD/$f" && echo "MARKER:$f"
done
```

If no markers come back, the directory may not actually be a code repo. Echo the resolved absolute `$OLD` back to the user, ask whether they pointed at the right path, and `AskUserQuestion` for the next step (retry path / cancel).

Once readable + at least one marker found, read each marker you got a hit on (e.g., `package.json` for deps + scripts, `next.config.*` to confirm framework, `README.md` for the product description). Identify: framework, language, primary pages/routes, data layer, auth, payments (if any), public APIs, third-party integrations.

### 0.2.5 Brief identification — confirm this is the right site BEFORE the deep read

Before sinking time into the full deep-read in 0.3, present a **short** identification of what you found and ask the user to confirm it's the intended old site. Keep this to ~5 lines; do not draft the full summary yet.

Write back to the user, in this exact shape:

> I read the codebase at `<resolved absolute $OLD>`. Quick identification:
> - **Project name / package**: `<name from package.json or repo dir>`
> - **Stack**: `<framework + language + key libs>` (e.g., "Next.js 14 + TypeScript + Prisma + NextAuth")
> - **Apparent purpose** (from README + top-level routes): `<one-line guess>`
> - **Top-level dirs**: `<comma-separated, max 8>`
> - **Last modified** (newest file under src/app/pages, ignoring node_modules): `<date>`
>
> Is this the site you want to port?

Then `AskUserQuestion`:

- `Yes, this is the right site — proceed to deep-read`
- `Wrong path / wrong repo — let me give you a different one`
- `Right path but my description is off — let me clarify`

Behavior:
- `Yes`: continue to Phase 0.3.
- `Wrong path`: collect the corrected path via the "Other" field, re-run the resolution recipe from the **Usage** step against it, re-run 0.2 (reachable + markers), and re-run 0.2.5. Loop until the user says yes or cancels.
- `Right path but my description is off`: take the user's correction (free text via "Other") as ground truth — if they say it's a different stack or product than you guessed (e.g., "no, this is a Django app served behind Next, not Next itself"), revise your understanding accordingly and re-show the brief identification. Only proceed to 0.3 once they confirm.

This brief confirmation is mandatory. Do not skip it even if 0.2 found markers — the marker scan tells you the path is *a* codebase, not that it's *the* codebase.

### 0.3 Deep-read the old site

Read enough of the old site to *describe it back accurately*. Use `Read`/`Glob`/`Grep`. Build a written summary that includes:

- **What the product is** (1–2 sentences — what does it do, for whom?).
- **Core pages** (public + authenticated) — list each route/page and its purpose.
- **Data model** — main entities, where they live (DB, files, third-party).
- **Auth model** — anonymous-vs-authenticated, roles/permissions if any.
- **Payments / monetization** — none / Stripe / other.
- **Third-party integrations** — OAuth providers, APIs, webhooks, analytics.
- **Public assets** — branding, logos, hero imagery, color palette, copy tone.

Present this summary to the user and `AskUserQuestion`:

> "Does this summary of your old site match your intent for the port? Anything to correct or add before I draft the phase plan?"

Options: `Looks correct, draft the plan` / `I have corrections` / `Cancel port`.

If `I have corrections`, take their input as free text via the "Other" field and revise the summary; re-confirm.

### 0.4 Draft the phase plan and write it to `docs/PORT-PLAN.md`

Build the plan tailored to what you found in 0.3. Each backend page in the old site becomes its own Phase 4+ entry. Write the file using the structure below, with **every actionable task as a `- [ ]` checkbox**, so the user can see at a glance what is queued and you can check items off as you finish them.

Plan-doc skeleton (write this verbatim, filling in the placeholders):

```markdown
# Port plan: <Old site name> → this Secure Vibe Coding OS install

- **Old-site path:** `<absolute path>`
- **New-site path:** `<absolute path of this repo>`
- **Env mode:** `<DOPPLER | LEGACY>`
- **Created:** `<YYYY-MM-DD>`
- **Status:** `Awaiting plan approval`
- **Current phase:** `Phase 0 — pending approval`

## Old-site summary (confirmed by user in Phase 0.3)

<the summary text the user accepted>

## Phase 1 — Homepage
- [ ] Branch `feat/port-1-homepage` cut from latest main
- [ ] Old-site asset inventory complete — every homepage image and copy block catalogued
- [ ] Old-site images copied into `public/` and wired to landing components (feature illustrations, section graphics, logos, etc.)
- [ ] `app/layout.tsx` metadata.title and metadata.description updated (reuse old site's title/description if strong; improve otherwise)
- [ ] Hero copy: reused from old site if strong, improved otherwise
- [ ] **Hero banner: freshly generated 16:9 image projecting the backend UI** (per Phase 0 plan — dashboard / data / workflow this product's authenticated users will actually see). The old hero is NOT reused here — backend projection is the whole point of this image.
- [ ] Feature section images: reused from old site
- [ ] Every other landing image: reused from old site
- [ ] Feature sections: copy reused verbatim from old site where strong, improved otherwise
- [ ] Testimonials reconciled (real reused with attribution / removed / clearly placeholder)
- [ ] FAQs reused from old-site content (light copy edits OK; do not invent)
- [ ] CTAs point to existing routes
- [ ] `npx tsc --noEmit` green
- [ ] User accepted: <pending>

## Phase 2 — Blog
- [ ] Branch `feat/port-2-blog` cut from latest main
- [ ] Removed `content/blog/getting-started-with-secure-vibe-coding.mdx`
- [ ] Removed `content/blog/llm-seo-optimization-guide.mdx`
- [ ] Removed `content/blog/security-best-practices-for-saas.mdx`
- [ ] Removed orphaned banner images under `public/blog/images/`
- [ ] User approved 10-topic list
- [ ] Post 1 created (<topic>)
- [ ] Post 2 created (<topic>)
- [ ] Post 3 created (<topic>)
- [ ] Post 4 created (<topic>)
- [ ] Post 5 created (<topic>)
- [ ] Post 6 created (<topic>)
- [ ] Post 7 created (<topic>)
- [ ] Post 8 created (<topic>)
- [ ] Post 9 created (<topic>)
- [ ] Post 10 created (<topic>)
- [ ] `npx tsc --noEmit` green
- [ ] User accepted: <pending>

## Phase 3 — Dashboard relevance
- [ ] Branch `feat/port-3-dashboard` cut from latest main
- [ ] `section-cards.tsx` metric labels/icons updated
- [ ] `chart-area-interactive.tsx` axis/series labels updated
- [ ] `data.json` rows reshaped to old-site primary entity
- [ ] `data-table.tsx` columns reshaped to new schema
- [ ] Security dashboard untouched (verified)
- [ ] `convex/schema.ts` untouched (verified)
- [ ] `npx tsc --noEmit` green
- [ ] User accepted: <pending>

## Phase 4+ — Backend pages
<one subsection per old-site backend page; each with checkboxes for branch, inventory, schema additions, queries/mutations, page UI, validation, rate limiting, CSRF (if applicable), error handling, security logging, tests, user accept>

## Deviations log
<every time the user approves an insecure-by-default choice, append a row: date, what, why, mitigation>

## Notes for resume
<short pointer to the next unchecked item, kept updated at end of every phase>
```

After writing the file, summarize the plan inline in chat (top-level phases + total task count) and `AskUserQuestion`:

> "I've written the full port plan to `docs/PORT-PLAN.md`. Please review it. Approve to start Phase 1, request changes, or cancel."

Options: `Approve and start Phase 1` / `I want changes to the plan` / `Cancel`.

- If `I want changes to the plan`: collect the user's edits via "Other", apply them by editing `docs/PORT-PLAN.md` (Edit tool, do not rewrite the file), then re-confirm. Loop until approved.
- If `Cancel`: stop and leave the plan file in place so they can resume later.
- Only on `Approve and start Phase 1` do you proceed to Phase 1 work. Update the plan's `Status:` to `Phase 1 in progress` and `Current phase:` to `Phase 1 — Homepage` before doing anything else.

---

## Phase completion protocol (apply to every phase, 1 through N)

This protocol is mandatory. Do **not** skip steps and do **not** start the next phase without it.

1. **Open the phase**: read `docs/PORT-PLAN.md`, find the next phase whose tasks aren't all checked, update `Status:` and `Current phase:` to reflect that phase is in progress, list the open `- [ ]` items in chat.
2. **Execute one task at a time**: after each task completes, update its checkbox to `- [x] <task> (<YYYY-MM-DD>)` in `docs/PORT-PLAN.md` using the Edit tool. Do not batch checkbox updates — flip them as you go so a session restart sees accurate progress.
3. **Phase build/verify**: run `npx tsc --noEmit` (and `npx convex dev --once --typecheck=enable` for Convex changes). Fix anything red before moving on. Check the corresponding plan items.
4. **User test gate**: at the end of every phase, before opening the PR, `AskUserQuestion`:

   > "Phase `<N>` (`<name>`) is implemented and typechecks clean. Please test it locally (homepage in browser / blog index / dashboard / etc.) and tell me whether it's accepted."

   Options:
   - `Accepted, proceed to PR and next phase`
   - `Needs changes — I have feedback`
   - `Pause here, I'll come back later`

   - On `Accepted`: flip the phase's `User accepted: <pending>` line to `User accepted: <YYYY-MM-DD>`, run `/commit` then `/create-pull-request`, then continue to the next phase by re-entering this protocol at step 1.
   - On `Needs changes`: take the feedback (free text via "Other"), apply edits, re-run typecheck, re-ask the test gate. Do NOT mark the phase accepted.
   - On `Pause`: update `Status:` in the plan to `Paused at end of Phase <N>` and `Notes for resume` to point at the first unchecked item of Phase `<N+1>`. Stop the command. The user will re-run `/port-old-site <path>` later — the resume check at the top of this command will find the plan and pick up where they left off.
5. **Never proceed to phase `N+1` without an explicit "Accepted" answer for phase `N`.**

---

## Phase 1 — Homepage port

Goal: replace the new repo's landing page so that it is *fully relevant to the old site's product*. **Reuse the old site's images and copy** for the bulk of the page (feature sections, illustrations, testimonials, FAQs). The **hero banner is the one exception** — it is freshly generated to project the backend UI this product's authenticated users will see (per the Phase 0 plan), since the old site's hero typically advertises the marketing brand, not the application backend.

### 1.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/port-1-homepage
```

### 1.2 Inventory old-site assets

Before touching any landing component, walk the old site and catalogue:

- **Images**: hero, feature illustrations, section graphics, logos, OG/social images. Note path on disk (or URL if remote), dimensions, and intended placement.
- **Copy**: hero headline + subhead, feature section titles + body copy, testimonials (with attribution), FAQ Q+A pairs, CTA text, footer text.
- **Brand**: color palette / typography hints — to keep the regenerated hero stylistically aligned.

Write the inventory into the plan (`docs/PORT-PLAN.md`) under Phase 1 so the user can review what's being carried over.

### 1.3 Files in scope

- `app/layout.tsx` — `metadata.title`, `metadata.description`, OG tags. Reuse the old site's title/description if strong; improve only if weak (vague, keyword-stuffed, generic).
- `app/(landing)/page.tsx` and every component it imports from `app/(landing)/` (hero, features, testimonials, FAQs, CTA, footer text, etc.).
- Old-site images: copy them into `public/` (e.g., `public/landing/<name>.jpg`) and rewire the imports in the landing components. Local files only — don't add new external image domains to `next.config` without explicit user approval (see security checks in 1.6).
- Hero image only: freshly generated via `scripts/generate-image.js` (see 1.4). Save to `public/landing/hero.jpg` (or similar) and import from the hero component.

### 1.4 Hero banner — generate fresh, project the backend UI

The hero is the one image that must be regenerated. The old site's hero almost certainly advertises a marketing brand, not the application backend the new site puts behind auth — so reusing it would mis-set expectations. Generate a new 16:9 hero that:

- (a) Is visually relevant to the old site's product domain, and
- (b) **Projects what the backend of the application can look like** — suggest the dashboard / data / workflow / map / chart / queue / table that authenticated users will see (pull these specifics from the Phase 0 plan).

Prompt template (fill in from the plan):

```bash
# Doppler mode
doppler run -- node scripts/generate-image.js "<product domain> dashboard hero — <specific backend artifact, e.g., 'analytics overview with KPI cards and time-series chart'>, modern UI, 16:9, no text in image, <brand-aligned style>" "public/landing/hero.jpg" --aspect-ratio 16:9
# Legacy mode
node scripts/generate-image.js "<...same prompt...>" "public/landing/hero.jpg" --aspect-ratio 16:9
```

If the script reports `GEMINI_API_KEY is not set`, follow the missing-key flow documented in `.claude/commands/create-blog.md` (offer "I'll add it" or "I'll paste it here, you handle it" — never echo the key back in chat).

### 1.5 Copy & section content — reuse first, improve where weak

For everything below the hero, the directive is **reuse**:

- **Feature sections**: copy verbatim from the old site's actual sections (titles + body copy). Improve only if a block is genuinely weak — vague, broken, or full of dead-link CTAs. Do not invent capabilities the old site doesn't advertise.
- **Testimonials**: if the old site has real testimonials with attribution, reuse them as-is. If they're stock/placeholder, either remove the section or mark it clearly as a placeholder.
- **FAQs**: pull from the old site's actual FAQ / docs / support content. Light copy edits are fine; do not invent Q+A.
- **Hero copy** (headline + subhead): reuse the old site's value prop verbatim if strong. If it's weak, improve it using the Phase 0.3 summary the user accepted.
- **CTAs**: point to routes that exist on the new site (sign-in, dashboard, contact). If a route doesn't exist yet, use `#` and add a note in the PR.

### 1.6 Security checks for Phase 1

Even on a content-only homepage, watch for:
- **No raw HTML from the old site** — if you copy copy or markup, sanitize. If you must render HTML, use a vetted sanitizer (see `input-validation`).
- **Image hosting**: keep images local in `public/`. Don't add new external image domains to `next.config` without explicit user approval.
- **External scripts** (analytics, chat widgets, embeds): default = don't add them. If the user requests one, route through `security-headers` (CSP) and `dependency-security` first.
- **Metadata leaks**: don't include internal URLs, staging hosts, or admin emails in `<meta>`.

### 1.7 Verify and PR

```bash
npx tsc --noEmit
```

Then ask the user (per CLAUDE.md, you do not start the dev server) to run `npm run dev:doppler` (Doppler) or `npm run dev` (legacy) and visually confirm the homepage. After they confirm, run `/commit` then `/create-pull-request`.

---

## Phase 2 — Blog content port

Goal: remove the 3 placeholder posts and replace with 10 articles relevant to the old site's product.

### 2.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/port-2-blog
```

### 2.2 Remove placeholders

The placeholders live in `content/blog/`:
- `getting-started-with-secure-vibe-coding.mdx`
- `llm-seo-optimization-guide.mdx`
- `security-best-practices-for-saas.mdx`

Delete those three files and any images they reference under `public/blog/images/` that are no longer used.

### 2.3 Generate 10 new posts via `/create-blog`

Propose a list of 10 topics derived from the old site's product domain. Examples of topic angles to pull from:
- The product's core problem and how to solve it (top-of-funnel, SEO).
- The product's primary features, one per post.
- Industry / domain context that would attract the product's target users.
- Comparison / "vs." posts (only if accurate — never invent competitive claims).
- Migration / how-to guides specific to the product.

Present the 10-topic list and `AskUserQuestion` for approval / edits before generating.

For each approved topic, invoke the create-blog skill:

```
Skill: create-blog with arg "<topic>"
```

Each post will produce a banner image via `scripts/generate-image.js`. Do **not** regenerate or alter any post that the user has already accepted; treat each blog as atomic.

### 2.4 Security checks for Phase 2

- MDX content can execute components — restrict imports in posts to the existing whitelisted MDX components (see `app/blog/components/`). Do not enable arbitrary component imports.
- Frontmatter `image:` paths must be local under `public/blog/images/`. Reject external URLs.
- If a topic touches code samples, verify samples don't include real secrets or insecure patterns (see `security-awareness/injection-vulnerabilities`).

### 2.5 Verify and PR

`npx tsc --noEmit`, ask the user to view `/blog` in dev, then `/commit` and `/create-pull-request`.

---

## Phase 3 — Dashboard relevance

Goal: keep the new repo's dashboard layout/format intact, but change *what is shown* so it is meaningful to the old site's domain. Do **not** restructure the dashboard or change its routing/auth model in this phase.

### 3.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/port-3-dashboard
```

### 3.2 Files in scope

- `app/dashboard/page.tsx` — top-level layout stays; section composition can change.
- `app/dashboard/section-cards.tsx` — card metrics: change labels, units, icons to match the old site's domain (e.g., "Active Customers", "Open Tickets", "Inventory On Hand"). Use placeholder numbers for now and clearly mark them as such.
- `app/dashboard/chart-area-interactive.tsx` — change axis labels, series names, and legend to the old site's domain. Keep the chart shape; do not wire to real data yet.
- `app/dashboard/data.json` — replace seed rows with rows whose schema matches the old site's primary entity (e.g., Orders, Patients, Projects). Keep field count similar so the existing `data-table.tsx` columns work.
- `app/dashboard/data-table.tsx` — adjust column headers and accessor keys to match the new `data.json` schema.
- `components/section-cards.tsx` icons (lucide / tabler) — pick icons that match the new domain.

### 3.3 Hard constraints for Phase 3

- **Do NOT** modify `app/dashboard/security/` or `app/dashboard/app-sidebar.tsx` admin gating logic. Security dashboard stays as-is.
- **Do NOT** change Convex schemas (`convex/schema.ts`) yet — Phase 4+ phases handle real entities.
- **Do NOT** add new API routes or Convex queries in this phase. Keep it presentational.

### 3.4 Security checks for Phase 3

- Confirm any new copy/labels do not leak admin-only terminology to non-admin users (review `app-sidebar.tsx` admin gates remain intact).
- Re-read `auth-security` to confirm the admin-vs-member split still matches the old site's role model. If the old site has roles beyond admin/member, defer that to a later phase and note it.

### 3.5 Verify and PR

`npx tsc --noEmit`, user views `/dashboard`, `/commit`, `/create-pull-request`.

---

## Phase 4+ — One backend page per phase

For each authenticated/backend page identified in Phase 0.3, run a dedicated phase. Order them by dependency (entities that other pages reference go first).

### Per-page phase template

Before starting each phase, present the page's plan and `AskUserQuestion` for approval.

#### A. Branch

```bash
git checkout main && git pull
git checkout -b feat/port-<N>-<page-slug>
```

#### B. Inventory the old page

Read the old site's implementation of this page. Document:
- Inputs (URL params, query string, form fields, file uploads).
- Auth (anonymous, member, admin) and any per-row authorization.
- Reads (which DB tables / external APIs).
- Writes (mutations, side effects, emails, payments, webhooks).
- Validation and error handling.
- Rate limits, CSRF tokens, idempotency.

#### C. Map to this stack

- **Routing**: a new file under `app/dashboard/<slug>/page.tsx` (or a public route under `app/<slug>/page.tsx` if it was unauthenticated). Match the old slug if SEO-relevant.
- **Server logic**: Convex queries/mutations under `convex/<entity>.ts`. Never use `fetch` to call external APIs from a client component for sensitive operations — proxy through Convex actions or a Next.js Route Handler.
- **Schema**: extend `convex/schema.ts` with the entity. Add indexes that match the old site's access patterns.
- **Auth**: use `useQuery(api.users.checkIsAdmin)` and existing Clerk gates. For per-row authorization, read `auth-security`.
- **Validation**: every mutation argument validated via Convex `v.*` validators **and** server-side business-rule checks (see `input-validation`). Never trust the client.
- **Rate limiting**: any mutation that can be triggered repeatedly (search, contact, AI prompts, login adjacent) gets rate-limited per `rate-limiting`.
- **CSRF**: any non-Convex POST endpoint must use the project's CSRF helper (see `csrf-protection`). Convex mutations are CSRF-safe by design — do not introduce parallel REST endpoints.
- **Error handling**: never echo raw error messages to the client (see `error-handling`). Return structured, non-leaky errors.
- **Logging**: log auth-relevant events to `securityEvents` (see `convex/security.ts`).

#### D. UI

- Reuse existing shadcn/ui primitives in `components/ui/` and the dashboard layout.
- Don't add new UI libraries without `dependency-security` review.
- All forms use server-side validation; client validation is UX-only.

#### E. Tests

Add at minimum one happy-path and one auth-failure test using the patterns in `security-testing`.

#### F. Migration of data (if applicable)

If the user wants existing data migrated:
- **STOP and confirm** the source DB credentials path. Never paste live credentials into chat.
- Write a one-shot migration as a Convex action that reads from a temporary export file (CSV / JSON) the user places under a gitignored path. Do not connect to the old DB directly from this repo without a written, time-boxed credential and explicit approval.

#### G. Verify and PR

`npx tsc --noEmit`, user verifies in dev, `/commit`, `/create-pull-request`.

---

## Cross-cutting "do this if you see it" list

- **The old site has client-side env vars with secrets** (e.g., `NEXT_PUBLIC_*` containing API keys that should be private): treat as a finding. Move to server-side; never copy a public exposure.
- **The old site stores passwords directly**: do not port the auth code. Use Clerk; document this as a security improvement.
- **The old site uses `dangerouslySetInnerHTML` on user content**: refuse to port verbatim. Sanitize via the input-validation skill.
- **The old site uses raw SQL with string concatenation**: re-implement as Convex queries (no SQL surface). Note as a security improvement.
- **The old site runs a long-lived background worker / cron**: map to a Convex scheduled action or a Vercel Cron, not a separate Node process.
- **The old site has S3 / blob storage**: map to Vercel Blob or Convex file storage. Default new buckets to private; only the user can flip to public after explicit confirmation.

---

## When you're unsure

Stop. `AskUserQuestion`. The right answer to "should I keep the old site's auth check?" or "should I copy this middleware?" is almost always **no, re-implement on this stack** — but ask before deviating from a literal port of business logic.
