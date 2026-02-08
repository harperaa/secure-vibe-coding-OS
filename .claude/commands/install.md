---
allowed-tools: AskUserQuestion, Bash(node scripts/setup.mjs*), Bash(npx convex*), Bash(npm install*), Bash(ls *), Bash(node -v*), Bash(basename *), Read, Edit
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
Ask: "What email address will be your admin account? (Used for Security Monitoring dashboard access)"
- Options:
  - "Enter below" — Type your email address
- Header: "Admin email"

Note: The user will likely type in their email via the "Other" option. Capture whatever they provide.

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
- If accountless flow: prominently display the **claim URL** and tell the user to visit it after setup to create/link their Clerk account
- Show the list of environment variables that were set

## Phase 4: Convex Setup

Tell the user:

```
Now let's set up Convex. You'll be prompted to:
1. Log in to Convex (or create an account)
2. Create a new project (or select existing)

This is interactive - follow the prompts in the terminal.
```

Run: `npx convex dev --once`

This will:
- Prompt user to log in (opens browser)
- Let them create/select a project
- Write CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL to .env.local
- Deploy Convex functions

After it completes, verify `.env.local` has `NEXT_PUBLIC_CONVEX_URL` set.

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

## Phase 6: Completion Summary

Display a final summary, adjusting based on what actually succeeded:

```
## Installation Complete!

### Automated Steps
- [x] Dependencies installed
- [x] .env.local created and configured
- [x] CSRF and Session secrets generated
- [x] Clerk application created (or existing keys configured)
- [x] JWT template for Convex created
- [x] Frontend API URL configured
- [x] Convex project set up and functions deployed
- [x] Webhook endpoint created via Svix
- [x] Convex environment variables set (CLERK_WEBHOOK_SECRET, ADMIN_EMAIL, NEXT_PUBLIC_CLERK_FRONTEND_API_URL)

### Claim Your Clerk App (if accountless)
Visit: <CLAIM_URL>
This creates your Clerk account and gives you full dashboard access.

### Remaining Manual Steps
1. **Enable Billing** in Clerk Dashboard:
   - Go to Clerk Dashboard > Billing > Settings > Enable Billing
2. **Create a Subscription Plan**:
   - Clerk Dashboard > Billing > Plans > Create Plan
   - Name it, set monthly price, save

### Start Development
Terminal 1: npx convex dev
Terminal 2: npm run dev

Your app will be at http://localhost:3000
```
