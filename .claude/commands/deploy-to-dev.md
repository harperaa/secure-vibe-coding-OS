---
allowed-tools: Bash(node *deploy.mjs*), Bash(npx vercel*), Bash(npm install*), Bash(git *), Bash(gh *), Bash(ls *), Bash(node -v*), Bash(which *), Bash(basename *), Read, Write
description: Deploy to Vercel using dev keys (fully automated)
---

# /deploy-to-dev - Automated Dev Deployment

You are the dev deployment assistant for Secure Vibe Coding OS. You will deploy the app to GitHub and Vercel using the existing development keys from `/install`. This is fully automated — no user interaction required beyond prerequisite checks.

**Important context:** The user has already run `/install` and has a working local development setup. This command pushes to GitHub and deploys to Vercel using the dev Clerk and Convex instances. No Convex production deployment or deploy key is needed — the Vercel app points directly at the dev Convex backend.

## Step 1: Prerequisites

Run these checks. If ANY fail, display the error with fix instructions and STOP.

1. `node -v` — require 18+
2. `ls node_modules/.package-lock.json 2>/dev/null` — if missing, run `npm install`
3. `node scripts/deploy.mjs check-tools`

Parse the check-tools result:
- If `gh` is missing: STOP. Display: "GitHub CLI is required. Install it: `brew install gh` (macOS) or see https://cli.github.com"
- If `ghAuth` is false: STOP. Display: "GitHub CLI is not authenticated. Run `gh auth login` in your terminal, then re-run `/deploy-to-dev`."
- If `vercel` tool check fails, that's OK — npx will handle it.

4. Read `.env.local` and verify these keys exist and are not placeholders:
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

## Step 3: Handle vercel.json

Check if `vercel.json` exists by reading it.

- If it exists and contains `convex deploy`: this is from a previous production deploy attempt. Remove `vercel.json` — for dev deployment, Vercel's default Next.js build (`npm run build`) is correct.
- If it exists without `convex deploy`: leave it alone.
- If it doesn't exist: do nothing (Vercel auto-detects Next.js).

## Step 4: Commit and Push

Run `git status` to check for uncommitted changes.

If there are changes:
- Run: `git add -A && git commit -m "Prepare for Vercel deployment" && git push origin main`

If clean:
- Show checkmark: "Code is up to date"

## Step 5: Vercel Link

Derive the Vercel project name from the GitHub repo name (NOT the directory name):
1. Parse the repo name from the origin remote URL: `git remote get-url origin` → extract the repo basename (e.g., `harperaa/test2` → `test2`)
2. Run: `npx vercel project add <REPO_NAME> 2>&1 || true` (creates the project on Vercel with the correct name; ignore errors if it already exists)
3. Run: `npx vercel link --yes --project=<REPO_NAME>`

If this fails (auth error):
- STOP. Display: "Vercel CLI is not authenticated. Run `npx vercel login` in your terminal, then re-run `/deploy-to-dev`."

Show checkmark: "Vercel project linked (<REPO_NAME>)"

## Step 6: Set Vercel Environment Variables

Run: `node scripts/deploy.mjs vercel-env-dev`

This reads ALL values from `.env.local` and sets them on Vercel. No arguments needed.

Parse JSON output:
- Show each variable set with checkmark
- If any fail, show the error

## Step 7: Deploy

Run: `node scripts/deploy.mjs vercel-deploy`

Parse JSON output:
- The result contains `url` (deployment-specific URL) and `productionUrl` (short alias like `site.vercel.app`)
- **Use `productionUrl` for display** if available, fall back to `url`
- Show the URL with checkmark
- If deploy fails, show error

## Step 8: Write Summary

Run: `node scripts/deploy.mjs write-summary --deploy-type="dev" --vercel-url="<PRODUCTION_URL or URL>" --repo-url="<REPO_URL>" --convex-prod-url="<CONVEX_URL>" --convex-site-url="<CONVEX_SITE_URL>" --frontend-api-url="<FRONTEND_URL>" --site-name="<NAME>" --admin-email="" --google-oauth="deferred" --webhook-url="" --completed-steps="GitHub repo created,Vercel project linked,Vercel env vars set,Deployed to Vercel" --skipped-steps="Clerk production (run /deploy-to-prod),Google OAuth (run /deploy-to-prod),Stripe billing (run /deploy-to-prod)"`

Use the Convex URL from .env.local (dev instance) for convex-prod-url, and derive the site URL by replacing `.convex.cloud` with `.convex.site`. For vercel-url, prefer `productionUrl` from the deploy result (the short alias).

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
