---
allowed-tools: AskUserQuestion, Bash(node *deploy.mjs*), Bash(npx vercel*), Bash(npm install*), Bash(git *), Bash(gh *), Bash(ls *), Bash(node -v*), Bash(which *), Bash(basename *), Read, Write
description: Deploy to Vercel using dev keys (fully automated)
---

# /deploy-to-dev - Automated Dev Deployment

You are the dev deployment assistant for Secure Vibe Coding OS. You will deploy the app to GitHub and Vercel using the existing development keys from `/install`. This is fully automated — no user interaction required beyond prerequisite checks.

**Important context:** The user has already run `/install` and has a working local development setup. This command pushes to GitHub and deploys to Vercel using the dev Clerk and Convex instances. No Convex production deployment or deploy key is needed — the Vercel app points directly at the dev Convex backend.

## Step 0: Check for Existing Deployment

Check if `docs/DEPLOYMENT-DEV.md` exists by reading it.

If it exists, parse out the Vercel URL from the file. Then display:

```
Your app has already been deployed to: <URL>

Deployment only needs to happen once. To update your site after code changes, just push:
  git push origin main

Vercel will automatically rebuild and redeploy.
```

**AskUserQuestion**: "Would you like to re-run the full deployment anyway?"
- Options:
  - "Yes, re-deploy" — Re-run the full deployment process
  - "No, I just need to push" — Cancel and push code changes instead
- Header: "Re-deploy?"

If "No": STOP here.
If "Yes": continue to Step 1.

## Step 1: Prerequisites

Run these checks. If ANY fail, display the error with fix instructions and STOP.

1. `node -v` — require 18+
2. `ls node_modules/.package-lock.json 2>/dev/null` — if missing, run `npm install`
3. `node scripts/deploy.mjs check-tools`

Parse the check-tools result:
- If `gh` is missing: STOP. Display: "GitHub CLI is required. Install it: `brew install gh` (macOS) or see https://cli.github.com"
- If `ghAuth` is false: STOP. Display: "GitHub CLI is not authenticated. Run `gh auth login` in your terminal, then re-run `/deploy-to-dev`."
- If `vercel` tool check fails, that's OK — npx will handle it.

4. **If Doppler mode is active** (`.doppler.yaml` exists in repo root):
   - Run `doppler me --json` to verify the developer is logged in. If not: STOP. Display: "Doppler login required. Run `doppler login`, then re-run `/deploy-to-dev`."
   - Run `doppler secrets --project $(node -p "require('./package.json').name") --config dev --only-names` to confirm the `dev` config has secrets. If empty: STOP. Display: "Doppler dev config is empty. Run `/install` to seed it."
   - Skip the `.env.local` placeholder check below — values come from Doppler, not `.env.local`.

   **If legacy mode** (no `.doppler.yaml`): read `.env.local` and verify these keys exist and are not placeholders:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_SITE_NAME`
   - `CSRF_SECRET`
   - `SESSION_SECRET`

   If any are missing or contain `your_` or `<` or are empty: STOP. Display: "Required environment variables are missing. Run `/install` first."

Show checkmarks for all passed checks.

## Step 1.5: Confirm GitHub account, workflow scope, and target owner

The repo created in Step 2 must land where you intend (your personal account or
a specific org). Without an explicit owner, `gh repo create` defaults to the
authenticated user's account — which has historically caused org-targeted
deploys to land personally. This step locks in: the right account, the
`workflow` scope (required to push `.github/workflows/*`), and the target owner.

1. Run: `node scripts/deploy.mjs gh-context`

2. Parse JSON: `{ ghInstalled, ghAuthenticated, username, scopes, hasWorkflowScope, orgs }`.

3. **If `ghAuthenticated: false`:** **YOU (the assistant) run** the gh
   device-flow login via the Bash tool — do NOT hand it off as
   `! gh auth login ...` for the user to type. gh prints a one-time code and
   URL, the command waits while the user approves in their browser, and exits
   on its own once approval lands:

   ```bash
   gh auth login -h github.com -s workflow,repo,read:org
   ```

   After it exits successfully, re-run `node scripts/deploy.mjs gh-context`
   and continue Step 1.5 from step 4. If it fails or the user denies, STOP and
   explain.

4. **Confirm the username.** Display: "GitHub account: `<username>`".
   AskUserQuestion (Header: "GitHub account"):
   - "Yes, use `<username>`"
   - "Switch account"

   If "Switch account" → STOP. Display: "Switch via `! gh auth switch`
   (multi-account) or `! gh auth login` (add another), then re-run
   `/deploy-to-dev`."

5. **Confirm the `workflow` scope.**
   - If `hasWorkflowScope: true`: show checkmark, continue.
   - If `hasWorkflowScope: false`: AskUserQuestion (Header: "Add workflow scope?"):
     - "Yes, add it now"
     - "No, abort and I'll do it later"

     If "Yes": **YOU (the assistant) run** the gh device-flow command via the
     Bash tool — do NOT hand it off as `! gh auth refresh ...` for the user to
     type. gh will print a one-time code and a URL; the command then waits
     while the user approves in their browser, and exits on its own once
     approval lands:

     ```bash
     gh auth refresh -h github.com -s workflow
     ```

     The user sees the device code + URL in the output, opens
     https://github.com/login/device, enters the code, approves the added
     scope, and control returns to the script automatically.

     After the command exits successfully, re-run
     `node scripts/deploy.mjs gh-context` and confirm `hasWorkflowScope` is now
     true. If still false (e.g. user denied), STOP and explain.

     If "No": STOP. Display: "The `workflow` scope is required to push
     `.github/workflows/*`. Re-run `/deploy-to-dev` to add it."

6. **Pick the target owner.**
   - If `orgs` is empty: set `<OWNER>` = `<username>`. Show checkmark:
     "Target owner: `<username>` (personal — no orgs found on this account)".
   - If `orgs.length >= 1`: build AskUserQuestion options listing the **first
     org as the default/recommended choice**, plus a personal-account option,
     plus the next 1–2 orgs if present (max 4 options total):
     - "Use org: `<orgs[0]>` (recommended)"  ← keep first; this is the default
     - "Use personal account (`<username>`)"
     - "Use org: `<orgs[1]>`" (only if `orgs.length >= 2`)
     - "Use org: `<orgs[2]>`" (only if `orgs.length >= 3`)

     (Header: "Target owner"). Set `<OWNER>` based on the choice.

7. **Carry `<OWNER>` through.** Display:
   "Target owner locked: `<OWNER>`. The repo will be created as
   `<OWNER>/<repo-name>`."

## Step 2: GitHub Repository

Check the `isUpstreamTemplate` and `gitRemote` values from check-tools.

**If `isUpstreamTemplate: true` or no remote:**
- Derive repo name from directory basename: `basename "$PWD"`
- Run: `node scripts/deploy.mjs github-setup --repo-name="<BASENAME>" --owner="<OWNER>"`
  (where `<OWNER>` is the value locked in Step 1.5 — always pass it, even for
  personal accounts; it makes the intent explicit and triggers the post-create
  verification inside the script.)
- Parse result:
  - If success: show repo URL with checkmark
  - If `error: "repo_exists"`: try with a suffix:
    `node scripts/deploy.mjs github-setup --repo-name="<BASENAME>-app" --owner="<OWNER>"`
  - If `error: "owner_mismatch"`: STOP. Display the `hint` field verbatim — it
    includes the exact `gh repo delete` or `gh repo transfer` commands to fix
    the misplaced repo. Do NOT proceed past this step until the remote points
    at `<OWNER>`.
  - If still fails: STOP with error

**If origin is already a non-template repo:**
- Show checkmark: "GitHub repo already configured"
- Ensure code is pushed: `git push origin main`

## Step 2.5: Verify the repo landed under `<OWNER>`

Defense in depth — re-confirm the remote AFTER `github-setup` (which already
checks internally). Catches the case where origin was changed between steps,
or where this step ran via the "origin already non-template" branch above.

1. Run: `git remote get-url origin`
2. Extract the owner segment from the URL (everything between `github.com[:/]`
   and the next `/`). Lowercase for comparison.
3. **If it matches `<OWNER>` (case-insensitive):** show checkmark:
   "Verified: origin is under `<OWNER>`."
4. **If it does NOT match:** STOP. Display:
   "Origin is `<actual-owner>/<repo>`, but Step 1.5 selected `<OWNER>`. This is
   the bug we're guarding against — do NOT proceed. Fix one of these ways,
   then re-run `/deploy-to-dev`:
   - Delete the misplaced repo: `gh repo delete <actual-owner>/<repo> --yes`
   - Transfer it: `gh repo transfer <actual-owner>/<repo> <OWNER>`
   - Or update the remote manually: `git remote set-url origin <correct-url>`"

## Step 3: Ensure vercel.json is correct for the active mode

The `vercel.json` MUST include `"framework": "nextjs"` — without this, `vercel project add` via CLI defaults the framework to "Other", which causes Edge Function errors with Clerk middleware.

Check if `vercel.json` exists by reading it.

**Doppler mode** (`.doppler.yaml` exists): write `vercel.json` with the prebuild chain so the build machine fetches secrets from Doppler before `next build` inlines `NEXT_PUBLIC_*`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "node scripts/vercel-prebuild.mjs && npm run build"
}
```

**Legacy mode** (no `.doppler.yaml`): write `vercel.json` with framework only (uses default `npm run build`):
```json
{
  "framework": "nextjs"
}
```

If `vercel.json` already contains `convex deploy`, it's from a previous production deploy — overwrite with the appropriate version above.

## Step 4: Commit and Push

Run `git status` to check for uncommitted changes.

If there are changes:
- Run: `git add -A && git commit -m "Prepare for Vercel deployment" && git push origin main`

If clean:
- Show checkmark: "Code is up to date"

## Step 5: Vercel Link + Git Connect

Derive the Vercel project name from the GitHub repo name (NOT the directory name):
1. Parse the repo name from the origin remote URL: `git remote get-url origin` → extract the repo basename (e.g., `harperaa/test2` → `test2`)
2. Run: `npx vercel project add <REPO_NAME> 2>&1 || true` (creates the project on Vercel with the correct name; ignore errors if it already exists)
3. Run: `npx vercel link --yes --project=<REPO_NAME>`

If this fails (auth error):
- STOP. Display: "Vercel CLI is not authenticated. Run `npx vercel login` in your terminal, then re-run `/deploy-to-dev`."

Show checkmark: "Vercel project linked (<REPO_NAME>)"

4. Connect the GitHub repo for automatic deployments on push:
   Run: `npx vercel git connect --yes`
   - This enables Vercel to auto-rebuild and redeploy when you `git push origin main`
   - Without this step, only manual CLI deploys (`npx vercel deploy`) would work

If this fails, show warning but continue (the initial CLI deploy in Step 7 will still work):
"Warning: Could not auto-connect GitHub repo. You can connect it manually in Vercel Dashboard → Settings → Git."

Show checkmark: "GitHub repo connected for auto-deploy"

## Step 6: Set Vercel Environment Variables

Run: `node scripts/deploy.mjs vercel-env-dev`

**In legacy mode**, this reads ALL values from `.env.local` and sets them on Vercel.

**In Doppler mode**, this auto-delegates to `vercel-env-doppler`: it issues a fresh `dev`-scoped Doppler service token and pushes `DOPPLER_TOKEN` to **all three** Vercel environment targets (development, preview, and production), all with the same dev-scoped token. This is intentional: the deploy step uses `vercel deploy --prod` to keep the project's primary alias URL stable, so the build runs against Vercel's `production` target — and that target needs the dev token for the prebuild fetch to succeed. `/deploy-to-prod` later overwrites the production target with a `prd`-scoped token. The command also generates `REVALIDATE_TOKEN` in Doppler if absent and runs `scripts/sync-convex-env.mjs --config dev`. App values (Clerk keys, NEXT_PUBLIC_*, etc.) are fetched at build time by `scripts/vercel-prebuild.mjs` and at runtime by `lib/secrets.ts` — they never sit in Vercel's env store.

Parse JSON output:
- Show each variable set with checkmark — expect three `DOPPLER_TOKEN` entries (one per Vercel target) in `varsSet`
- If `mode: "doppler"`, confirm only `DOPPLER_TOKEN` (no app values) is in `varsSet`
- **If `error: "production_already_promoted"`**: STOP. Display the `message` and `hint` fields verbatim — `/deploy-to-prod` has been run for this Vercel project, and proceeding would replace the prd-scoped DOPPLER_TOKEN on the production target with a dev-scoped one (real users would start seeing a dev build). Recommend the user instead push a feature branch (preview deploys are dev-scoped automatically and don't conflict), or set up a separate Vercel project for ongoing dev work. Do NOT auto-pass `--force-overwrite-prod=true` — that's a manual operator decision.
- If any other failure, show the error

## Step 7: Deploy

Run: `node scripts/deploy.mjs vercel-deploy`

Parse JSON output:
- The result contains `url` (deployment-specific URL), `productionUrl` (short alias like `site.vercel.app`), and `dashboardUrl` (Vercel deployments dashboard)
- **Use `productionUrl` for display** if available, fall back to `url`
- Show the deployment URL and dashboard URL with checkmarks
- If deploy fails, show error

## Step 8: Write Summary

Run: `node scripts/deploy.mjs write-summary --deploy-type="dev" --vercel-url="<PRODUCTION_URL or URL>" --dashboard-url="<DASHBOARD_URL>" --repo-url="<REPO_URL>" --convex-prod-url="<CONVEX_URL>" --convex-site-url="<CONVEX_SITE_URL>" --frontend-api-url="<FRONTEND_URL>" --site-name="<NAME>" --admin-email="" --google-oauth="deferred" --webhook-url="" --completed-steps="GitHub repo created,Vercel project linked,Vercel env vars set,Deployed to Vercel" --skipped-steps="Clerk production (run /deploy-to-prod),Google OAuth (run /deploy-to-prod),Stripe billing (run /deploy-to-prod)"`

Use the Convex URL from .env.local (dev instance) for convex-prod-url, and derive the site URL by replacing `.convex.cloud` with `.convex.site`. For vercel-url, prefer `productionUrl` from the deploy result (the short alias). For dashboard-url, use the `dashboardUrl` from the deploy result.

**Gathering values for the summary args:**

- **Legacy mode** (`.env.local` is the source): `grep '^KEY=' .env.local | cut -d= -f2-` for each value you need.
- **Doppler mode** (`.doppler.yaml` exists): `.env.local` contains only `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` (Convex CLI writes those). Everything else (`NEXT_PUBLIC_CLERK_FRONTEND_API_URL`, `NEXT_PUBLIC_SITE_NAME`, etc.) lives in Doppler and must be fetched from there.

  Use this exact command shape — do **NOT** add `--no-interactive` (it is not a valid flag on `doppler secrets get` and the command will fail):

  ```
  doppler secrets get NEXT_PUBLIC_CLERK_FRONTEND_API_URL NEXT_PUBLIC_SITE_NAME --plain
  ```

  Project and config are already pinned by `.doppler.yaml`, so `--project`/`--config` are optional. Multiple keys can be passed in one call; values are returned line-by-line in the same order.

Display:

```
## Dev Deployment Complete!

Your app is live on Vercel using Clerk and Convex development instances.

- [x] GitHub repository created
- [x] Vercel project linked
- [x] Environment variables set (<N> variables)
- [x] Deployed to Vercel

### Your URLs
- App: <PRODUCTION_URL> (the short .vercel.app alias, not the deployment-specific URL)
- Vercel Deployments: <DASHBOARD_URL>
- GitHub: <REPO_URL>

### Deployment Summary Saved
Full record saved to: **docs/DEPLOYMENT-DEV.md**

### What to Know
- Your app uses Clerk **development** keys — there will be a small Clerk dev badge
- Your app uses the Convex **dev** instance — same database as local development
- Authentication, webhooks, and all features work normally

### Next Steps
When you're ready to go fully production (custom domain, remove dev badge, Stripe billing):
  /deploy-to-prod
```
