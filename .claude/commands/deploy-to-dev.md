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
   - Run `doppler secrets --project $(node -p "require('./package.json').name") --config dev --only-names --no-color` to confirm the `dev` config has secrets. If empty: STOP. Display: "Doppler dev config is empty. Run `/install` to seed it."
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

## Step 2: GitHub Repository

Check the `isUpstreamTemplate` and `gitRemote` values from check-tools.

**If `isUpstreamTemplate: true` or no remote:**
- Derive repo name from directory basename: `basename "$PWD"`
- Run: `node scripts/deploy.mjs github-setup --repo-name="<BASENAME>"`
- Parse result:
  - If success: show repo URL with checkmark
  - If `error: "repo_exists"`: try with a suffix: `node scripts/deploy.mjs github-setup --repo-name="<BASENAME>-app"`
  - If still fails: STOP with error

**If origin is already a non-template repo:**
- Show checkmark: "GitHub repo already configured"
- Ensure code is pushed: `git push origin main`

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

**In Doppler mode**, this auto-delegates to `vercel-env-doppler`: it issues a fresh `dev`-scoped Doppler service token, pushes only `DOPPLER_TOKEN` to Vercel Development env, generates `REVALIDATE_TOKEN` in Doppler if absent, and runs `scripts/sync-convex-env.mjs --config dev`. App values (Clerk keys, NEXT_PUBLIC_*, etc.) are fetched at build time by `scripts/vercel-prebuild.mjs` and at runtime by `lib/secrets.ts` — they never sit in Vercel's env store.

Parse JSON output:
- Show each variable set with checkmark
- If `mode: "doppler"`, confirm only `DOPPLER_TOKEN` is in `varsSet`
- If any fail, show the error

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
