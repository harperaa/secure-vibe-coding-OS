---
allowed-tools: AskUserQuestion, Bash(git *), Bash(npm install*), Bash(npx tsc*), Bash(npx convex dev --once*), Read, Edit, Write, Grep, Glob
description: Safely pull latest template updates and merge with your customizations
---

# /pull-repo-safe — Intelligent Template Merge

You are the template merge assistant for Secure Vibe Coding OS. You safely pull updates from the upstream template repository and intelligently merge them while preserving all user customizations.

## Modes

This command accepts an optional argument: `$ARGUMENTS`

- **Default (no argument):** full safe-merge flow (Phases 1–5).
- **`--dry-run`:** read-only preview. Reports exactly which incoming files the
  merge WOULD overwrite, merge, preserve, or add — applying the same A/B/C/D
  categorization as a real run — then STOPS. Makes NO commits, NO push, NO merge,
  NO `npm install`. Follow the "Dry-Run Flow" section below and do NOT execute
  Phases 1, 4, or 5.

A raw `git diff` lists every changed file and is category-blind, so it overstates
the impact — it shows your landing pages, dashboard, blog, and README even though
those are PRESERVED. The dry run exists to show the true, categorized impact.

## File Categorization Rules

Every changed file falls into one of four categories. Use these glob patterns to classify:

### Category A: "Accept from template" — Take the template's version
Template infrastructure the user should NOT customize.

- `.claude/commands/*.md`
- `.claude/skills/security/**`, `.claude/skills/security-awareness/**`, `.claude/skills/security-prompts/**`
- `.claude/skills/course-lesson-builder/**`, `.claude/skills/self-installer/**`
- `.claude/agents/*.md`
- `scripts/*.mjs`, `scripts/*.sh`, `scripts/*.js`
- `templates/modules/**` (the module source trees — installed copies in `app/` etc. are Category C)
- `lib/csrf.ts`, `lib/errorHandler.ts`, `lib/validateRequest.ts`, `lib/validation.ts`, `lib/prompt-validation.ts`, `lib/withCsrf.ts`, `lib/withRateLimit.ts`
- `middleware.ts`
- `hooks/use-mobile.ts`
- `components/ConvexClientProvider.tsx`, `components/theme-provider.tsx`
- `components/ui/**`
- `components/react-bits/splash-cursor.tsx`
- `app/api/**`

### Category B: "Merge carefully" — Merge both changes intelligently
Shared infrastructure the user may have extended. Keep user additions AND template updates.

- `convex/schema.ts`
- `convex/http.ts`
- `convex/*.ts` (other Convex backend files)
- `package.json`
- `app/layout.tsx`, `app/dashboard/layout.tsx`
- `CLAUDE.md`
- `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `components.json`

### Category C: "Preserve user's version" — Keep the user's customizations
Only add genuinely new content if clearly additive.

- `app/(landing)/**`
- `app/blog/**`, `app/feed.xml/**` (installed blog module — user content)
- `app/dashboard/page.tsx`
- `app/dashboard/app-sidebar.tsx`, `app/dashboard/nav-*.tsx`
- `app/dashboard/site-header.tsx`
- `app/dashboard/payment-gated/**` (installed pricing module)
- `app/dashboard/chart-area-interactive.tsx`, `app/dashboard/data-table.tsx`, `app/dashboard/section-cards.tsx`, `app/dashboard/data.json` (installed dashboard-sample module)
- `components/logo.tsx`
- `components/custom-clerk-pricing.tsx` (installed pricing module)
- `components/kokonutui/**`, `components/magicui/**`, `components/motion-primitives/**`, `components/react-bits/**` (installed homepage-content module; except `splash-cursor.tsx`, which is Category A)
- `lib/blog.ts`, `lib/mdx.ts` (installed blog module)
- `content/blog/**`
- `public/llms.txt`
- `.claude/skills/lessons/**`
- `README.md`
- `public/**` (accept NEW files, keep existing ones)

### Category D: "New files" — Accept entirely
Files in the template that do NOT exist in the user's repo. Always accept.

### One-time migration note (template ≥ 5.5)

The template moved the optional content (landing sections, blog, sample dashboard,
pricing pages) into `templates/modules/` and made the default `app/` minimal. When
merging across that change, the upstream diff will show DELETIONS of files you may
still be using (e.g. `app/blog/**`, `app/(landing)/hero-section.tsx`). Those files
are now your **installed module instances** — treat the deletions as Category C
(keep your copies; do NOT delete) and accept the new `templates/modules/**` tree as
Category A/D. Updated module versions arrive under `templates/modules/` and can be
re-applied selectively with `/add-module` if desired.

## Dry-Run Flow (ONLY when invoked with `--dry-run`)

Run ONLY these read-only steps. Do NOT commit, push, add files, run `npm install`,
or merge. Skip Phases 1–5 entirely.

1. **Ensure upstream is available (non-destructive):**
   - Run `git remote get-url upstream`. If it is missing:
     - If `origin` contains `harperaa/secure-vibe-coding-OS` → STOP with the same
       guidance as Phase 2 (origin still points at the template).
     - Otherwise run `git remote add upstream https://github.com/harperaa/secure-vibe-coding-OS.git`
       (adding a remote changes nothing in your tree).
   - Run `git fetch upstream`.

2. **List incoming changes:**
   - `git log HEAD..upstream/main --oneline` — if empty, print "Already up to date
     with template! Nothing would be pulled." and STOP.
   - `git diff HEAD...upstream/main --name-status`.

3. **Categorize every changed file** with the A/B/C/D rules above, and map each to
   the action a real run WOULD take:

   | Category | Dry-run verdict |
   |----------|-----------------|
   | A (template infrastructure) | OVERWRITTEN — template version replaces yours |
   | B (shared infrastructure)   | MERGED — your changes + template changes combined |
   | C (user customizations)     | PRESERVED — your version kept, template change ignored |
   | D (new file, absent locally)| ADDED — new file, no conflict |
   | Deleted in upstream (`D`)    | WOULD ASK — you'd be prompted whether to delete |

4. **Print the preview** — the summary table first, then a per-file list grouped by
   verdict so the user sees precisely what changes vs. what is left untouched:

   ```
   ## Dry-Run Preview — N commits incoming from template

   ### 🔴 OVERWRITTEN — template version replaces yours (N)
   - <files>

   ### 🟡 MERGED — your changes + template combined (N)
   - <files>

   ### 🟢 PRESERVED — your version kept, template change ignored (N)
   - <files>

   ### ➕ ADDED — new files (N)
   - <files>

   ### ❓ WOULD ASK — deletions / ambiguous (N)
   - <files>
   ```

5. **STOP.** Print: "Dry run only — no changes were made. Run `/pull-repo-safe`
   (no argument) to perform the merge." Do NOT continue to Phase 1.

## Phase 1: Save User's Work

> **Skip this entire phase (and Phases 2–5) when `--dry-run` was passed** — use the
> Dry-Run Flow above instead.

1. Run `git status` to check for uncommitted changes.
2. If there are uncommitted changes:
   - Display: "Saving your current work before merge..."
   - Run: `git add -A && git commit -m "Save work before template merge"`
3. Check if `origin` remote exists and is NOT the template repo (`harperaa/secure-vibe-coding-OS`):
   - If so, run: `git push origin main`
   - Show checkmark: "Your work is saved and pushed"
4. If working tree was clean, show checkmark: "Working tree is clean"

## Phase 2: Set Up and Fetch Upstream

1. Run `git remote -v` to check remotes.
2. **If no `upstream` remote exists:**
   - Check if `origin` URL contains `harperaa/secure-vibe-coding-OS`:
     - If YES → STOP. Display: "Your origin is still pointing at the template repo. Run `/deploy-to-dev` first to set up your own GitHub repository, then re-run `/pull-repo-safe`."
     - If NO → Run: `git remote add upstream https://github.com/harperaa/secure-vibe-coding-OS.git`
     - Show checkmark: "Upstream remote added"
3. **If `upstream` already exists:** Show checkmark: "Upstream remote configured"
4. Run: `git fetch upstream`
5. Show checkmark: "Fetched latest from upstream"

## Phase 3: Analyze Changes

1. Run: `git log HEAD..upstream/main --oneline`
   - If no output → Display: "Already up to date with template! No new changes." and STOP.
   - Otherwise, count commits and display: "Found N new commits from template"

2. Run: `git diff HEAD...upstream/main --name-status` to get the list of changed files.

3. Categorize each file using the rules above:
   - For each file, check Category A patterns first, then B, then C. If none match, treat as Category B (merge carefully) by default.
   - Files that are Added (status `A`) and don't exist locally → Category D.
   - Files that are Deleted (status `D`) in upstream → ask the user whether to delete.

4. Display a summary table:
   ```
   ## Template Update Summary

   **N commits** from upstream

   | Category | Action | Files |
   |----------|--------|-------|
   | A: Template infrastructure | Accept template version | N files |
   | B: Shared infrastructure | Merge carefully | N files |
   | C: User customizations | Preserve your version | N files |
   | D: New files | Accept (no conflicts) | N files |
   ```

   Then list the files in each category.

## Phase 4: User Approval + Merge

**Use AskUserQuestion** to ask the user how to proceed:
- "Merge safely (Recommended)" — proceed with intelligent conflict resolution
- "Show detailed diffs first" — show the diff for each category, then re-ask
- "Cancel" — abort, no changes made

### Execute the Merge

Run: `git merge upstream/main --no-commit --no-ff`

**If clean merge (exit code 0, no conflicts):**
- Show checkmark: "Clean merge — no conflicts"
- Proceed to Phase 5.

**If conflicts (exit code 1):**
- Run: `git diff --name-only --diff-filter=U` to get conflicted files.
- For EACH conflicted file, resolve based on its category:

  **Category A (template infrastructure):**
  - Run: `git checkout upstream/main -- <file>`
  - Run: `git add <file>`
  - Show: "Took template version: <file>"

  **Category B (merge carefully):**
  - Read the conflicted file to see both sides of the conflict.
  - Intelligently merge: keep user's additions AND template's updates.
  - For `package.json`: merge dependencies — keep all of the user's deps AND all of the template's deps. Use the higher version if both changed the same dep.
  - For `convex/schema.ts`: keep user's tables AND template's new tables.
  - For config files: preserve user settings while adding new template settings.
  - **If the merge is ambiguous**, use AskUserQuestion showing both versions and asking which approach the user prefers.
  - After resolving, write the merged content and run: `git add <file>`

  **Category C (user customizations):**
  - Run: `git checkout HEAD -- <file>`
  - Run: `git add <file>`
  - Show: "Kept your version: <file>"
  - **Exception:** If the template added a genuinely NEW section (not modifying existing user content), use AskUserQuestion to ask if user wants the new feature merged in.

  **Category D (new files):**
  - These don't conflict. If somehow they do, take the template version.
  - Run: `git checkout upstream/main -- <file>` and `git add <file>`

After all conflicts are resolved, show a summary of resolutions.

## Phase 5: Verify and Complete

1. **If `package.json` changed:** Run `npm install`
2. **Type check:** Run `npx tsc --noEmit`
3. **Convex check:** Run `npx convex dev --once --typecheck=enable 2>&1 | tail -20`
4. **If type errors are found:**
   - Attempt to fix obvious type errors (missing imports, type mismatches from merge).
   - If errors can't be auto-fixed, use AskUserQuestion:
     - "Continue anyway — I'll fix the errors manually"
     - "Abort the merge" → Run `git merge --abort` and display: "Merge aborted. Your repo is back to its pre-merge state."
5. **If all checks pass:**
   - Run: `git commit -m "Merge template updates from upstream"`
   - Show checkmark: "Merge committed"

6. Display final summary:
   ```
   ## Template Merge Complete!

   - [x] Your work saved and pushed
   - [x] Fetched N commits from upstream
   - [x] Category A: N files updated from template
   - [x] Category B: N files merged carefully
   - [x] Category C: N files preserved (your version)
   - [x] Category D: N new files added
   - [x] Type checks passed
   - [x] Merge committed

   Remember to push when ready: `git push origin main`
   ```

## Safety Rails

- **Before merge:** All user work is committed and pushed to origin.
- **During merge:** User is consulted via AskUserQuestion on any ambiguous conflict (Category B/C).
- **After merge:** Type checks verify nothing is broken.
- **Escape hatch:** `git merge --abort` is available at any point. The user's pre-merge commit is always safe to return to.
- **Never force:** Never use `--force`, `--hard`, or destructive git operations.
