---
allowed-tools: AskUserQuestion, Bash(node scripts/deploy.mjs*), Bash(npx vercel*), Bash(npm install*), Bash(git *), Bash(gh *), Bash(ls *), Bash(node -v*), Bash(which *), Read, Edit, Write
description: Deploy to production (Clerk + Convex + Vercel)
---

# /deploy - Automated Production Deployment

You are the production deployment assistant for Secure Vibe Coding OS. You will guide the user through deploying their app to production, automating everything possible and providing clear instructions for steps that require manual dashboard interaction.

**Important context:** The user has already run `/install` and has a working local development setup. This command takes them to production.

## Phase 1: Prerequisites + GitHub Setup

1. Check Node.js version: `node -v` (require 18+)
2. Check if `node_modules` exists: `ls node_modules/.package-lock.json 2>/dev/null`
   - If not: run `npm install`
3. Run `node scripts/deploy.mjs check-tools`
4. Parse the JSON result and display tool status:
   - Show each tool with version and checkmark, or missing indicator
   - If `gh` is missing, show OS-specific install instructions from the result
   - If `vercel` is missing, tell user: "Vercel CLI will be installed automatically via npx"

**Handle GitHub repo:**

5. If `isUpstreamTemplate: true` (origin points to the template repo):

   **AskUserQuestion**: "Your git origin still points to the template repo. Would you like me to create your own private GitHub repository?"
   - Options:
     - "Yes, create a private repo for me (Recommended)" — I'll create a private GitHub repo, move the template to `upstream`, and push your code
     - "No, I'll set it up myself" — I'll provide instructions for manual setup
   - Header: "GitHub repo"

   **If "Yes":**
   - Check `gh` is installed and authenticated (from check-tools result)
   - If `gh` not installed: display OS-specific install instructions, then AskUserQuestion: "Have you installed the GitHub CLI?" with options "Yes, it's installed" and header "gh CLI"
   - If `gh` not authenticated: tell user to run `gh auth login`, then AskUserQuestion: "Have you authenticated with GitHub?" with options "Yes, I'm logged in" and header "gh auth"
   - **AskUserQuestion**: "What should I name your GitHub repository?"
     - Options:
       - "[directory basename from check-tools]" (Recommended) — Uses current folder name
       - "[site name from .env.local NEXT_PUBLIC_SITE_NAME]" — Uses your configured site name
     - Header: "Repo name"
   - Run: `node scripts/deploy.mjs github-setup --repo-name="<NAME>"`
   - Parse result and show new repo URL + note that template is preserved as `upstream` remote

   **If "No":**
   Display manual instructions:
   ```
   To set up your own GitHub repo manually:
   1. Create a new private repository on GitHub
   2. Rename the template remote: git remote rename origin upstream
   3. Add your repo: git remote add origin https://github.com/YOU/YOUR-REPO.git
   4. Push: git push -u origin main
   ```
   AskUserQuestion: "Let me know when you've set up your GitHub repo"
   - Options: "Done, continue" — My repo is set up and code is pushed
   - Header: "Repo ready"

6. If origin is already a non-template repo: show checkmark and proceed.
7. If no remote at all: same flow as "Yes" above.

## Phase 2: Clerk Production Instance + Keys

**AskUserQuestion**: "Do you already have Clerk Production API keys (pk_live_ and sk_live_)?"
- Options:
  - "No, I need to create a production instance" — I'll walk you through the Clerk Dashboard steps
  - "Yes, I have my production keys" — You'll paste your pk_live_ and sk_live_ keys
- Header: "Clerk prod"

**If "No, I need to create":**

Display step-by-step instructions:
```
Let's create your Clerk Production instance. Follow these steps:

1. Open Clerk Dashboard: https://dashboard.clerk.com
2. Select your application (the one from /install)
3. Look at the top-right — you'll see "Development" with a toggle
4. Click the toggle and select "Create production instance"
5. Choose "Clone development settings" (recommended — copies your dev config)
6. Click "Create"

Your production instance is now created alongside your dev instance.

Now get your production API keys:
7. Make sure "Production" is selected in the top toggle
8. Go to "API Keys" in the left sidebar
9. Copy both keys — you'll paste them next
```

AskUserQuestion: "Have you created your Clerk production instance and are ready to paste your keys?"
- Options: "Yes, I have my production keys" — I've created the instance and have my keys ready
- Header: "Keys ready"

**Collect keys (both paths converge here):**

**AskUserQuestion**: "Paste your Clerk Production Publishable Key (starts with pk_live_). Select 'Other' and paste it."
- Options:
  - "I'll paste it below" — Select 'Other' below and paste your pk_live_ key
- Header: "Clerk PK"

**Validate:** If doesn't start with `pk_live_`, tell user: "That doesn't look like a production key (should start with pk_live_). Please check you're in the Production view in Clerk Dashboard." Ask again.

**AskUserQuestion**: "Paste your Clerk Production Secret Key (starts with sk_live_). Select 'Other' and paste it."
- Options:
  - "I'll paste it below" — Select 'Other' below and paste your sk_live_ key
- Header: "Clerk SK"

**Validate:** If doesn't start with `sk_live_`, ask again with same guidance.

## Phase 3: Convex Deploy Key

**AskUserQuestion**: "Do you already have a Convex Production Deploy Key, or should I generate one automatically?"
- Options:
  - "Generate it for me (Recommended)" — Uses your existing Convex login to create a deploy key via the API
  - "Yes, I have my deploy key" — You'll paste your prod:...|... key
- Header: "Convex key"

**If "Generate it for me":**

Run: `node scripts/deploy.mjs convex-deploy-key`

Parse JSON output:
- If `success: true`: Show the generated deploy key (masked — show first 20 chars + "...") and production deployment name with checkmark
- If `error: "not_logged_in"` or `error: "auth_expired"`: Tell user to run `npx convex dev` in their terminal to refresh auth, then AskUserQuestion to confirm, then retry
- If `error: "no_prod_deployment"`: Fall back to manual instructions:
  ```
  Your Convex project doesn't have a production deployment yet. Let's create one:
  1. Open Convex Dashboard: https://dashboard.convex.dev
  2. Select your project
  3. Go to Settings → Deploy Keys
  4. Click "Generate a production deploy key"
  5. Copy the entire key (shown only once!)
  ```
  Then AskUserQuestion to collect the key manually.

**If "Yes, I have my deploy key":**

**AskUserQuestion**: "Paste your Convex Production Deploy Key (starts with prod:). Select 'Other' and paste it."
- Options: "I'll paste it below" — Select 'Other' below and paste your deploy key
- Header: "Deploy key"

**Validate:** Must start with `prod:` and contain `|`. If invalid, explain the expected format and ask again.

## Phase 4: Google OAuth (Optional)

**AskUserQuestion**: "Does your app use Google social login? (This can be set up later if you're not sure.)"
- Options:
  - "Skip for now (Recommended)" — You can add Google login later from the Clerk Dashboard
  - "Yes, I need to set it up" — I'll walk you through creating Google OAuth credentials
  - "Yes, I already have Google OAuth configured in Clerk" — Already done, continue to deployment
- Header: "Google OAuth"

**If "Skip for now":** Continue to Phase 5. Note in the final summary that Google OAuth is an optional future step.

**If "Yes, I need to set it up":**

Display instructions:
```
Google OAuth requires two steps: creating credentials at Google, then adding them to Clerk.

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
6. Name: "Clerk Production" (or anything descriptive)
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

AskUserQuestion: "Have you completed the Google OAuth setup?"
- Options: "Yes, it's configured" — Google OAuth is set up in both Google and Clerk
- Header: "OAuth done"

**If "Yes, I already have it configured":** Continue to Phase 5.

## Phase 5: Validate + Configure Clerk Production

Run: `node scripts/deploy.mjs validate-keys --clerk-pk="<PK>" --clerk-sk="<SK>" --deploy-key="<KEY>"`

Parse JSON output:
- Show validation results with checkmarks
- Show derived frontend API URL
- Show JWT template status

If validation fails, display error and offer to re-enter keys.

Store the `frontendApiUrl` from the result for use in later phases.

## Phase 6: Deploy Convex Functions to Production

Run: `node scripts/deploy.mjs convex-deploy-functions --deploy-key="<KEY>"`

Parse JSON output:
- Show production Convex URL with checkmark
- Show production HTTP actions URL (this is needed for the webhook)

If this fails, display error and offer retry. Common issues: invalid deploy key, network timeout.

Store `prodSiteUrl` from the result for use in Phase 7.

## Phase 7: Production Webhook + Convex Env Vars

Read `.env.local` to get the admin email (ADMIN_EMAIL or from Phase 2 of /install).

If admin email not found in .env.local, read the `ADMIN_EMAIL` that was previously set in Convex by checking the `configure` step, or ask the user:
**AskUserQuestion**: "What is your admin email address? (Used for the ADMIN_EMAIL environment variable)"
- Options: "I'll enter it below" — Select 'Other' and type your admin email
- Header: "Admin email"

Run: `node scripts/deploy.mjs prod-webhook --clerk-sk="<SK>" --convex-site-url="<SITE_URL>" --admin-email="<ADMIN_EMAIL>"`

Parse JSON output:
- If success: show webhook endpoint URL with checkmark
- If failed with `manualSteps`: display the manual webhook creation instructions

Run: `node scripts/deploy.mjs convex-prod-env --deploy-key="<KEY>" --webhook-secret="<SECRET>" --frontend-api-url="<URL>" --admin-email="<ADMIN_EMAIL>"`

Parse JSON output:
- Show each Convex env var set with checkmark

## Phase 8: Vercel Setup + Environment Variables

**Step 1:** Create `vercel.json` if it doesn't exist.
Read `vercel.json` — if missing or doesn't have the buildCommand:

Write `vercel.json`:
```json
{
  "buildCommand": "npx convex deploy --cmd 'npm run build'"
}
```

Show checkmark: "Created vercel.json with Convex build command"

**Step 2:** Ensure code is committed and pushed.
Run `git status` to check for uncommitted changes. If there are changes (especially vercel.json), tell the user:
"There are uncommitted changes (including vercel.json). You should commit and push before deploying."

AskUserQuestion: "Would you like me to commit and push the changes?"
- Options:
  - "Yes, commit and push (Recommended)" — I'll commit vercel.json and any other changes, then push
  - "No, I'll handle it" — You'll commit and push manually
- Header: "Git push"

If "Yes": run `git add vercel.json && git commit -m "Add vercel.json for production builds" && git push origin main`

**Step 3:** Vercel login + link.
Run: `npx vercel link --yes`
If this fails with an auth error, tell the user: "You need to log in to Vercel first. Run `npx vercel login` in your terminal."
AskUserQuestion: "Have you logged in to Vercel?"
- Options: "Yes, I'm logged in"
- Header: "Vercel auth"
Then retry: `npx vercel link --yes`

**Step 4:** Read NEXT_PUBLIC_SITE_NAME from .env.local for the site-name argument.

Run: `node scripts/deploy.mjs vercel-env --clerk-pk="<PK>" --clerk-sk="<SK>" --deploy-key="<KEY>" --frontend-api-url="<URL>" --site-name="<NAME>"`

Parse JSON output:
- Show each variable set with checkmark

## Phase 9: Production Deployment

Run: `node scripts/deploy.mjs vercel-deploy`

Parse JSON output:
- Show deployment URL
- If deploy fails, show error and retry instructions

## Phase 10: Write Summary + Completion

**Step 1:** Write the deployment summary to `docs/DEPLOYMENT.md`.

Build the `write-summary` arguments from all the data collected during the deployment:

- `--vercel-url` from Phase 9 result
- `--repo-url` from Phase 1 result (github-setup or existing remote)
- `--convex-prod-url` from Phase 6 result (prodUrl)
- `--convex-site-url` from Phase 6 result (prodSiteUrl)
- `--frontend-api-url` from Phase 5 result
- `--site-name` from .env.local NEXT_PUBLIC_SITE_NAME
- `--admin-email` from Phase 7
- `--google-oauth` = "configured" or "skipped" from Phase 4
- `--webhook-url` from Phase 7 result (endpointUrl)
- `--completed-steps` = comma-separated list of steps that succeeded (e.g., "GitHub repo created,Clerk keys validated,JWT template created,Frontend API URL configured,Convex functions deployed,Production webhook created,Convex env vars set,Vercel project linked,Vercel env vars set,vercel.json created,Production deployed")
- `--skipped-steps` = comma-separated list of anything skipped or failed (e.g., "Google OAuth setup")
- `--vercel-vars` = comma-separated list of Vercel env var names from Phase 8
- `--convex-vars` = comma-separated list of Convex env var names from Phase 7

Run: `node scripts/deploy.mjs write-summary --vercel-url="<URL>" --repo-url="<URL>" --convex-prod-url="<URL>" --convex-site-url="<URL>" --frontend-api-url="<URL>" --site-name="<NAME>" --admin-email="<EMAIL>" --google-oauth="<STATUS>" --webhook-url="<URL>" --completed-steps="<STEPS>" --skipped-steps="<STEPS>" --vercel-vars="<VARS>" --convex-vars="<VARS>"`

**Step 2:** Display the final summary to the user:

```
## Production Deployment Complete!

### Automated Steps
- [x] GitHub repository created / configured
- [x] Clerk production keys validated
- [x] JWT template created on production Clerk
- [x] Frontend API URL configured
- [x] Convex functions deployed to production
- [x] Production webhook created via Svix
- [x] Convex production env vars set (CLERK_WEBHOOK_SECRET, NEXT_PUBLIC_CLERK_FRONTEND_API_URL, ADMIN_EMAIL)
- [x] Vercel project linked
- [x] Vercel production env vars set (12+ variables)
- [x] vercel.json created with build command
- [x] Production deployment triggered

### Your Production URLs
- App: <VERCEL_URL>
- Convex Dashboard: https://dashboard.convex.dev (select prod deployment)
- Clerk Dashboard: https://dashboard.clerk.com (switch to Production)

### Deployment Summary Saved
A full record of this deployment has been saved to: **docs/DEPLOYMENT.md**
This includes all URLs, environment variables set, and next steps for future reference.

### Verify Your Deployment
1. Visit your production URL
2. Create a test account
3. Check Convex Dashboard → Production → Data → users table
4. User should appear (confirms webhook is working)

### Optional Next Steps (can be done later)
1. **Custom Domain**: Vercel Dashboard → Settings → Domains → Add your domain
2. **Clerk Domain**: Clerk Dashboard (Production) → Domains → Add production domain
3. **Google OAuth**: Clerk Dashboard (Production) → SSO Connections → Google → Use custom credentials
4. **Enable Billing**: Clerk Dashboard (Production) → Billing → Connect Stripe
5. **Create Subscription Plan**: Clerk Dashboard (Production) → Billing → Plans → Create
6. **Go Live with Payments**: Toggle from Test Mode to Live Mode in Clerk Billing

### Ongoing Deployments
Future deployments happen automatically when you push to main:
  git push origin main
Vercel will auto-deploy, including Convex function updates.
```

Adjust the summary based on what actually succeeded — only show checkmarks for completed steps. If any step was skipped or failed, note it with guidance on how to complete it manually.
