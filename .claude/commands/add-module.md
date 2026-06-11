---
allowed-tools: AskUserQuestion, Bash(node *modules.mjs*), Bash(node *generate-sitemap.mjs*), Bash(npm run typecheck*), Bash(npx tsc*), Read, Edit, Grep, Glob
description: Install an optional content module (homepage-content, blog, dashboard-sample, pricing)
argument-hint: "[module-name ...]"
---

# /add-module - Install Optional Content Modules

You install optional page/content modules into this Secure Vibe Coding OS site.
Modules live in `templates/modules/<name>/` and only add **pages and content** —
the secure backend (Convex, auth, rate limiting, CSRF, security monitoring) is
always installed and is never touched by this command.

## Phase 1: Status

Run:

```bash
node scripts/modules.mjs status --json
```

## Phase 2: Select Modules

**If `$ARGUMENTS` names one or more modules:**
- Validate each against the known module names from Phase 1.
- If a named module is unknown, list the valid names and stop.
- If a named module is already installed, tell the user and skip it (if nothing
  remains, report "already installed" and stop).

**If `$ARGUMENTS` is empty:**
- If `available` is empty, tell the user all modules are already installed and stop.
- Otherwise run `node scripts/modules.mjs list --json` and call AskUserQuestion
  (multiSelect: true) with one option per **not-installed** module, using its
  `title` as the label and `description` as the description.

## Phase 3: Install

For the selected modules (the script itself sorts them into the canonical order
homepage-content → blog → dashboard-sample → pricing), run a single install
**without** `--apply-edits` (you will perform the post-copy edits yourself in
Phase 4, because this repo's files may have been customized):

```bash
node scripts/modules.mjs install <name...> --json
```

**If any module reports `conflicts`** (files that already exist locally and
differ from the module's version), call AskUserQuestion listing the conflicting
paths:
- "Overwrite my files with the module versions" → re-run that module with `--force`
- "Keep my files" → continue; the module's remaining files are already copied
- "Cancel this module" → skip its post-copy steps and report it as cancelled

## Phase 4: Post-Copy Steps

For each installed module, read `templates/modules/<name>/INSTALL.md` and perform
every step with the Edit tool. These steps are written to tolerate user
customization — anchor comments (`// modules:nav`, `// modules:imports`,
`{/* modules:sections */}`, `{/* modules:footer */}`) mark the default insertion
points, but if the user has rewritten a target file, adapt: find their nav/
sections and make the equivalent edit. Never duplicate an entry that already
exists.

## Phase 5: Verify

1. Run `npm run typecheck` — fix obvious issues caused by the install, or report
   anything you can't resolve.
2. If the blog module was installed, run `node scripts/generate-sitemap.mjs` and
   confirm it picks up the blog posts.

## Phase 6: Summary

Show a table: module → files copied / overwritten, edits made, anything skipped
or cancelled. Remind the user:
- New routes (e.g. `/blog`, `/dashboard/payment-gated`) are live on next `npm run dev`.
- The pricing module shows a "coming soon" placeholder until Billing is enabled
  in the Clerk dashboard (see `templates/modules/pricing/INSTALL.md`).
