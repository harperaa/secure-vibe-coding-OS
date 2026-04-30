---
allowed-tools: Bash(node *setup.mjs*), Bash(npx convex*), Bash(npm install*), Bash(ls *), Bash(node -v*), Bash(basename *), Bash(git *), Bash(sed *), Read, Edit
description: Automated installation and setup of Secure Vibe Coding OS
---

# /install - Automated Setup

You are the installation assistant for Secure Vibe Coding OS. You will collect all required input from the user, then run the setup script to automate as much as possible.

**CRITICAL: You MUST use AskUserQuestion in Phase 2 to ask the user every question listed below. Do NOT skip questions. Do NOT assume default values. Do NOT proceed to Phase 3 until the user has answered all questions. Every question MUST be asked using the AskUserQuestion tool and you MUST wait for the user's response before continuing.**

## Phase 1: Prerequisites

1. Check Node.js is installed: `node -v` (require 18+)
2. Check if `node_modules` exists: `ls node_modules/.package-lock.json 2>/dev/null`
   - If not: run `npm install`
3. Get the directory basename for a default site name: `basename "$PWD"`

## Phase 2: Collect Input (MANDATORY — DO NOT SKIP)

**STOP. You MUST call AskUserQuestion for each question below. Do NOT assume answers or use defaults without asking.**

After Phase 1 completes, call AskUserQuestion with ALL FOUR questions in a SINGLE batch using the exact parameters below. Replace `DIRNAME` with the basename value from Phase 1. Do NOT split this into multiple AskUserQuestion calls — the user should see all four questions on one screen:

```json
{
  "questions": [
    {
      "question": "What would you like to name your site?",
      "header": "Site name",
      "multiSelect": false,
      "options": [
        { "label": "DIRNAME (Recommended)", "description": "Use the current directory name" },
        { "label": "Secure Vibe Coding OS", "description": "Keep the default template name" }
      ]
    },
    {
      "question": "What email address will you use to sign in as the site admin? This controls access to the Security Monitoring dashboard and admin functions. (Select 'Other' and type your email, or skip to set later)",
      "header": "Admin email",
      "multiSelect": false,
      "options": [
        { "label": "I'll enter my email", "description": "Select 'Other' below and type your admin email address" },
        { "label": "Skip for now", "description": "Use a placeholder and configure later" }
      ]
    },
    {
      "question": "Do you already have a Clerk application with API keys?",
      "header": "Clerk setup",
      "multiSelect": false,
      "options": [
        { "label": "No, create one for me (Recommended)", "description": "Creates a Clerk app automatically without needing a Clerk account. You'll get a link to claim it later." },
        { "label": "Yes, I have API keys", "description": "You'll provide your existing Publishable Key and Secret Key" }
      ]
    },
    {
      "question": "Use Doppler for secrets management? (Recommended — single source of truth for all env vars; runtime fetch on Vercel; one-command incident rotation via /rotate)",
      "header": "Secrets mgmt",
      "multiSelect": false,
      "options": [
        { "label": "Yes — use Doppler (Recommended)", "description": "All env vars live in Doppler. Local dev, Vercel, Convex, and CI all fetch from there. Only DOPPLER_TOKEN ends up in Vercel env." },
        { "label": "No — use legacy .env.local", "description": "Values live in .env.local locally and Vercel env vars in production. Skip Doppler bootstrap entirely." }
      ]
    }
  ]
}
```

If the user selects "I'll enter my email" without typing one via the Other option, ask once more. If the user selects "Skip for now", use `example@example.com` as the admin email and continue.

Persist the secrets-management choice as `<USE_DOPPLER>` (`true` if Doppler, `false` if legacy).

### Doppler bootstrap (only if `<USE_DOPPLER>` is true)

Before Phase 3, run the Doppler bootstrap. It auto-installs the Doppler CLI, drives `doppler login`, creates the project with `dev` and `prd` configs, and pins the repo to `dev` via `.doppler.yaml`:

```bash
node scripts/setup.mjs doppler-bootstrap
```

If this exits non-zero, show the error and STOP. Common causes: brew not installed on macOS (instruct user to install brew), no internet (retry), user cancelled the OAuth flow, or unsupported platform (Windows users will see an error pointing to https://docs.doppler.com/docs/install-cli).

### If user chose "Yes, I have API keys":

Call AskUserQuestion again with these two questions:

```json
{
  "questions": [
    {
      "question": "Enter your Clerk Publishable Key (starts with pk_test_ or pk_live_)",
      "header": "Clerk PK",
      "multiSelect": false,
      "options": [
        { "label": "Enter below", "description": "Paste your Publishable Key" }
      ]
    },
    {
      "question": "Enter your Clerk Secret Key (starts with sk_test_ or sk_live_)",
      "header": "Clerk SK",
      "multiSelect": false,
      "options": [
        { "label": "Enter below", "description": "Paste your Secret Key" }
      ]
    }
  ]
}
```

## Phase 3: Run Init Script

Build and run the init command with all collected values:

```bash
node scripts/setup.mjs init --site-name="<SITE_NAME>" --admin-email="<ADMIN_EMAIL>" [--clerk-pk=<PK> --clerk-sk=<SK>]
```

Parse the JSON output and display results to the user:
- Show each completed step with a checkmark
- Do NOT display the claim URL yet — it will be shown in the final summary (Phase 6)
- Show the list of environment variables that were set

## Phase 4: Convex Setup

Run the automated Convex setup:

```bash
node scripts/setup.mjs convex-setup --project-name="<SITE_NAME>"
```

Parse the JSON output and handle each case:

### Case: `needsLogin: true`

The user is not logged in to Convex. Tell them:

```
Convex requires authentication. I'll start the login process — a URL will appear below.
Please open it in your browser to log in (or create an account).
```

Then run the login command with poll mode (this prints a URL and waits for browser auth):

```bash
npx convex login --login-flow poll --no-open --device-name "claude-setup" 2>&1
```

**Important:** Set a 5-minute timeout (300000ms) on this command — it blocks until the user completes browser login.

After login completes successfully, re-run the convex-setup command:

```bash
node scripts/setup.mjs convex-setup --project-name="<SITE_NAME>"
```

If login fails or times out, use AskUserQuestion:
- Question: "Convex login didn't complete. Would you like to try again, or log in manually?"
- Options: "Try again", "I'll run `npx convex login` in my terminal"
- Header: "Convex login"

If they choose manual: ask them to run `npx convex login` in their terminal, then use AskUserQuestion to confirm completion before re-running convex-setup.

### Case: `needsTeamSelection: true`

Multiple Convex teams were found. The response includes a `teams` array with `{ name, slug }` objects.

Use AskUserQuestion:
- Question: "Which Convex team should this project be created under?"
- Options: One option per team, using the team name as label and slug as description
- Header: "Convex team"

Then re-run with the selected team:

```bash
node scripts/setup.mjs convex-setup --project-name="<SITE_NAME>" --team="<SELECTED_SLUG>"
```

### Case: `success: true`

Convex is set up. Show the completed steps with checkmarks and continue to Phase 5.

### Case: Other errors

Display the error and hint. Use AskUserQuestion:
- Question: "Convex setup ran into an issue. Would you like to retry or set it up manually?"
- Options: "Retry", "I'll run `npx convex dev --once` in my terminal"
- Header: "Convex setup"

If manual: wait for user confirmation, then read `.env.local` to verify `NEXT_PUBLIC_CONVEX_URL` is set.

## Phase 5: Run Configure Script

Now that Convex is set up, run the configure step. You need the Clerk secret key from Phase 2/3.

Read `.env.local` to get `CLERK_SECRET_KEY` if the user provided keys, or use the one from the init output.

```bash
node scripts/setup.mjs configure --clerk-sk="<SECRET_KEY>" --admin-email="<ADMIN_EMAIL>"
```

Parse the JSON output:
- Show each completed step with a checkmark
- Show which Convex env vars were set
- If `manualSteps` array is non-empty, display those as fallback instructions

### Doppler post-init (only if `<USE_DOPPLER>` is true)

After configure succeeds, sync Convex's outputs (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`) from `.env.local` to Doppler `dev`, then create the CI service token and push it to GitHub.

```bash
node scripts/setup.mjs doppler-sync-env-local
node scripts/setup.mjs doppler-create-ci-token
```

If `doppler-create-ci-token` fails because `gh` is not authenticated, prompt the user: "Run `gh auth login` then re-run `node scripts/setup.mjs doppler-create-ci-token` manually." Show a checkmark for each step that succeeded.

## Phase 6: Write Summary + Completion

**Step 1:** Write the installation summary to `docs/INSTALL.md`.

Build the `write-install-summary` arguments from data collected during the installation:

- `--claim-url` from Phase 3 init result (if accountless app was created)
- `--accountless` = "true" if an accountless app was created, "false" if user provided keys
- `--completed-steps` = comma-separated list of steps that succeeded (e.g., "Dependencies installed,.env.local created and configured,CSRF and Session secrets generated,Clerk application created (accountless),JWT template for Convex created,Frontend API URL configured,Convex project set up and functions deployed,Webhook endpoint created via Svix,Convex environment variables set (CLERK_WEBHOOK_SECRET\\, ADMIN_EMAIL\\, NEXT_PUBLIC_CLERK_FRONTEND_API_URL)")
- `--manual-steps` = comma-separated list of anything that failed and needs manual completion (from `manualSteps` arrays in configure output)

Run: `node scripts/setup.mjs write-install-summary --claim-url="<URL>" --accountless="<BOOL>" --completed-steps="<STEPS>" --manual-steps="<STEPS>"`

**Step 2:** Display the final summary, adjusting based on what actually succeeded. The on-screen summary and the saved INSTALL.md should contain the same information:

```
## Installation Complete!

### Automated Steps
- Dependencies installed
- .env.local created and configured
- CSRF and Session secrets generated
- Clerk application created (accountless)
- JWT template for Convex created
- Frontend API URL configured
- Convex project set up and functions deployed
- Webhook endpoint created via Svix
- Convex environment variables set (CLERK_WEBHOOK_SECRET, ADMIN_EMAIL, NEXT_PUBLIC_CLERK_FRONTEND_API_URL)

### Claim Your Clerk App (if accountless)
Visit: <CLAIM_URL>
Click the **Claim** button to create your Clerk account — then skip the remaining setup steps on that page, as the installer has already configured everything for you. Refresh the page after claiming to access your Clerk dashboard.

### Installation Summary Saved
A full record of this installation has been saved to: **docs/INSTALL.md**

### Optional Steps (can be done later)
These are only needed when you're ready to enable paid subscriptions:
1. **Enable Billing** in Clerk Dashboard:
   - Go to Clerk Dashboard > Billing > Settings > Enable Billing
2. **Create a Subscription Plan**:
   - Clerk Dashboard > Billing > Plans > Create Plan
   - Name it, set monthly price, save

### Start Development

If `<USE_DOPPLER>` is true, instruct:
```
Terminal 1: npm run convex:doppler
Terminal 2: npm run dev:doppler
```

Otherwise:
```
Terminal 1: npm run convex
Terminal 2: npm run dev
```

The URL to access your app will be shown in Terminal 2 output.
```
