---
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Skill, AskUserQuestion
argument-hint: [product-name-or-pitch] (optional)
description: Build a brand-new product on this Secure Vibe Coding OS install — homepage, blog, dashboard, and backend pages — by eliciting requirements from the user
---

# /create-new-site — Build a new product onto this Secure Vibe Coding OS install

You are building a brand-new product on this repo (a Secure Vibe Coding OS install). There is no old site to port from — instead, you will **elicit the product definition from the user** through a structured, multi-phase conversation, then translate that definition into pages, components, and Convex backend code **without weakening this repo's security posture**.

## Hard rules (apply to every phase)

1. **Never make assumptions about behavior, data, or auth.** When in doubt, stop and `AskUserQuestion`. The whole point of this command is that the answers are coming from the user, not your guesses.
2. **Default to this repo's stack** (Next.js App Router, Convex, Clerk, Tailwind, shadcn/ui, Doppler/.env.local for secrets). If the user asks for a different stack (Postgres directly, NextAuth, custom Node server, etc.), explain that the OS is built around Convex+Clerk and propose the Convex+Clerk equivalent — only deviate on explicit approval.
3. **Always recommend the more secure option.** If the user asks for something that weakens posture (disable CSRF, skip auth on a route, embed arbitrary third-party scripts, hardcode secrets, accept raw HTML, public-by-default storage, etc.), explain the risk, propose the secure alternative, and only proceed with the insecure path on explicit confirmation — and log the deviation in the plan doc's `Deviations` section.
4. **Consult the security skills** in `.claude/skills/security/` for every change that touches an attack surface. Map work to skills:
   - New API routes / server actions → `input-validation`, `rate-limiting`, `csrf-protection`, `error-handling`
   - Auth-touching code → `auth-security`
   - Payments / billing → `payment-security`
   - AI/chat surfaces → `ai-chat-protection`
   - Headers, CSP, cookies → `security-headers`
   - New deps → `dependency-security`
   - Tests → `security-testing`
5. **No hardcoded secrets, no `@ts-ignore`, no `npm run dev` started by you** (per project CLAUDE.md). Use the env layer the install picked (Doppler if `.doppler.yaml` exists, else `.env.local`).
6. **Each phase is a separate branch + PR** per the project's `CLAUDE.md` rules. Branch from `main` with `feat/build-<phase>-<slug>`. Don't push directly to `main`.
7. **Plan, then confirm, then execute.** At the start of every phase, present the concrete change list and `AskUserQuestion` to confirm before editing files.

## Usage

```
/create-new-site
/create-new-site "Acme Analytics"
/create-new-site "A team todo app for distributed engineering teams"
```

The argument is **optional**. If provided, treat it as either a product name or a short elevator pitch — Phase 0 will use it to seed the first round of elicitation. If omitted, Phase 0 starts with a blank slate.

## Living plan document

The full build is tracked in **`docs/BUILD-PLAN.md`** in this repo. It is the single source of truth for what's done and what's next, and it survives across Claude Code sessions. Treat it as a living checklist:

- Every phase's tasks live there as `- [ ]` items grouped under a phase heading.
- When you finish a task, flip its checkbox to `- [x]` and append the date.
- When the user confirms a phase passed their test, mark the phase's "User accepted" line and update the "Status" line.
- Never rewrite the file from scratch mid-build — only append, edit specific lines, or check off boxes.

### Resume check (run FIRST, before anything else)

```bash
test -f docs/BUILD-PLAN.md && echo PLAN_EXISTS || echo NO_PLAN
```

- **If `PLAN_EXISTS`**: read the file fully. Identify the product name, current phase, and which items are still unchecked. Then `AskUserQuestion`:

  > "I found an existing build plan in `docs/BUILD-PLAN.md` for `<product-from-plan>`, currently at `<current-phase>` with `<N>` items still open. Continue this plan, or start over?"

  Options:
  - `Continue this plan` — jump straight to the next unchecked item under the active phase. **Skip Phase 0 elicitation** — re-read the product summary from the plan instead.
  - `Start over (replace the plan)` — confirm a second time (this is destructive): `AskUserQuestion` "Confirm: I will archive `docs/BUILD-PLAN.md` to `docs/BUILD-PLAN.archive-<YYYY-MM-DD>.md` and start Phase 0 from scratch. Any in-flight `feat/build-*` branches you have are unaffected on disk but will no longer be referenced by the plan. Proceed?". On confirm, rename the existing file to the archive name, then continue with Phase 0.
  - `Cancel` — stop.

- **If `NO_PLAN`**: continue to Phase 0.

---

## Phase 0 — Elicit the product, then plan

### 0.1 Confirm Secure Vibe Coding OS is installed *here*

Run these checks in the current working directory (`pwd`):

```bash
test -f package.json && test -f app/layout.tsx && test -d app/dashboard && test -d convex && test -d .claude/skills/security && echo OS_PRESENT || echo OS_MISSING
test -f .doppler.yaml && echo DOPPLER || (test -f .env.local && echo LEGACY || echo NO_ENV)
test -f docs/INSTALL.md && echo INSTALLED || echo NOT_INSTALLED
node scripts/modules.mjs status
```

- If `OS_MISSING`: STOP. Tell the user this directory does not look like a Secure Vibe Coding OS install and ask them to run `/install` first or `cd` to the right project.
- If `NOT_INSTALLED` or `NO_ENV`: tell the user the OS files are present but `/install` has not run. Ask whether to abort and run `/install` first (recommended) or proceed knowing env wiring may be incomplete.
- Capture the env mode (`DOPPLER` or `LEGACY`) — every later command that touches secrets or runs the app must respect it.
- Capture the installed content modules. Later phases build on them:
  - **Homepage phase** requires `homepage-content` — if missing, install it first (run the `/add-module` flow: `node scripts/modules.mjs install homepage-content` + its `templates/modules/homepage-content/INSTALL.md` steps) so there are hero/sections to rewrite.
  - **Blog phase** requires `blog` — same pattern.
  - **Dashboard phases**: offer `dashboard-sample` as a starting point, or build on the blank page.
  - **If the product has paid plans** (from the elicitation answers): offer `pricing`.
  Use AskUserQuestion before installing anything: "Module X isn't installed — install it now?"

### 0.2 Seed the product idea — PRD intake or from-scratch

Before any elicitation batches, find out whether the user has a product requirements document (PRD) to seed from, or wants to build the spec from scratch.

`AskUserQuestion`:

> "Do you already have a product requirements document (PRD) you want to start from, or are we building the spec from scratch?"

Options (single-select):

- `I'll paste my PRD here` — header: `Paste PRD`. User types/pastes the full PRD via the Other free-text field on the follow-up question.
- `My PRD is in a file — I'll give you the path` — header: `PRD file`. User provides an absolute or relative path via Other.
- `Start from scratch — ask me everything` (Recommended if no PRD exists) — header: `From scratch`.

Behavior per branch:

- **From scratch**:
  - If `$ARGUMENTS` is non-empty, echo it back as the seed (e.g., "Starting from your pitch: `<pitch>`. Let's pin down the details.").
  - If empty, `AskUserQuestion` for a one-line elevator pitch via the Other field:
    > "Give me a one-line description of what you want to build (the product name and what it does, for whom)."
  - Set `<PRD_PROVIDED> = false`. Subsequent batches run normally (Batches A–E) with the seed pitch biasing the option labels you propose.

- **Paste PRD**:
  - `AskUserQuestion` with a single question whose only "real" option is `I'll paste it below`; the user types the full PRD into the Other free-text field. (Other supports multi-line text.)
  - If the pasted content is suspiciously short (< 30 words), confirm with the user that's the full PRD or whether they meant to paste more.

- **PRD file**:
  - Collect the path via Other; normalize:
    ```bash
    RAW="<user-provided path>"
    EXPANDED="${RAW/#\~/$HOME}"
    PRD_FILE="$(cd "$(dirname -- "$EXPANDED")" 2>/dev/null && pwd -P)/$(basename -- "$EXPANDED")"
    [ -z "$PRD_FILE" ] && PRD_FILE="$EXPANDED"
    test -f "$PRD_FILE" -a -r "$PRD_FILE" && echo READABLE || echo UNREADABLE
    ```
  - If unreadable, `AskUserQuestion` whether to retry the path, switch to paste-in mode, or cancel.
  - Once readable, `Read` the file and treat its contents as the PRD.

For **Paste PRD** and **PRD file**, after the PRD content is in hand:

1. Parse it. Extract whatever maps onto Batches A–E:
   - Batch A: product name, audience type, industry, stage
   - Batch B: primary data entity, auth model, payments, external integrations
   - Batch C: hero copy direction, public pages, hero CTA
   - Batch D: visual style, brand palette, backend hint for hero banner (rarely covered by PRDs — flag as a gap)
   - Batch E: backend pages list, each page's visibility / primary action / per-row authorization
2. Set `<PRD_PROVIDED> = true` and persist the extracted draft answers per batch.
3. Write back a structured summary of what you extracted — keep it ~10 bullet points max, in this shape:

   > **From your PRD I extracted:**
   > - **Product**: `<name>` — `<one-line pitch>`
   > - **Audience**: `<...>` in `<industry>` (stage: `<...>`)
   > - **Primary entity**: `<...>`
   > - **Auth model**: `<...>`
   > - **Payments**: `<...>`
   > - **Integrations**: `<...>`
   > - **Public pages mentioned**: `<...>`
   > - **Backend pages mentioned**: `<...>`
   > - **Branding / hero hints**: `<... or "not covered, will ask in Batch D">`
   > - **Gaps I'll need to fill**: `<short list of what the PRD did NOT cover>`
   >
   > Sound right? I'll only ask you about the gaps in the next step — anything I extracted I'll let you confirm in one batch.

4. `AskUserQuestion`:
   - `Looks accurate — proceed to fill the gaps`
   - `I have corrections to your extraction` (collect via Other, revise the draft, re-confirm)
   - `Cancel`

Only on `Looks accurate` proceed to 0.3.

### Adaptation rule for Batches A–E when a PRD was provided

If `<PRD_PROVIDED>` is true, **do NOT re-ask from scratch** what the PRD already answered. For each batch's questions:

- **Fully answered by PRD**: in the `AskUserQuestion` call, present the PRD's answer as the first option labeled `Confirm: <PRD extracted answer> (Recommended)`. Add a `Refine — different answer` option (the user uses Other to provide the correction). Skip the rest of that question's option list.
- **Partially answered**: pre-fill the options that the PRD covered as `Recommended`, and ask only the missing dimensions.
- **Not covered**: ask the batch question as written in this document (the default option list).
- **Always still run Batch D (0.6 Branding & hero banner)** — PRDs almost never cover visual style, palette, or hero composition. Ask the full batch.

The goal: the user confirms what's already in their PRD with one or two clicks per batch, and only types new content for the gaps. Do not waste their time re-eliciting things they already wrote down.

### 0.3 Elicit product fundamentals (Batch A — 4 questions)

`AskUserQuestion` with all four together so the user fills out the page once:

1. **Product name** — header: `Name`, multiSelect: false. Options:
   - `<seed-derived suggestion>` (e.g., the name from the seed pitch, if extractable)
   - `Same as project directory: <basename "$PWD">`
   - `I'll enter a different name` — the user uses "Other" to type a name
2. **Audience type** — header: `Audience`, multiSelect: false. Options:
   - `B2B SaaS — teams within a company`
   - `B2C consumer — individual end users`
   - `Internal tool — used by one organization`
   - `Two-sided marketplace`
3. **Industry / domain** — header: `Industry`, multiSelect: false. Options:
   - `Software / dev tools`
   - `Healthcare / life sciences`
   - `Finance / fintech`
   - `Other` — user types via Other
4. **Stage of product** — header: `Stage`, multiSelect: false. Options:
   - `Idea — first version, no users yet`
   - `Replacing a manual / spreadsheet workflow`
   - `Replacing a legacy tool` (if so, suggest `/port-old-site` instead — but proceed if they confirm net-new)
   - `Internal pilot already running, this is the productized version`

Persist every answer in working memory. If any answer requires clarification (e.g., the user picked Other on industry but typed something vague), ask one targeted follow-up before continuing.

### 0.4 Elicit feature surface (Batch B — 4 questions)

`AskUserQuestion`:

1. **Primary data entity** — the noun that authenticated users mostly work with. Header: `Primary entity`. Options:
   - Three context-relevant suggestions derived from Batch A (e.g., for "team todo app": `Tasks`, `Projects`, `Workspaces`)
   - `Other` for free text
   This entity is what the dashboard's data table and section cards will be reshaped around in Phase 3.
2. **Auth model** — header: `Auth model`. Options:
   - `Single user only — no teams, each account is independent`
   - `Single org per account — admin + members`
   - `Multi-org / workspace — users can belong to multiple orgs (e.g., Slack-style)`
   - `Public + authenticated mix — some pages anonymous, some behind auth`
3. **Payments** — header: `Payments`. Options:
   - `Yes — Clerk Billing subscription plans (Recommended)` — turns on Stripe via Clerk; later phases wire pricing
   - `Yes — one-time payments only`
   - `No — free product or payments later`
4. **External integrations needed at launch** — header: `Integrations`, multiSelect: **true**. Options:
   - `Email sending (transactional)`
   - `LLM / AI calls (OpenAI, Anthropic, etc.)`
   - `File uploads (Vercel Blob / Convex storage)`
   - `Webhooks in (third-party → us)` — user notes which provider via Other

For each "Yes" integration, note it in the plan's Phase 4+ section as a separate page/feature that will need its own security review (rate limiting, secret handling, validation).

### 0.5 Elicit public surface (Batch C — 3 questions)

These determine the homepage and public pages.

1. **Hero copy direction** — header: `Hero copy`. Options:
   - `Use my pitch as the headline` — the seed pitch becomes the homepage hero headline + a subhead you write from the rest of Batch A
   - `Write a stronger headline from my product description` — you draft 2-3 candidate headlines and `AskUserQuestion` for the pick
   - `I'll write the hero copy myself` — user provides via Other
2. **Public pages besides homepage** — header: `Public pages`, multiSelect: **true**. Options:
   - `Pricing` (auto-suggested if Batch B payments=yes)
   - `Blog (10 SEO posts)`
   - `About / company`
   - `FAQ`
   - `Contact form`
   - `Documentation (separate from blog)`
3. **CTA destination from hero** — header: `Hero CTA`. Options:
   - `Sign up (Clerk modal)`
   - `Pricing page` (if pricing selected above)
   - `Book a demo (mailto: link)`
   - `Other` (user provides via Other)

### 0.6 Elicit branding & hero banner (Batch D — 3 questions)

The hero banner is the single image we generate fresh (everything else is reused from this repo's defaults or generated per Phase 2 blog flow). To get a usable image on the first try, capture:

1. **Visual style for the hero banner** — header: `Hero style`. Options:
   - `Modern flat / dashboard mockup` (Recommended for SaaS) — projects a clean UI with KPI cards, charts, tables
   - `Photographic / lifestyle` — real-world imagery suggesting the use case (e.g., engineers at desks, a doctor at a screen)
   - `Abstract / geometric` — colors and shapes, no literal UI
   - `Illustrated / branded character` — custom illustration in a defined style
2. **Brand palette** — header: `Palette`. Options:
   - `Match Tailwind defaults (neutral + a single accent)` — minimal style commitment, easiest to iterate
   - `Vibrant / bold` (e.g., teal + magenta, primary + electric accent)
   - `Calm / professional` (navy + slate, muted accents)
   - `I have specific colors` — user provides hex codes via Other
3. **What the hero should suggest about the backend** — header: `Backend hint`. Options:
   - `Data dashboard (KPI cards + chart + table)` (Recommended for B2B SaaS)
   - `Workflow / pipeline view` (cards moving through stages, kanban-like)
   - `Map / geospatial`
   - `Other` (user provides via Other)

Store the answers — Phase 1 uses them verbatim to build the image-generation prompt.

### 0.7 Elicit backend pages (Batch E — open-ended)

This is the most important part — every distinct authenticated page becomes its own Phase 4+ entry. The dashboard home itself is covered by Phase 3 (relevance), so what we're listing here are the **feature pages** that live under `app/dashboard/<slug>/`.

Present the suggested pages derived from Batches A–B as a multi-select, then collect any pages the user wants beyond the suggestions:

1. **Suggested backend pages** — header: `Backend pages`, multiSelect: **true**. Build the options from what Batch A–B implied. Examples for a team todo app:
   - `<Primary-entity> list & detail (CRUD)` — e.g., "Tasks list & detail"
   - `Members / invite (org admin)` — if auth model has orgs
   - `Settings (account + org)` — always recommended
   - `Billing (subscription mgmt)` — if payments=yes (links to Clerk's hosted UI)
   - `Reports / analytics (read-only)` — if Batch A audience is B2B
   - `Integrations (connect <integration>)` — one option per integration from Batch B Q4
   - `Audit log (admin)` — if Batch B auth model includes admin

   Always end the list with an `Other` option so the user can name additional pages via the Other free-text field. Allow multiSelect.

2. **For each selected page**, ask a tight follow-up (loop one question at a time so the user isn't overwhelmed) — header: `<page> details`. Use targeted options:
   - **Visibility** — `Members only` / `Admins only` / `Public, read-only`
   - **Primary action** — `Create + read + update + delete` / `Read-only` / `Create only (one-shot)`
   - **Per-row authorization** — `Anyone in org can see all rows` / `Each user only sees their own rows` / `Custom rules (describe via Other)`

   Persist each page's answers in the plan as a Phase 4+ section.

### 0.8 Synthesize and confirm

Now write back a structured summary of *everything* you captured in Batches A–E. This is the user's chance to catch anything wrong before you write the plan file. Use this exact shape:

> **Here's what I'll build:**
>
> **Product:** `<name>` — `<one-line pitch from 0.2>`
> **Audience:** `<from A.2>` in `<from A.3>` (stage: `<from A.4>`)
>
> **Auth model:** `<from B.2>`
> **Primary entity:** `<from B.1>`
> **Payments:** `<from B.3>`
> **Integrations:** `<from B.4>`
>
> **Public pages:** Homepage + `<list from C.2>`
> **Hero copy:** `<from C.1, with a 1-line draft if I'm writing it>`
> **Hero CTA:** `<from C.3>`
>
> **Hero banner image plan:**
> Style: `<from D.1>` · Palette: `<from D.2>` · Backend hint: `<from D.3>`
> Generated 16:9 via `scripts/generate-image.js` in Phase 1.
>
> **Backend pages (one phase each):**
> 1. `<page>` — `<visibility>` · `<primary action>` · `<authorization>`
> 2. `<page>` — `<visibility>` · `<primary action>` · `<authorization>`
> 3. ... (one line per page)
>
> Does this match what you want to build? Anything to correct?

Then `AskUserQuestion`:

Options:
- `Looks correct, draft the plan`
- `I have corrections` — collect via Other, revise the summary in place, re-confirm. Loop until correct.
- `Cancel`

### 0.9 Draft the phase plan and write it to `docs/BUILD-PLAN.md`

Build the plan tailored to the confirmed summary. Each backend page from 0.7 becomes its own Phase 4+ entry. Write the file using the structure below, with **every actionable task as a `- [ ]` checkbox**, so the user can see at a glance what is queued and you can check items off as you finish them.

Plan-doc skeleton (write this verbatim, filling in the placeholders):

```markdown
# Build plan: <Product name>

- **Product:** `<name>` — `<one-line pitch>`
- **Audience:** `<B2B SaaS | B2C | Internal | Marketplace>` in `<industry>`
- **Stage:** `<from 0.3 A.4>`
- **Auth model:** `<from 0.4 B.2>`
- **Primary entity:** `<from 0.4 B.1>`
- **Payments:** `<yes/no, mode>`
- **Integrations:** `<list>`
- **Repo path:** `<absolute path of this repo>`
- **Env mode:** `<DOPPLER | LEGACY>`
- **PRD source:** `<pasted | <absolute-file-path> | n/a (built from scratch)>`
- **Created:** `<YYYY-MM-DD>`
- **Status:** `Awaiting plan approval`
- **Current phase:** `Phase 0 — pending approval`

## Product summary (confirmed by user in Phase 0.8)

<the synthesized summary the user accepted, verbatim>

## Hero banner plan

- Style: `<from D.1>`
- Palette: `<from D.2>` (specific hex codes if the user provided them)
- Backend hint: `<from D.3>`
- Prompt: `<the exact generate-image.js prompt that will be used in Phase 1.4>`
- Output: `public/landing/hero.jpg` (16:9)

## Phase 1 — Homepage
- [ ] Branch `feat/build-1-homepage` cut from latest main
- [ ] `NEXT_PUBLIC_SITE_NAME` updated to product name (Doppler `dev` config in Doppler mode, `.env.local` in legacy mode; also push to Vercel envs if already deployed)
- [ ] `app/layout.tsx` `metadata.title` set to product name (overrides the `process.env.NEXT_PUBLIC_SITE_NAME || "More Secure Starter"` fallback)
- [ ] `app/layout.tsx` `metadata.description` set to the product's one-line pitch (the template currently mis-uses SITE_NAME as the description — replace with a real description string)
- [ ] OG tags (`openGraph.title`, `openGraph.description`, `openGraph.images`) updated to match
- [ ] Boilerplate references purged: `app/(landing)/hero-section.tsx` no longer reads `Build Secure Applications with <SITE_NAME>` — replaced with the Phase 0.5 C.1 hero copy
- [ ] `app/feed.xml/route.ts`, `app/(landing)/footer.tsx`, `app/(landing)/header.tsx`, `app/dashboard/app-sidebar.tsx` verified to render the new product name via `NEXT_PUBLIC_SITE_NAME`
- [ ] Hero headline + subhead written (per `<from C.1>`)
- [ ] **Hero banner generated** via `scripts/generate-image.js` using the prompt above
- [ ] Hero banner wired into the hero component (`public/landing/hero.jpg`)
- [ ] Feature sections drafted from product capabilities (one per primary feature)
- [ ] FAQ section drafted (if FAQ in C.2) or removed
- [ ] Testimonials section: either removed or clearly marked as placeholder
- [ ] CTAs point to existing routes (or `#` with PR note if route lands in a later phase)
- [ ] No external image domains added without explicit user approval
- [ ] No external scripts added without `security-headers` + `dependency-security` review
- [ ] `npx tsc --noEmit` green
- [ ] User accepted: <pending>

## Phase 2 — Blog (only if "Blog" was selected in C.2; otherwise skip)
- [ ] Branch `feat/build-2-blog` cut from latest main
- [ ] Removed placeholder posts in `content/blog/`:
  - [ ] `getting-started-with-secure-vibe-coding.mdx`
  - [ ] `llm-seo-optimization-guide.mdx`
  - [ ] `security-best-practices-for-saas.mdx`
- [ ] Removed orphaned banner images under `public/blog/images/`
- [ ] User approved 10-topic list (derived from the product's domain, not generic)
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
- [ ] Branch `feat/build-3-dashboard` cut from latest main
- [ ] `section-cards.tsx` metric labels/icons updated to match `<primary entity>`
- [ ] `chart-area-interactive.tsx` axis/series labels updated
- [ ] `data.json` rows reshaped to `<primary entity>` schema
- [ ] `data-table.tsx` columns reshaped to new schema
- [ ] Security dashboard untouched (verified)
- [ ] `convex/schema.ts` untouched (verified)
- [ ] `npx tsc --noEmit` green
- [ ] User accepted: <pending>

## Phase 4+ — Backend pages
<one subsection per backend page from 0.7; each with checkboxes for branch, schema additions, queries/mutations, page UI, validation, rate limiting, CSRF (if applicable), error handling, security logging, tests, user accept>

## Deviations log
<every time the user approves an insecure-by-default choice, append a row: date, what, why, mitigation>

## Notes for resume
<short pointer to the next unchecked item, kept updated at end of every phase>
```

After writing the file, summarize the plan inline in chat (top-level phases + total task count) and `AskUserQuestion`:

> "I've written the full build plan to `docs/BUILD-PLAN.md`. Please review it. Approve to start Phase 1, request changes, or cancel."

Options: `Approve and start Phase 1` / `I want changes to the plan` / `Cancel`.

- If `I want changes to the plan`: collect the user's edits via "Other", apply them by editing `docs/BUILD-PLAN.md` (Edit tool, do not rewrite the file), then re-confirm. Loop until approved.
- If `Cancel`: stop and leave the plan file in place so they can resume later.
- Only on `Approve and start Phase 1` do you proceed to Phase 1 work. Update the plan's `Status:` to `Phase 1 in progress` and `Current phase:` to `Phase 1 — Homepage` before doing anything else.

---

## Phase completion protocol (apply to every phase, 1 through N)

This protocol is mandatory. Do **not** skip steps and do **not** start the next phase without it.

1. **Open the phase**: read `docs/BUILD-PLAN.md`, find the next phase whose tasks aren't all checked, update `Status:` and `Current phase:` to reflect that phase is in progress, list the open `- [ ]` items in chat.
2. **Execute one task at a time**: after each task completes, update its checkbox to `- [x] <task> (<YYYY-MM-DD>)` in `docs/BUILD-PLAN.md` using the Edit tool. Do not batch checkbox updates — flip them as you go so a session restart sees accurate progress.
3. **Phase build/verify**: run `npx tsc --noEmit` (and `npx convex dev --once --typecheck=enable` for Convex changes). Fix anything red before moving on. Check the corresponding plan items.
4. **User test gate**: at the end of every phase, before opening the PR, `AskUserQuestion`:

   > "Phase `<N>` (`<name>`) is implemented and typechecks clean. Please test it locally (homepage in browser / blog index / dashboard / etc.) and tell me whether it's accepted."

   Options:
   - `Accepted, proceed to PR and next phase`
   - `Needs changes — I have feedback`
   - `Pause here, I'll come back later`

   - On `Accepted`: flip the phase's `User accepted: <pending>` line to `User accepted: <YYYY-MM-DD>`, run `/commit` then `/create-pull-request`, then continue to the next phase by re-entering this protocol at step 1.
   - On `Needs changes`: take the feedback (free text via "Other"), apply edits, re-run typecheck, re-ask the test gate. Do NOT mark the phase accepted.
   - On `Pause`: update `Status:` in the plan to `Paused at end of Phase <N>` and `Notes for resume` to point at the first unchecked item of Phase `<N+1>`. Stop the command. The user will re-run `/create-new-site` later — the resume check at the top of this command will find the plan and pick up where they left off.
5. **Never proceed to phase `N+1` without an explicit "Accepted" answer for phase `N`.**

---

## Phase 1 — Homepage build

Goal: build the new repo's landing page so that it accurately represents the product captured in Phase 0. Everything on the page is written or generated from the Phase 0 elicitation answers — no placeholders left behind.

### 1.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/build-1-homepage
```

### 1.2 Files in scope

- **Site name (env var)** — `NEXT_PUBLIC_SITE_NAME`. Set during `/install`, used in 6+ places. Update first via the env layer:
  - **Doppler mode**: `doppler secrets set NEXT_PUBLIC_SITE_NAME=<product-name> --config dev`. If the app is already deployed, also push to Vercel envs (the prebuild fetches at build time so the new name lands on next deploy).
  - **Legacy mode**: edit the `NEXT_PUBLIC_SITE_NAME=` line in `.env.local`.
  - Restart the dev server (user does this — you do not start it) so Next.js inlines the new value.
- `app/layout.tsx` — set `metadata.title` and `metadata.description` to literals derived from Phase 0. The template currently has `description: process.env.NEXT_PUBLIC_SITE_NAME || "..."` — that's a bug (description ≠ name). Replace with the actual pitch. Also update `openGraph.title`, `openGraph.description`, and `openGraph.images` (point at `public/landing/hero.jpg` once generated).
- `app/(landing)/page.tsx` and every component it imports from `app/(landing)/` (hero, features, testimonials, FAQs, CTA, footer text, etc.).
- `app/(landing)/hero-section.tsx` — the boilerplate reads `Build Secure Applications with {NEXT_PUBLIC_SITE_NAME}`. Replace the entire headline with the Phase 0.5 C.1 hero copy. The "Build Secure Applications with X" prefix must go for a real product.
- `app/(landing)/header.tsx`, `app/(landing)/footer.tsx`, `app/dashboard/app-sidebar.tsx`, `app/feed.xml/route.ts` — these read `NEXT_PUBLIC_SITE_NAME` and will pick up the new name automatically once the env var is updated and the app is rebuilt. Verify visually after restart — do not edit them unless something is hardcoded.
- Hero image: freshly generated via `scripts/generate-image.js` (see 1.3). Save to `public/landing/hero.jpg` and import from the hero component.
- Feature illustrations: reuse whatever this repo's landing template already ships with, or replace with generated illustrations only on explicit user approval (do not silently generate extra images — Phase 1 generates exactly one hero image).

### 1.3 Hero banner — generate from the Phase 0.6 prompt

Use the exact prompt persisted in `docs/BUILD-PLAN.md` under "Hero banner plan". Prompt template (fill from the plan):

```bash
# Doppler mode
doppler run -- node scripts/generate-image.js "<product-name> <style from D.1> — <backend hint from D.3>, <palette from D.2>, 16:9, no text in image, clean modern composition" "public/landing/hero.jpg" --aspect-ratio 16:9
# Legacy mode
node scripts/generate-image.js "<...same prompt...>" "public/landing/hero.jpg" --aspect-ratio 16:9
```

If the script reports `GEMINI_API_KEY is not set`, follow the missing-key flow documented in `.claude/commands/create-blog.md` (offer "I'll add it" or "I'll paste it here, you handle it" — never echo the key back in chat).

After generation completes, show the user the saved path (`public/landing/hero.jpg`) and `AskUserQuestion`:

- `Looks good — wire it in`
- `Regenerate with a tweak` — collect the tweak via Other, append to the prompt, retry
- `Skip and use a placeholder for now` — wire a neutral placeholder; flag for follow-up in `Notes for resume`

### 1.4 Copy & section content — generated from Phase 0

- **Hero headline + subhead**: follow the choice from Phase 0.5 C.1.
  - If `Use my pitch as the headline`: the headline IS the pitch; you write a subhead from Batch A (audience + value).
  - If `Write a stronger headline from my product description`: draft 2–3 candidate headlines and `AskUserQuestion` for the user's pick (single-select).
  - If `I'll write the hero copy myself`: use the text they provided verbatim.
- **Feature sections**: one per primary capability implied by Phase 0. Default to 3 feature sections. Write copy that describes what the user will be able to *do* with the product (anchor to the backend pages in Phase 4+).
- **Testimonials**: do not invent testimonials. Either remove the section entirely (Recommended) or include a clearly-marked placeholder block (`<!-- TODO: add real customer testimonials -->`).
- **FAQ**: only include if FAQ was selected in 0.5 C.2. Draft 4–6 honest Q+A pairs based on what an interested user would ask given Phase 0 — billing, security, who it's for, how to get started.
- **CTAs**: point at the destination chosen in 0.5 C.3.

### 1.5 Security checks for Phase 1

Even on a content-only homepage, watch for:
- **No raw HTML pasted in from anywhere** — if you copy copy with markup, render it as plain text. If you must render HTML, use a vetted sanitizer (see `input-validation`).
- **Image hosting**: keep images local in `public/`. Don't add new external image domains to `next.config` without explicit user approval.
- **External scripts** (analytics, chat widgets, embeds): default = don't add them. If the user requests one, route through `security-headers` (CSP) and `dependency-security` first.
- **Metadata leaks**: don't include internal URLs, staging hosts, or admin emails in `<meta>`.

### 1.6 Verify and PR

```bash
npx tsc --noEmit
```

Then ask the user (per CLAUDE.md, you do not start the dev server) to run `npm run dev:doppler` (Doppler) or `npm run dev` (legacy) and visually confirm the homepage. After they confirm, run `/commit` then `/create-pull-request`.

---

## Phase 2 — Blog content (only if "Blog" was selected in 0.5 C.2)

Goal: remove the 3 placeholder posts and replace with 10 articles relevant to the product's domain.

If "Blog" was NOT selected in Phase 0.5 C.2, skip Phase 2 entirely — leave the placeholder posts in place (they don't hurt anything) OR offer to remove them and replace the `/blog` route with a 404 (Recommended if the product won't have a blog). `AskUserQuestion` once, act, move on to Phase 3.

### 2.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/build-2-blog
```

### 2.2 Remove placeholders

The placeholders live in `content/blog/`:
- `getting-started-with-secure-vibe-coding.mdx`
- `llm-seo-optimization-guide.mdx`
- `security-best-practices-for-saas.mdx`

Delete those three files and any images they reference under `public/blog/images/` that are no longer used.

### 2.3 Propose & approve a 10-topic list

Propose 10 topics derived from the Phase 0 product summary. Strong topic angles:
- The product's core problem and how to solve it (top-of-funnel, SEO).
- The product's primary features, one per post.
- Industry / domain context that would attract the product's target users.
- Comparison / "vs." posts (only if accurate — never invent competitive claims).
- How-to guides specific to the product's use case.

Present the 10-topic list and `AskUserQuestion`:
- `Approve all 10` / `Approve with edits` (collect edits via Other) / `Reject and let me propose topics myself` (Other → user lists 10 topics).

### 2.4 Generate each post via `/create-blog`

For each approved topic, invoke the create-blog skill:

```
Skill: create-blog with arg "<topic>"
```

Each post will produce a banner image via `scripts/generate-image.js`. Do **not** regenerate or alter any post the user has already accepted; treat each blog as atomic.

### 2.5 Security checks for Phase 2

- MDX content can execute components — restrict imports in posts to the existing whitelisted MDX components (see `app/blog/components/`). Do not enable arbitrary component imports.
- Frontmatter `image:` paths must be local under `public/blog/images/`. Reject external URLs.
- If a topic touches code samples, verify samples don't include real secrets or insecure patterns (see `security-awareness/injection-vulnerabilities`).

### 2.6 Verify and PR

`npx tsc --noEmit`, ask the user to view `/blog` in dev, then `/commit` and `/create-pull-request`.

---

## Phase 3 — Dashboard relevance

Goal: keep the new repo's dashboard layout/format intact, but change *what is shown* so it is meaningful to the product's `<primary entity>`. Do **not** restructure the dashboard or change its routing/auth model in this phase.

### 3.1 Branch

```bash
git checkout main && git pull
git checkout -b feat/build-3-dashboard
```

### 3.2 Files in scope

- `app/dashboard/page.tsx` — top-level layout stays; section composition can change.
- `app/dashboard/section-cards.tsx` — card metrics: change labels, units, icons to match the product (e.g., "Active <entity>", "Open <entity>", "<entity> this week"). Use placeholder numbers and mark them clearly as such.
- `app/dashboard/chart-area-interactive.tsx` — change axis labels, series names, and legend to the product's domain. Keep the chart shape; do not wire to real data yet.
- `app/dashboard/data.json` — replace seed rows with rows whose schema matches `<primary entity>`. Keep field count similar so the existing `data-table.tsx` columns work.
- `app/dashboard/data-table.tsx` — adjust column headers and accessor keys to match the new `data.json` schema.
- `components/section-cards.tsx` icons (lucide / tabler) — pick icons that match the product domain.

### 3.3 Hard constraints for Phase 3

- **Do NOT** modify `app/dashboard/security/` or `app/dashboard/app-sidebar.tsx` admin gating logic. Security dashboard stays as-is.
- **Do NOT** change Convex schemas (`convex/schema.ts`) yet — Phase 4+ phases handle real entities.
- **Do NOT** add new API routes or Convex queries in this phase. Keep it presentational.

### 3.4 Security checks for Phase 3

- Confirm any new copy/labels do not leak admin-only terminology to non-admin users (review `app-sidebar.tsx` admin gates remain intact).
- Re-read `auth-security` to confirm the admin-vs-member split matches the auth model from Phase 0.4 B.2. If the product has roles beyond admin/member (e.g., multi-tier in a marketplace), defer that to a later phase and note it in `Deviations`.

### 3.5 Verify and PR

`npx tsc --noEmit`, user views `/dashboard`, `/commit`, `/create-pull-request`.

---

## Phase 4+ — One backend page per phase

For each backend page identified in Phase 0.7, run a dedicated phase. Order them by dependency (entities that other pages reference go first — usually `<primary entity>` list/detail before integrations or reports that read from it).

### Per-page phase template

Before starting each phase, present the page's plan (from `docs/BUILD-PLAN.md`) and `AskUserQuestion` for approval.

#### A. Branch

```bash
git checkout main && git pull
git checkout -b feat/build-<N>-<page-slug>
```

#### B. Re-read the page spec

Re-read the page's section in `docs/BUILD-PLAN.md` (visibility, primary action, per-row authorization from Phase 0.7). If anything is ambiguous now that you're about to implement, `AskUserQuestion` for a targeted clarification BEFORE writing code. Common things to clarify at this point:
- Field list for the entity (name, type, optional vs required)
- Whether mutations need optimistic UI or can wait for the server roundtrip
- Empty state copy
- Bulk actions (none vs select-many + delete vs select-many + edit)

#### C. Map to this stack

- **Routing**: a new file under `app/dashboard/<slug>/page.tsx` (or `app/dashboard/<slug>/[id]/page.tsx` for detail). For public pages, `app/<slug>/page.tsx`.
- **Server logic**: Convex queries/mutations under `convex/<entity>.ts`. Never use `fetch` to call external APIs from a client component for sensitive operations — proxy through Convex actions or a Next.js Route Handler.
- **Schema**: extend `convex/schema.ts` with the entity. Add indexes that match the page's access patterns (e.g., `by_user`, `by_org_and_status`).
- **Auth**: use `useQuery(api.users.checkIsAdmin)` and existing Clerk gates. For per-row authorization (e.g., "user can only see their own rows"), read `auth-security` — the check happens server-side in the query, not just in the UI.
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

#### F. Seed data (optional)

If the page benefits from non-empty seed data for the user to play with:
- Add a `convex/seed.ts` mutation that inserts a handful of rows owned by the calling user.
- Wire a "Load sample data" button on the empty state — never auto-seed on first load.

#### G. Verify and PR

`npx tsc --noEmit`, user verifies in dev, `/commit`, `/create-pull-request`.

---

## Cross-cutting "do this if you see it" list

- **The user asks for client-side env vars with secrets** (e.g., `NEXT_PUBLIC_*` containing API keys that should be private): refuse and explain. Move the call server-side via a Convex action or Route Handler.
- **The user asks for password-based auth instead of Clerk**: refuse — this OS is built around Clerk. Document the request and proceed with Clerk.
- **The user wants raw HTML rendering** (e.g., a "rich text" field stored as HTML): refuse verbatim rendering. Either render markdown via a vetted renderer, or use a sanitizer (see `input-validation`).
- **The user wants a long-lived background worker / cron**: map to a Convex scheduled action or a Vercel Cron, not a separate Node process.
- **The user wants file uploads**: map to Vercel Blob or Convex file storage. Default new buckets to private; only the user can flip to public after explicit confirmation. Validate file types and sizes server-side.
- **The user wants a public API for third parties to call**: this is a meaningful surface — pause and `AskUserQuestion` about auth (API keys vs OAuth), rate limiting, and observability before implementing.

---

## When you're unsure

Stop. `AskUserQuestion`. The right answer to "should I assume the user wants X?" is almost always **ask** — because the whole purpose of this command is that the user is defining the product. Guessing in Phase 1+ when you could have asked in Phase 0.7 is the most common failure mode; if you find yourself making up details mid-build, that's a signal to go back and elicit, not invent.
