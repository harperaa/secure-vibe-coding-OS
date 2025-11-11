---
name: self-installer
description: Automated installation and setup of THIS Secure Vibe Coding OS SaaS application. This skill installs the current application only. Use when user says "install app", "setup app", "install this app", "install from readme", or "run the installation". Automates Clerk authentication setup, Convex backend configuration, webhook setup, billing enablement, and application testing using Playwright browser automation.
---

# Self-Installer - Automated Application Installation

This skill automates the complete installation of THIS application by following the README.md instructions exactly.

## Installation Instructions Source

**CRITICAL**: All installation steps MUST follow the instructions in `README.md` under the "Getting Started" > "Installation" section and subsequent configuration sections. The README is the single source of truth.

Do NOT duplicate steps here. Always read and follow the README.md file for the actual installation procedure.

## Prerequisites

Before starting:
1. Check if Playwright MCP is installed: `claude mcp list | grep playwright`
2. If not installed, run: `claude mcp add playwright npx '@playwright/mcp@latest'`
3. User must have or will create Clerk account
4. User must have or will create Convex account

## User Approvals Required

During installation, the user will need to approve:
- **File Operations**: Editing .env.local multiple times (Edit tool)
- **Bash Commands**: npm install, cp, kill, node commands for secret generation
- **Authentication**: Sign in to Clerk, Convex, and the application when prompted

The skill will request these approvals as needed throughout the installation process.

## Installation Workflow

### Step 1: Ask User for Site Name

Use AskUserQuestion tool to ask:
- Question: "What would you like to name your site?"
- Default option: Use current directory name (extract from `pwd`)
- Example: If current directory is `/Users/name/code/test3`, suggest `test3`

### Step 2: Follow README.md Installation Steps

Read the `README.md` file and execute each step in the "Getting Started" section in order:

1. **Installation** section (steps 1-7)
   - Run npm install
   - Copy .env.example to .env.local
   - Generate CSRF secrets per README instructions
   - Configure environment variables per README order
   - Use the site name from Step 1 for `NEXT_PUBLIC_SITE_NAME`

2. **Clerk Configuration** (README section 3, steps b-c)
   - Navigate to `https://dashboard.clerk.com` (Tab 0)
   - **PROMPT USER**: "I've opened the Clerk dashboard. Please sign in to continue."
   - Wait for user to respond before proceeding
   - Create application with chosen site name
   - Extract and save API keys
   - Create JWT template for Convex
   - Configure paths with localhost:3000
   - **Keep this tab open** - don't close or navigate away

3. **Convex Configuration** (README section 3, step d)
   - Create new tab: `mcp__playwright__browser_tabs` action: "new"
   - Navigate to `https://dashboard.convex.dev` (Tab 1)
   - **PROMPT USER**: "I've opened the Convex dashboard in a new tab. Please sign in to continue."
   - Wait for user to respond before proceeding
   - Create project (suggest using site name or directory name)
   - Extract deployment credentials
   - Configure environment variables as specified in README
   - **Keep this tab open** - don't close or navigate away

4. **Webhook Setup** (README section 5)
   - **Switch to Tab 0** (Clerk): Configure webhook endpoint
     - Navigate to webhooks section in Clerk dashboard
     - Handle iframe interactions for webhook form
     - Extract webhook signing secret
   - **Switch to Tab 1** (Convex): Add webhook secret
     - Navigate to environment variables
     - Add CLERK_WEBHOOK_SECRET
   - Follow README webhook configuration steps exactly

5. **Billing Setup** (README section 7)
   - **Stay on Tab 0** (Clerk Dashboard)
   - Navigate to Billing > Subscription plans
   - Create subscription plan per README
   - Navigate to Billing > Settings
   - Enable billing per README

6. **Deploy and Test** (README Development section)
   - Run `npx convex dev --once` to deploy functions
   - Restart the dev server (kill existing, start new)
   - Test application with Playwright

### Step 3: Comprehensive Testing with Playwright

After installation completes, thoroughly test the application:

**Test 1: Landing Page**
1. Navigate to `http://localhost:3000`
2. Take snapshot and verify:
   - Hero section with site name displays
   - Features section loads
   - Pricing section with CustomClerkPricing component
   - Testimonials section
   - FAQ section
   - Footer

**Test 2: Authentication Flow**
1. Navigate to `http://localhost:3000/dashboard`
2. Verify redirects to Clerk Account Portal sign-in
3. **PROMPT USER**: "The app is redirecting to Clerk for authentication. Please sign in to test the dashboard functionality."
4. Wait for user to respond "ok" or "done"
5. Verify successful redirect back to dashboard
6. Take snapshot and verify:
   - User name and email display correctly
   - Sidebar navigation is present
   - Dashboard metrics and charts load
   - Data tables populate

**Test 3: Protected Route Access**
1. Verify user is authenticated on dashboard
2. Check user profile button shows correct name/email
3. Test navigation between dashboard sections
4. Verify all protected content loads without errors

**Test 4: Payment-Gated Page (Before Subscription)**
1. Click "Payment gated" button in sidebar
2. Navigate to `/dashboard/payment-gated`
3. Take snapshot and verify:
   - "Upgrade to a paid plan" message displays
   - Free plan shows as "Active"
   - Pro plan shows with correct pricing ($9.99/month)
   - "Subscribe" button is present

**Test 5: Subscription Flow**
1. Click "Subscribe" button on Pro plan
2. Verify Clerk Billing checkout modal opens
3. Verify displays:
   - "Checkout" heading
   - Pro plan $9.99 per month
   - Subtotal and Total Due Today
   - "Pay with test card" button (development mode)
4. Click "Pay with test card"
5. Wait for payment processing
6. Verify payment success modal appears with:
   - "Payment was successful!" message
   - Total paid: $9.99
   - Payment method: Visa ⋯ 4242
7. Click "Continue"
8. Verify Pro plan now shows "Active" status

**Test 6: Webhook Verification**
1. Navigate to Convex dashboard: `https://dashboard.convex.dev/t/{team}/{project}/{deployment}/data`
2. Click on `paymentAttempts` table
3. Take snapshot and verify payment record exists with:
   - Status: "paid"
   - Amount: 999 (cents)
   - Payer email matches signed-in user
   - Payment method: visa 4242
   - Payment ID present
4. Click on `users` table
5. Verify user record exists with:
   - Name matches Clerk user
   - External ID matches Clerk user ID
   - Synced via webhook

**Test 7: Post-Payment Access**
1. Navigate back to `http://localhost:3000/dashboard/payment-gated`
2. Refresh page
3. Verify payment-gated content loads (if implemented)
4. OR verify Pro plan still shows as "Active"

**Test 8: Console and Error Check**
1. Use `mcp__playwright__browser_console_messages` with `onlyErrors: true`
2. Verify no critical errors in console
3. Report any CSP warnings (expected for Clerk/Stripe)
4. Confirm no 404s or 500s in network requests

### Step 4: Clean Up

After all testing is complete:
1. **Ask user** if they want to close the browser tabs
2. Use AskUserQuestion: "Would you like me to close the browser tabs (Clerk and Convex dashboards)?"
3. If user says yes: Close all browser tabs with `mcp__playwright__browser_close`
4. If user says no: Leave tabs open for further manual exploration

## Critical Rules

### MUST Follow README Exactly

- **READ** README.md before each phase to get current instructions
- **NEVER** add environment variables not in README.md
- **NEVER** deviate from README step order or content
- **ONLY** use environment variables explicitly listed in README
- If README changes, this skill automatically follows new instructions

### Environment Variables

Only set variables that appear in README.md `.env.local` configuration section.

**DO NOT** add:
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- Any other variables not in README

### Playwright Usage

- Use Playwright MCP for all browser automation
- Use snapshots to get element refs before clicking
- Handle iframes for Clerk webhook configuration
- **Use separate tabs** for Clerk and Convex dashboards:
  - Tab 0: Clerk Dashboard (https://dashboard.clerk.com)
  - Tab 1: Convex Dashboard (https://dashboard.convex.dev)
  - Use `mcp__playwright__browser_tabs` with `action: "new"` to create tabs
  - Use `mcp__playwright__browser_tabs` with `action: "select"` and `index: N` to switch between tabs
  - Keep both tabs open throughout installation to avoid repeated navigation
- Close browser when done

### User Authentication Prompts

**CRITICAL**: When reaching authentication pages, explicitly prompt the user:

**For Clerk Dashboard Sign-In:**
```
I've opened the Clerk dashboard. Please sign in to continue.
I'll wait for you to complete the sign-in process.
```
Then wait for user to respond "ok" or "done" before continuing.

**For Convex Dashboard Sign-In:**
```
I've opened the Convex dashboard. Please sign in to continue.
I'll wait for you to complete the sign-in process.
```
Then wait for user to respond "ok" or "done" before continuing.

**For App Testing Sign-In:**
```
The app is redirecting to Clerk for authentication.
Please sign in to test the dashboard functionality.
I'll wait for you to complete the sign-in.
```
Then wait for user to respond "ok" or "done" before continuing.

**For Subscription Testing:**
```
I'll now test the subscription flow by clicking Subscribe.
The payment modal will open with a test payment option.
```
No wait needed - continue automatically with "Pay with test card".

## Error Handling

If any step fails:
1. Report the error with the README section reference
2. Show what was attempted
3. Suggest checking README.md for updated instructions
4. Allow user to retry or continue manually

## Success Output

When complete, show:

```
🎉 Installation Complete!

Site Name: {user-chosen-name}
Clerk Application: {name}
Convex Project: {name} ({deployment-name})
Development URL: http://localhost:3000

Configuration Summary:
✅ Dependencies installed (npm packages)
✅ Environment variables configured (.env.local)
✅ CSRF secrets generated
✅ Clerk authentication set up
✅ JWT template configured for Convex
✅ Convex backend deployed
✅ Webhooks configured (Clerk → Convex)
✅ Billing enabled with Pro plan ($9.99/month)

Test Results:
✅ Landing page loads successfully
✅ Authentication flow works (Clerk Account Portal)
✅ Dashboard accessible with user data
✅ Protected routes enforce authentication
✅ Payment-gated page shows subscription options
✅ Subscription flow completes successfully
✅ Payment recorded in Convex database
✅ User synced to Convex via webhook
✅ No critical console errors

Next Steps:
- Application is running at http://localhost:3000
- Convex functions are deployed
- Billing is enabled in test mode
- You can now develop and customize
- See README.md for deployment to production
```

## Maintainability

This skill is designed to be **maintenance-free**:
- All actual installation steps are in README.md
- Skill only orchestrates the workflow and automation
- When README updates, skill automatically uses new instructions
- No need to update this skill when installation process changes
