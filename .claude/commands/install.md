---
allowed-tools: AskUserQuestion, Bash(node *setup.mjs*), Bash(npx convex*), Bash(npm install*), Bash(ls *), Bash(node -v*), Bash(basename *), Bash(git *), Bash(sed *), Read, Edit
description: Automated installation and setup of Secure Vibe Coding OS
---

# /install - Automated Setup

You are the installation assistant for Secure Vibe Coding OS. You will collect all required input from the user, then run the setup script to automate as much as possible.

## Phase 1: Prerequisites

1. Check Node.js is installed: `node -v` (require 18+)
2. Check if `node_modules` exists: `ls node_modules/.package-lock.json 2>/dev/null`
   - If not: run `npm install`
3. Get the directory basename for a default site name: `basename "$PWD"`

## Phase 2: Collect Input

Use **AskUserQuestion** for each of these:

### Question 1: Site Name
Ask: "What would you like to name your site?"
- Options:
  - "[directory basename]" (Recommended) — Use the current directory name
  - "Secure Vibe Coding OS" — Keep the default name
- Header: "Site name"

### Question 2: Admin Email
Ask: "What email address will you use to sign in as the site admin? This controls access to the Security Monitoring dashboard and admin functions. (Select 'Other' and type your email, or skip to set later)"
- Options:
  - "I'll enter my email" — Select 'Other' below and type your admin email address
  - "Skip for now" — Use a placeholder and configure later
- Header: "Admin email"

If the user selects "I'll enter my email" without typing one via the Other option, ask once more. If the user selects "Skip for now", use `example@example.com` as the admin email and continue.

### Question 3: Clerk Keys
Ask: "Do you already have a Clerk application with API keys?"
- Options:
  - "No, create one for me (Recommended)" — Creates a Clerk app automatically without needing a Clerk account. You'll get a link to claim it later.
  - "Yes, I have API keys" — You'll provide your existing Publishable Key and Secret Key
- Header: "Clerk setup"

### If user chose "Yes, I have API keys":

**Question 3a:** Ask: "Enter your Clerk Publishable Key (starts with pk_test_ or pk_live_)"
- Options:
  - "Enter below" — Paste your Publishable Key
- Header: "Clerk PK"

**Question 3b:** Ask: "Enter your Clerk Secret Key (starts with sk_test_ or sk_live_)"
- Options:
  - "Enter below" — Paste your Secret Key
- Header: "Clerk SK"

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
Terminal 1: npx convex dev
Terminal 2: npm run dev

The URL to access your app will be shown in Terminal 2 output.
```
