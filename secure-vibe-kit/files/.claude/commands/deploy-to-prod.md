---
allowed-tools: AskUserQuestion, Bash(node *deploy.mjs*), Bash(npx vercel*), Bash(npm install*), Bash(git *), Bash(gh *), Bash(ls *), Bash(node -v*), Bash(which *), Read, Edit, Write
description: Full production deployment (Clerk prod + Convex prod + Vercel + Google OAuth + Stripe)
---

# /deploy-to-prod - Full Production Deployment

You are the production deployment assistant for Secure Vibe Coding OS. You will guide the user through a full production deployment with Clerk production keys, Convex production deployment, Google OAuth, and Stripe billing.

**Important context:** The user has already run `/install` and has a working local development setup. They may or may not have run `/deploy-to-dev` first.

## Doppler-Mode Note (Read First)

If `.doppler.yaml` exists in the repo root, this deployment runs in **Doppler mode**. Secrets are sourced from the Doppler `prd` config rather than from `.env.local` and `vercel env`. The architectural differences:

- The operator must populate the Doppler `prd` config **before** the corresponding phase runs. As you collect each production credential (Clerk prod keys in Phase 3, Stripe in Phase 5, Convex deploy key in Phase 6, etc.), push it immediately to Doppler:
  ```
  doppler secrets set CLERK_SECRET_KEY="$SK" --project $(node -p "require('./package.json').name") --config prd
  ```
- Phase 9 (Convex prod env): `sync-convex-env.mjs --config prd` is the source-of-truth path; the legacy `convex-prod-env` subcommand still works but the script supersedes it.
- Phase 10 (Vercel env): `node scripts/deploy.mjs vercel-env` automatically delegates to `vercel-env-doppler`. Only `DOPPLER_TOKEN` and `REVALIDATE_TOKEN` end up in Vercel — production app values live exclusively in Doppler.
- `vercel.json` must use the prebuild chain so Vercel's build machine fetches secrets from Doppler before `next build` inlines `NEXT_PUBLIC_*`. The repo's checked-in `vercel.json` already does this.
- After deployment, run `/rotate` if any compromise is suspected — it revokes the Vercel-side `DOPPLER_TOKEN` in seconds.

The legacy mode (`.env.local` → `vercel env add` → secrets stored in Vercel) is preserved as the default when `.doppler.yaml` is absent.

**Prerequisites the user must have BEFORE running this command:**
- A custom domain they own (e.g., `myapp.com`) — Clerk production requires this, `*.vercel.app` is not accepted
- A Stripe account (for Clerk Billing integration)
- Google OAuth credentials (optional — for Google social login)

## Phase 1: Verify Prerequisites

1. Check Node.js version: `node -v` (require 18+)
2. Check if `node_modules` exists: `ls node_modules/.package-lock.json 2>/dev/null`
   - If not: run `npm install`
3. Run `node scripts/deploy.mjs check-tools`
4. Parse the JSON result and display tool status with checkmarks

5. Read `.env.local` and verify it has been configured by `/install`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_SITE_NAME`
   If any are missing: STOP. Display: "Run `/install` first to set up the app."

**AskUserQuestion**: "Before we begin, please confirm you have these prerequisites ready:"
- Options:
  - "Yes, I have a custom domain and Stripe account" — I'm ready to proceed
  - "I'm missing something" — I need guidance on what's required
- Header: "Prerequisites"
- multiSelect: false

**If "I'm missing something":**

Display:
```
Production deployment requires these things prepared in advance:

1. **Custom Domain** (required by Clerk)
   - Register at Namecheap, Cloudflare, Google Domains, etc.
   - You'll enter this when creating the Clerk production instance
   - *.vercel.app domains are NOT accepted by Clerk

2. **Stripe Account** (required for Clerk Billing)
   - Sign up at https://dashboard.stripe.com/register
   - Complete identity verification
   - You'll connect it to Clerk during this process

3. **Google OAuth Credentials** (optional — for Google social login)
   - Create at https://console.cloud.google.com/apis/credentials
   - You'll need a Client ID and Client Secret
   - Can be set up later if not ready now

Come back and run /deploy-to-prod when you have at least #1 and #2 ready.

In the meantime, you can run /deploy-to-dev to get your app on Vercel with dev keys.
```
STOP here.

## Phase 2: GitHub Setup

Check the `isUpstreamTemplate` and `gitRemote` values from check-tools.

**If `isUpstreamTemplate: true` (origin points to the template repo):**

**AskUserQuestion**: "Your git origin still points to the template repo. Would you like me to create your own private GitHub repository?"
- Options:
  - "Yes, create a private repo for me (Recommended)" — I'll create a private GitHub repo, move the template to `upstream`, and push your code
  - "No, I'll set it up myself" — I'll provide instructions for manual setup
- Header: "GitHub repo"

**If "Yes":**
- Check `gh` is installed and authenticated (from check-tools result)
- If `gh` not installed: display OS-specific install instructions, then AskUserQuestion to confirm installed
- If `gh` not authenticated: tell user to run `gh auth login`, then AskUserQuestion to confirm
- **AskUserQuestion**: "What should I name your GitHub repository?"
  - Options:
    - "[directory basename]" (Recommended) — Uses current folder name
    - "[site name from .env.local]" — Uses your configured site name
  - Header: "Repo name"
- Run: `node scripts/deploy.mjs github-setup --repo-name="<NAME>"`
- Parse result and show new repo URL

**If "No":**
Display manual instructions and AskUserQuestion to confirm when done.

**If origin is already a non-template repo:** show checkmark and proceed.

## Phase 3: Clerk Production Instance + Keys

**AskUserQuestion**: "What is your custom domain? (e.g., myapp.com or app.mydomain.com)"
- Options: "I'll enter it below" — Select 'Other' and type your domain
- Header: "Domain"

Store the domain for use in instructions.

**AskUserQuestion**: "Do you already have Clerk Production API keys (pk_live_ and sk_live_)?"
- Options:
  - "No, I need to create a production instance" — I'll walk you through the Clerk Dashboard steps
  - "Yes, I have my production keys" — You'll paste your pk_live_ and sk_live_ keys
- Header: "Clerk prod"

**If "No, I need to create":**

Display step-by-step instructions (substitute the user's domain):
```
Let's create your Clerk Production instance. Follow these steps:

1. Open Clerk Dashboard: https://dashboard.clerk.com
2. Select your application (the one from /install)
3. Look at the top-right — you'll see "Development" with a toggle
4. Click the toggle and select "Create production instance"
5. Choose "Clone development settings" (recommended — copies your dev config)
6. For "Application domain", enter: <THEIR_DOMAIN>
7. Click "Create Instance"

Your production instance is now created alongside your dev instance.

Now get your production API keys:
8. Make sure "Production" is selected in the top toggle
9. Go to "API Keys" in the left sidebar
10. Copy both keys — you'll paste them next
```

AskUserQuestion: "Have you created your Clerk production instance and are ready to paste your keys?"
- Options: "Yes, I have my production keys"
- Header: "Keys ready"

**Collect keys (both paths converge here):**

**AskUserQuestion**: "Paste your Clerk Production Publishable Key (starts with pk_live_). Select 'Other' and paste it."
- Options: "I'll paste it below" — Select 'Other' below and paste your pk_live_ key
- Header: "Clerk PK"

**Validate:** If doesn't start with `pk_live_`, ask again.

**AskUserQuestion**: "Paste your Clerk Production Secret Key (starts with sk_live_). Select 'Other' and paste it."
- Options: "I'll paste it below" — Select 'Other' below and paste your sk_live_ key
- Header: "Clerk SK"

**Validate:** If doesn't start with `sk_live_`, ask again.

## Phase 4: Google OAuth Setup (Optional)

**AskUserQuestion**: "Would you like to set up Google social login for production?"
- Options:
  - "Yes, walk me through it" — I'll guide you through Google OAuth setup
  - "Skip for now" — You can add Google login later from Clerk Dashboard
  - "Already configured" — I've already set up Google OAuth in Clerk production
- Header: "Google OAuth"

**If "Skip for now":** Continue to Phase 5.
**If "Already configured":** Continue to Phase 5.

**If "Yes, walk me through it":**

Display instructions:
```
Let's configure Google OAuth on your Clerk production instance.

PART A — Google Cloud Console:
1. Open: https://console.cloud.google.com/apis/credentials
2. Select your Google Cloud project (or create one)
3. If prompted, configure the OAuth consent screen first:
   - User Type: External
   - Fill in app name, support email, developer email
   - Add scopes: email, profile, openid
   - Save
4. Go back to Credentials → "Create Credentials" → "OAuth Client ID"
5. Application type: "Web application"
6. Name: "Clerk Production"
7. Authorized redirect URIs: You'll get this from Clerk in the next step
   — For now, click "Create" and copy the Client ID and Client Secret

PART B — Clerk Dashboard:
8. Open Clerk Dashboard: https://dashboard.clerk.com
9. Make sure "Production" is selected (top toggle)
10. Go to "SSO Connections" → "Google"
11. Toggle "Use custom credentials"
12. You'll see the required "Authorized redirect URI" — copy it
13. Go back to Google Cloud Console → edit your OAuth client → paste the redirect URI → Save
14. Back in Clerk: paste your Google Client ID and Client Secret → Save
```

AskUserQuestion: "Have you completed the Google OAuth setup in both Google Cloud Console and Clerk?"
- Options: "Yes, it's configured" — Google OAuth is set up
- Header: "OAuth done"

## Phase 5: Stripe Billing via Clerk

Display instructions:
```
Now let's connect Stripe billing to your Clerk production instance.

1. Open Clerk Dashboard: https://dashboard.clerk.com
2. Make sure "Production" is selected (top toggle)
3. Go to "Billing" in the left sidebar
4. Click "Connect Stripe" and follow the Stripe onboarding
   — If prompted, log in to your Stripe account
   — Stripe will redirect back to Clerk when done
5. After connecting, create a subscription plan:
   — Clerk Dashboard → Billing → Plans → "Create Plan"
   — Set a name, monthly price, and features
   — Save the plan
6. To accept real payments:
   — Toggle from "Test Mode" to "Live Mode" in Clerk Billing settings
   — Ensure your Stripe account is fully activated (identity verification complete)
```

AskUserQuestion: "Have you connected Stripe to Clerk and created at least one plan?"
- Options:
  - "Yes, billing is configured" — Stripe is connected and I have a plan
  - "I'll set up billing later" — Skip for now, I can enable it later
- Header: "Stripe done"

## Phase 6: Convex Deploy Key

**AskUserQuestion**: "Do you already have a Convex Production Deploy Key, or should I generate one automatically?"
- Options:
  - "Generate it for me (Recommended)" — Uses your existing Convex login to create a deploy key via the API
  - "Yes, I have my deploy key" — You'll paste your prod:...|... key
- Header: "Convex key"

**If "Generate it for me":**

Run: `node scripts/deploy.mjs convex-deploy-key`

Parse JSON output:
- If `success: true`: Show the generated deploy key (masked) and production deployment name with checkmark
- If `error: "not_logged_in"` or `error: "auth_expired"`: Tell user to run `npx convex dev` to refresh, AskUserQuestion to confirm, retry
- If `error: "no_prod_deployment"`: Fall back to manual instructions for Convex Dashboard → Settings → Deploy Keys

**If "Yes, I have my deploy key":**
Collect via AskUserQuestion. Validate format (starts with `prod:`, contains `|`).

## Phase 7: Validate + Configure Clerk Production

Run: `node scripts/deploy.mjs validate-keys --clerk-pk="<PK>" --clerk-sk="<SK>" --deploy-key="<KEY>" --require-prod=true`

Parse JSON output:
- Show validation results with checkmarks
- Show derived frontend API URL
- Show JWT template status

If validation fails, display error and offer to re-enter keys.

Store the `frontendApiUrl` from the result.

## Phase 8: Deploy Convex Functions to Production

Run: `node scripts/deploy.mjs convex-deploy-functions --deploy-key="<KEY>"`

Parse JSON output:
- Show production Convex URL with checkmark
- Show production HTTP actions URL (needed for webhook)

Store `prodSiteUrl` from the result.

## Phase 9: Production Webhook + Convex Env Vars

Get admin email from `.env.local` or ask user if not found.

Run: `node scripts/deploy.mjs prod-webhook --clerk-sk="<SK>" --convex-site-url="<SITE_URL>" --admin-email="<ADMIN_EMAIL>"`

Parse JSON output and show results.

Run: `node scripts/deploy.mjs convex-prod-env --deploy-key="<KEY>" --webhook-secret="<SECRET>" --frontend-api-url="<URL>" --admin-email="<ADMIN_EMAIL>"`

Parse JSON output and show each env var set.

## Phase 10: Vercel Setup + Environment Variables

**Step 1:** Create `vercel.json` with Next.js framework preset and production build command.
The `"framework": "nextjs"` is REQUIRED — without it, `vercel project add` via CLI defaults the framework to "Other", which causes Edge Function errors with Clerk middleware.

Write `vercel.json`:

**Doppler mode** (`.doppler.yaml` exists): chain prebuild → Convex deploy → Next.js build. The prebuild script fetches secrets from Doppler so `next build` can inline `NEXT_PUBLIC_*`:
```json
{
  "framework": "nextjs",
  "buildCommand": "node scripts/vercel-prebuild.mjs && npx convex deploy --cmd 'npm run build'"
}
```

**Legacy mode** (no `.doppler.yaml`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npx convex deploy --cmd 'npm run build'"
}
```

**Step 2:** Ensure code is committed and pushed.
Run `git status` — if there are changes:
- AskUserQuestion: commit and push, or handle manually
- If "Yes": `git add vercel.json && git commit -m "Add vercel.json for production builds" && git push origin main`

**Step 3:** Vercel login + link + git connect.
Derive the Vercel project name from the GitHub repo name (NOT the directory name):
1. Parse the repo name from the origin remote URL: `git remote get-url origin` → extract the repo basename (e.g., `user/my-app` → `my-app`)
2. Run: `npx vercel project add <REPO_NAME> 2>&1 || true` (creates the project on Vercel with the correct name; ignore errors if it already exists)
3. Run: `npx vercel link --yes --project=<REPO_NAME>`
If auth error: tell user to run `npx vercel login`, AskUserQuestion to confirm, retry.
4. Connect the GitHub repo for automatic deployments on push:
   Run: `npx vercel git connect --yes`
   This enables Vercel to auto-rebuild and redeploy when you `git push origin main`.
   If this fails, show warning but continue — the CLI deploy will still work. User can connect manually in Vercel Dashboard → Settings → Git.

**Step 4:** Set Vercel env vars.

**Doppler mode** (`.doppler.yaml` exists): seed the **complete** required key set in Doppler `prd` BEFORE invoking the deploy. The script now performs a preflight check — if any required key is missing it aborts with `error: "doppler_prd_incomplete"` and lists the missing keys.

Required keys (the script's preflight allowlist):
```bash
# Read project name from .doppler.yaml (preferred) or package.json fallback
PROJECT=$(node -e "const fs=require('fs'); const m=fs.readFileSync('.doppler.yaml','utf-8').match(/project:\s*(\S+)/); console.log(m ? m[1] : require('./package.json').name)")

# Clerk production app
doppler secrets set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<PK>" --project $PROJECT --config prd
doppler secrets set CLERK_SECRET_KEY="<SK>" --project $PROJECT --config prd
doppler secrets set CLERK_WEBHOOK_SECRET="<WHSEC>" --project $PROJECT --config prd
doppler secrets set NEXT_PUBLIC_CLERK_FRONTEND_API_URL="<URL>" --project $PROJECT --config prd

# Convex production
doppler secrets set CONVEX_DEPLOY_KEY="<KEY>" --project $PROJECT --config prd
doppler secrets set NEXT_PUBLIC_CONVEX_URL="<PROD_CONVEX_URL>" --project $PROJECT --config prd

# Site identity
doppler secrets set NEXT_PUBLIC_SITE_NAME="<NAME>" --project $PROJECT --config prd

# Runtime crypto (carry over from dev if you want sessions to persist; or generate new and accept that all sessions invalidate)
DEV_CSRF=$(doppler secrets get CSRF_SECRET --project $PROJECT --config dev --plain)
DEV_SESSION=$(doppler secrets get SESSION_SECRET --project $PROJECT --config dev --plain)
doppler secrets set CSRF_SECRET="$DEV_CSRF" --project $PROJECT --config prd
doppler secrets set SESSION_SECRET="$DEV_SESSION" --project $PROJECT --config prd

# Admin (used by Convex queries)
doppler secrets set ADMIN_EMAIL="<EMAIL>" --project $PROJECT --config prd

# Clerk redirect URLs — typically the same as dev
for KEY in NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL \
           NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL; do
  V=$(doppler secrets get "$KEY" --project $PROJECT --config dev --plain 2>/dev/null)
  [ -n "$V" ] && doppler secrets set "$KEY"="$V" --project $PROJECT --config prd
done
```

Then run: `node scripts/deploy.mjs vercel-env`

**If the script returns `error: "doppler_prd_incomplete"`**: STOP. Display the `message` and `hint` fields verbatim, then run the `doppler secrets set` commands above for whatever's listed in `missing[]`, then retry `vercel-env`.

The command auto-delegates to `vercel-env-doppler`: issues a fresh `prd`-scoped Doppler service token, pushes only `DOPPLER_TOKEN` (and generates `REVALIDATE_TOKEN` if absent) to Vercel Production, runs `scripts/sync-convex-env.mjs --config prd`, and writes the `_PROD_PROMOTED_AT` marker (which gates future `/deploy-to-dev` runs from stomping prod). The `--clerk-*`, `--deploy-key`, `--frontend-api-url`, `--site-name`, `--convex-url` arguments are ignored in Doppler mode — values come from Doppler.

**Legacy mode** (no `.doppler.yaml`):
Run: `node scripts/deploy.mjs vercel-env --clerk-pk="<PK>" --clerk-sk="<SK>" --deploy-key="<KEY>" --frontend-api-url="<URL>" --site-name="<NAME>" --convex-url="<PROD_CONVEX_URL>"`

Use the production Convex URL from Phase 8 (`prodUrl`). This is required — server-side code (middleware, rate limiting, CSRF) needs `NEXT_PUBLIC_CONVEX_URL` at runtime.

Parse and show each variable set.

**Doppler mode verification:** After this step, `npx vercel env ls production` should show ONLY `DOPPLER_TOKEN`. App values are NOT in Vercel — they're fetched from Doppler at build time (via `scripts/vercel-prebuild.mjs`) and runtime (via `lib/secrets.ts`).

## Phase 11: Production Deployment

Run: `node scripts/deploy.mjs vercel-deploy`

Parse JSON output:
- The result contains `url` (deployment-specific URL) and `productionUrl` (short alias like `site.vercel.app`)
- **Use `productionUrl` for display** if available, fall back to `url`
- Show the URL with checkmark
- If deploy fails, show error and retry instructions

## Phase 12: Write Summary + Completion

Build write-summary arguments from all collected data. Include google-oauth status and billing status.

Run: `node scripts/deploy.mjs write-summary --deploy-type="prod" --vercel-url="<URL>" --repo-url="<URL>" --convex-prod-url="<URL>" --convex-site-url="<URL>" --frontend-api-url="<URL>" --site-name="<NAME>" --admin-email="<EMAIL>" --google-oauth="<configured|skipped>" --webhook-url="<URL>" --completed-steps="<STEPS>" --skipped-steps="<STEPS>" --vercel-vars="<VARS>" --convex-vars="<VARS>"`

Display:

```
## Production Deployment Complete!

### Automated Steps
- [x] GitHub repository created / configured
- [x] Clerk production instance created (with custom domain)
- [x] Clerk production keys validated (pk_live_/sk_live_)
- [x] JWT template created on production Clerk
- [x] Frontend API URL configured
- [x] Google OAuth configured
- [x] Stripe billing connected
- [x] Convex deploy key generated
- [x] Convex functions deployed to production
- [x] Production webhook created via Svix
- [x] Convex production env vars set
- [x] Vercel project linked
- [x] Vercel production env vars set (12+ variables)
- [x] vercel.json created with Convex build command
- [x] Production deployment triggered

### Your Production URLs
- App: <VERCEL_URL>
- Custom Domain: <THEIR_DOMAIN> (configure DNS in Vercel Dashboard → Domains)
- Convex Dashboard: https://dashboard.convex.dev (select prod deployment)
- Clerk Dashboard: https://dashboard.clerk.com (switch to Production)

### Deployment Summary Saved
Full record saved to: **docs/DEPLOYMENT-PROD.md**

### Verify Your Deployment
1. Visit your production URL
2. Create a test account (Google login should work)
3. Check Convex Dashboard → Production → Data → users table
4. User should appear (confirms webhook is working)

### Remaining Setup
1. **Point your domain to Vercel**: Vercel Dashboard → Settings → Domains → Add <THEIR_DOMAIN>
2. **Configure DNS**: Add the records shown by Vercel at your domain registrar
3. **Update Clerk domain**: After DNS propagates, verify in Clerk Dashboard (Production) → Domains

### Ongoing Deployments
Future deployments happen automatically when you push to main:
  git push origin main
Vercel will auto-deploy, including Convex function updates.
```

Adjust the summary based on what actually succeeded. Note any skipped steps with guidance.
