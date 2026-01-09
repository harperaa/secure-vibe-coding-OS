# Secure Vibe Coding OS - More Secure Next.js SaaS Starter Kit

A modern, production-ready and security hardened SaaS starter template for building full-stack applications using Next.js 15, Convex, Clerk, and Clerk Billing. The easiest and most secure way to start accepting payments with beautiful UI and seamless integrations.

[🌐 Live Demo](https://secure-vibe-coding-os.vercel.app/) – Try the app in your browser!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 What This Is

This Secure Vibe Coding OS is part of the [Secure Vibe Coding Masterclass](https://allenharper.com) by [Dr. Allen Harper](https://www.linkedin.com/in/drallenharper/). 

See two sample course modules, in the docs folder.

## Features

- 🚀 **Next.js 15 with App Router** - Latest React framework with server components
- ⚡️ **Turbopack** - Ultra-fast development with hot module replacement
- 🎨 **TailwindCSS v4** - Modern utility-first CSS with custom design system
- 🔐 **Clerk Authentication** - Complete user management with social logins
- 💳 **Clerk Billing** - Integrated subscription management and payments
- 🗄️ **Convex Real-time Database** - Serverless backend with real-time sync
- 🛡️ **Protected Routes** - Authentication-based route protection
- 👑 **Admin Pages** - Environment-based admin role with Security Monitoring dashboard (admin-only access)
- 🔒 **CSRF Protection** - Built-in Cross-Site Request Forgery protection with HMAC-SHA256
- 🔐 **Security Headers** - Automatic security headers (CSP, X-Frame-Options, HSTS)
- 🚦 **Rate Limiting** - IP-based rate limiting (5 requests/minute) to prevent abuse
- ✅ **Input Validation** - Zod-based validation with XSS sanitization
- 🛡️ **Secure Error Handling** - Environment-aware error responses (no data leakage)
- 📊 **Security Monitoring Dashboard** - Admin-only real-time security event tracking with severity levels, event filtering, and comprehensive attack detection
- 💰 **Payment Gating** - Subscription-based content access
- 🎭 **Beautiful 404 Page** - Custom animated error page
- 🌗 **Dark/Light Theme** - System-aware theme switching
- 📱 **Responsive Design** - Mobile-first approach with modern layouts
- ✨ **Custom Animations** - React Bits and Framer Motion effects
- 🧩 **shadcn/ui Components** - Modern component library with Radix UI
- 📊 **Interactive Dashboard** - Complete admin interface with charts
- �� **Webhook Integration** - Automated user and payment sync
- 🚢 **Vercel Ready** - One-click deployment
- 📝 **SEO & LLM SEO Optimized Blog Engine** - Markdown-based blog with AI crawler optimization, llms.txt, sitemap generation, and RSS feed

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and transitions
- **Motion Primitives** - Advanced animation components
- **Lucide React & Tabler Icons** - Beautiful icon libraries
- **Recharts** - Data visualization components
- **React Bits** - Custom animation components

### Backend & Services
- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **Clerk Billing** - Subscription billing and payments
- **Svix** - Webhook handling and validation

### Development & Deployment
- **TypeScript** - Type safety throughout
- **Vercel** - Deployment platform
- **Turbopack** - Fast build tool

## Getting Started

### Prerequisites

- Node.js 18+ 
- Clerk account for authentication and billing
- Convex account for database

### Installation

1. Download and set up the starter template:

```bash
# Download the template files to your project directory
# Then navigate to your project directory and install dependencies
git clone https://github.com/harperaa/secure-vibe-coding-OS.git [project-name]
cd [project-name]
npm install #or pnpm / yarn / bun
```

2. Set up your environment variables:

```bash
cp .env.example .env.local
```

3. Configure your environment variables (complete each step/setting in order in the `.env.local` file ):

```bash
# a. Site Branding (Name your site)
NEXT_PUBLIC_SITE_NAME=YOUR SITE NAME HERE

# b. Clerk Authentication & Billing
# Sign up and get these from your Clerk dashboard at https://dashboard.clerk.com
# Select "Create application", Name it, hit "Create application"
# Then on Overview page > scroll down to "2. Set your Clerk API keys" > copy/paste here.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# c. Setup your JWT template Clerk Frontend API URL in Clerk 
# Dashboard > Configure > JWT Templates > Add new template > select convex from Template dropdown > save
# Copy the URL from the issuer field and paste it here, ensure it ends with .dev
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev

# d. Convex Configuration
# Sign up and get these from your Convex dashboard at https://dashboard.convex.dev
# Create new project, then goto Settings > Project Settings > Lost Access
# Copy/paste/execute command: npx convex dev --configure=existing --team your_team_name --project your_project_name
CONVEX_DEPLOYMENT=your_convex_deployment_here
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud

# e. confirm the above values are updated automatically in .env.local by the convex script.  

# f. Set the Convex Environment variable for NEXT_PUBLIC_CLERK_FRONTEND_API_URL
# Click link in terminal from running convex config, to set the NEXT_PUBLIC_CLERK_FRONTEND_API_URL there.
# Use value from above for NEXT_PUBLIC_CLERK_FRONTEND_API_URL

# g. CSRF Protection
# Generate these secrets using: node -p "require('crypto').randomBytes(32).toString('base64url')"
CSRF_SECRET=<32-byte-base64url-string>
SESSION_SECRET=<32-byte-base64url-string>

# Clerk Redirect URLs (leave these for now)
# These ensure users are redirected to dashboard after authentication
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

4. Terminate and Re-Initialize Convex (leave it running in the background):
```bash
npx convex dev
```

5. Convex Webhook Secret
- Get the site url from your Convex dashboard at https://dashboard.convex.dev
- Select your new project
- > Settings > URL & Deploy Key > Show development credentials > HTTP Actions URL (copy that URL)
- Goto Clerk dashboard > Configure > Webhooks > Add Endpoint > Paste in the above Convex HTTP Actions URL and append endpoint
- ex. {HTTP Actions URL}/clerk-users-webhook
- Search for and enable the following events: 
- Enable events: `user.created`, `user.updated`, `user.deleted`, `paymentAttempt.updated`
- Copy the webhook signing secret to your Convex environment variables
- Note: CLERK_WEBHOOK_SECRET should be set in your Convex dashboard environment variables (not here)

6. Set up Convex environment variables in your Convex dashboard:

```bash
# In Convex Dashboard Environment Variables
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev
ADMIN_EMAIL=your-admin-email@example.com
```

**Note:** The `ADMIN_EMAIL` must match the email address you use to sign up/sign in. Only this user will see the "Administration" section in the sidebar and have access to the Security Monitoring dashboard. If `ADMIN_EMAIL` is not configured, the app will throw an error when accessing admin features.

7. Setup Clerk Subscriptons (Required for template to work)
- Clerk dashboard > Subscriptions > Create a Plan > Add User Plan > Name the plan > Set the Monthly base fee 
- Hit Save button  
- Hit Enable Billing button at top of screen (very important)


### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at `http://localhost:3000`.

## 🧠 Continual Learning System

Secure Vibe Coding OS includes a unique **self-improving learning system** that gets smarter over time as you use it.

### How It Works

The system maintains a dynamic lessons library that captures your real-world experiences:

```
.claude/skills/lessons/
├── implementing-rate-limiting/
│   └── SKILL.md          # What worked, what failed, exact parameters
├── fixing-csrf-validation/
│   └── SKILL.md          # Debugging steps, root causes, solutions
├── optimizing-convex-queries/
│   └── SKILL.md          # Performance learnings, query patterns
└── [your-future-lessons]/
    └── SKILL.md          # Grows with every session
```

### The Learning Loop

**1. Before Starting Work** - Learn from the past
```bash
/advise

# Describe your goal:
> "I need to implement rate limiting on my API endpoints"

# Claude searches past lessons and finds:
# ✅ What worked: withRateLimit HOF pattern
# ❌ What failed: Redis approach (too complex)
# 🔧 Exact params: 5 req/min, IP-based tracking
# 💡 Key insight: Use Map for simple cases
```

**2. During Work** - Apply proven solutions
- Use exact parameters that worked before
- Avoid documented pitfalls from "Failed Attempts" tables
- Build on previous successes instead of starting from scratch

**3. After Completing Work** - Capture your learnings
```bash
/retrospective

# Claude analyzes your session and creates:
# - Detailed documentation of what you accomplished
# - What worked vs. what failed
# - Exact parameters and configurations
# - Lessons learned for next time
# - Creates a PR with your learnings
```

### Why This Matters

**Traditional Development**: Every task starts from zero, same mistakes repeated
```
Task 1: Try A, B, C → C works
Task 2: Try A, B, C → C works again (wasted effort)
Task 3: Try A, B, C → C works again (still wasting time)
```

**With Continual Learning**: Each task makes future tasks faster
```
Task 1: Try A, B, C → C works → Document in lessons
Task 2: Read lesson → Start with C → Success immediately
Task 3: Read lesson → Start with C → Success immediately
```

### Benefits Over Time

**Week 1**: Empty lessons folder, learning as you go
- Complete first API endpoint (took 2 hours, tried 3 approaches)
- Run `/retrospective` to capture learnings

**Week 2**: Start building lessons library
- Need second API endpoint
- Run `/advise` - finds lesson from Week 1
- Complete in 30 minutes using proven pattern

**Week 4**: Lessons compound
- 5+ documented lessons from various tasks
- Most new work has relevant past experience
- Development speed increases 3-5x on similar tasks
- Team members learn from your documented experiences

**Month 3**: Institutional knowledge base
- 20+ real-world lessons from actual production work
- Exact parameters for common tasks
- Documented pitfalls and how to avoid them
- New team members onboard faster by reading lessons

### Example Lessons

**lessons/implementing-rate-limiting/SKILL.md**:
```markdown
## Failed Attempts ❌
| Attempt | What We Tried | Why It Failed | Lesson Learned |
|---------|---------------|---------------|----------------|
| 1 | Redis-based rate limiter | Too complex for use case | Start simple, add complexity only if needed |
| 2 | Cookie-based tracking | Easily bypassed | Use IP-based for public endpoints |

## What Worked ✅
- withRateLimit HOF with Map-based tracking
- Parameters: limitWindow: 60000, maxRequests: 5
- IP extraction from x-forwarded-for header
```

**lessons/debugging-clerk-webhooks/SKILL.md**:
```markdown
## Root Cause
Webhook secret was set in .env.local instead of Convex dashboard

## Solution
1. Remove CLERK_WEBHOOK_SECRET from .env.local
2. Add to Convex Dashboard → Settings → Environment Variables
3. Restart Convex dev server

## Time Saved Next Time
Original debugging: 3 hours
With this lesson: 5 minutes
```

### Best Practices for Maximum Learning

**1. Run `/advise` before every non-trivial task**
- Search lessons for similar past work
- Read relevant SKILL.md files
- Start with proven approaches

**2. Run `/retrospective` after completing work**
- Especially after solving difficult problems
- Always after trying multiple approaches
- Document exact parameters that worked

**3. Be specific in lessons**
- Include exact error messages encountered
- Document specific version numbers
- Provide copy-paste ready code examples
- No vague advice - only concrete specifics

**4. Share lessons with your team**
- Lessons are stored in git
- PRs document decision-making process
- Team members review and learn from each other
- Collective knowledge compounds faster

### Integration with Security Skills

The continual learning system complements the built-in security skills:

**Security Skills** (`.claude/skills/security/`):
- Pre-built best practices and patterns
- General security implementation guides
- Updated by package maintainers

**Your Lessons** (`.claude/skills/lessons/`):
- YOUR specific experiences applying those patterns
- YOUR project's unique challenges and solutions
- YOUR team's specific parameters and configurations
- Updated by YOU as you work

Together, they create a complete knowledge system:
- Start with security best practices
- Learn from your specific implementations
- Build institutional knowledge over time
- Never repeat the same mistake twice

### Getting Started with Continual Learning

**Day 1**: Just use the system normally
- Complete your tasks as you normally would
- Run `/retrospective` at end of day to capture learnings

**Day 7**: Start seeing benefits
- Run `/advise` before starting similar tasks
- Notice faster completion times on repeated work

**Day 30**: System is significantly smarter
- Substantial lessons library built up
- Most tasks have relevant past experience
- Development velocity noticeably increased

**Day 90**: Institutional knowledge established
- Comprehensive coverage of common tasks
- New team members leverage your experience
- Complex tasks completed in fraction of original time

---

**Remember**: Every session you complete makes the NEXT session faster. The system literally gets smarter the more you use it. 🚀

## Security Configuration

### CSRF Protection

This application includes built-in CSRF (Cross-Site Request Forgery) protection for all state-changing operations. To enable CSRF protection, you need to configure two secret keys:

1. **Generate CSRF secrets:**

```bash
# Generate CSRF_SECRET
node -p "require('crypto').randomBytes(32).toString('base64url')"

# Generate SESSION_SECRET
node -p "require('crypto').randomBytes(32).toString('base64url')"
```

2. **Add to `.env.local`:**

```bash
CSRF_SECRET=your_generated_csrf_secret_here
SESSION_SECRET=your_generated_session_secret_here
```

### How CSRF Protection Works

- CSRF tokens are automatically generated and bound to user sessions using HMAC-SHA256
- Tokens are stored in HTTP-only, SameSite=Strict cookies (`XSRF-TOKEN`)
- Frontend applications should fetch tokens from `/api/csrf` before making POST requests
- Tokens are single-use and cleared after validation

### Using CSRF Protection in Your API Routes

To protect an API route with CSRF validation:

```typescript
import { withCsrf } from '@/lib/withCsrf';
import { NextRequest, NextResponse } from 'next/server';

async function myProtectedHandler(request: NextRequest) {
  // Your API logic here
  return NextResponse.json({ success: true });
}

// Wrap your handler with withCsrf
export const POST = withCsrf(myProtectedHandler);
```

### Frontend Usage

```typescript
// Fetch CSRF token
const response = await fetch('/api/csrf', { credentials: 'include' });
const { csrfToken } = await response.json();

// Use token in POST request
await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

### Rate Limiting

The application includes built-in rate limiting to protect against brute force attacks and abuse. Rate limiting is configured per IP address:

- **Limit**: 5 requests per minute per IP address
- **Response**: HTTP 429 (Too Many Requests) when limit exceeded

#### Using Rate Limiting in Your API Routes

To protect an API route with rate limiting:

```typescript
import { withRateLimit } from '@/lib/withRateLimit';
import { NextRequest, NextResponse } from 'next/server';

async function sensitiveHandler(request: NextRequest) {
  // Your API logic here
  return NextResponse.json({ success: true });
}

// Wrap your handler with withRateLimit
export const POST = withRateLimit(sensitiveHandler);
```

#### Combining Rate Limiting with CSRF Protection

For maximum security, you can combine both protections:

```typescript
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { NextRequest, NextResponse } from 'next/server';

async function protectedHandler(request: NextRequest) {
  // Your API logic here
  return NextResponse.json({ success: true });
}

// Apply both rate limiting and CSRF protection
export const POST = withRateLimit(withCsrf(protectedHandler));
```

**Note**: Rate limiting tracks by IP address using the `x-forwarded-for` header (for proxies/load balancers) or `x-real-ip` as fallback.

#### Testing Rate Limiting

A test script is provided to verify rate limiting is working correctly on your protected endpoints:

```bash
# Test the default test endpoint (uses port 3000)
node scripts/test-rate-limit.js

# Specify a custom port if your dev server runs on a different port
node scripts/test-rate-limit.js --port=3003

# Test your custom protected endpoint
node scripts/test-rate-limit.js /api/your-custom-route
```

**Expected Results:**
- First 5 requests: HTTP 200 (Success)
- Requests 6-10: HTTP 429 (Rate Limited)

The script will display color-coded results showing which requests succeeded and which were rate limited. Wait 60 seconds between test runs for the rate limit to reset.

### Input Validation & XSS Prevention

The application uses Zod schemas for type-safe input validation and XSS prevention. All user input is validated and sanitized before processing.

#### XSS Sanitization

User input is automatically sanitized to prevent Cross-Site Scripting (XSS) attacks by removing dangerous characters:

- **Removed**: `<` `>` `"` `&`
- **Preserved**: `'` (apostrophes for names like O'Neal, D'Angelo, etc.)

**Note**: React automatically escapes JSX output, so this is defense-in-depth protection.

#### Using Validation Schemas

Import pre-built schemas from `@/lib/validation`:

```typescript
import {
  emailSchema,
  safeTextSchema,
  safeLongTextSchema,
  createPostSchema
} from '@/lib/validation';
```

#### Example: Validated API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { validateRequest } from '@/lib/validateRequest';
import { createPostSchema } from '@/lib/validation';

async function createPostHandler(request: NextRequest) {
  const body = await request.json();

  // Validate and sanitize input
  const validation = validateRequest(createPostSchema, body);

  if (!validation.success) {
    return validation.response; // Returns 400 with error details
  }

  // validation.data is type-safe and XSS-sanitized
  const { title, content, tags } = validation.data;

  // Save to database (data is already sanitized)
  // ...

  return NextResponse.json({ success: true });
}

// Apply all security layers
export const POST = withRateLimit(withCsrf(createPostHandler));
```

#### Available Schemas

- **`emailSchema`** - Email validation with sanitization
- **`safeTextSchema`** - Short text (max 100 chars)
- **`safeLongTextSchema`** - Long text (max 5000 chars)
- **`usernameSchema`** - Alphanumeric usernames
- **`urlSchema`** - HTTPS URLs only
- **`contactFormSchema`** - Complete contact form
- **`createPostSchema`** - User-generated content
- **`updateProfileSchema`** - Profile updates

See `lib/validation.ts` for all available schemas and create custom ones as needed.

#### Example: Convex Mutation with Validation

```typescript
// convex/posts.ts
import { mutation } from "./_generated/server";
import { createPostSchema } from "../lib/validation";

export const createPost = mutation({
  handler: async (ctx, args) => {
    const validation = createPostSchema.safeParse(args);

    if (!validation.success) {
      throw new Error("Invalid input");
    }

    // validation.data is sanitized
    await ctx.db.insert("posts", validation.data);
  }
});
```

### Additional Security Headers

The application automatically sets the following security headers on all responses:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `Content-Security-Policy` - Controls resource loading
- `X-Robots-Tag: noindex, nofollow` - Prevents indexing of protected routes
- `Strict-Transport-Security` - Forces HTTPS in production (HSTS)

### Secure Error Handling

The application includes secure error handling to prevent information leakage:

- **Development**: Full error details and stack traces for debugging
- **Production**: Generic error messages, no internal details exposed

#### Using Error Handlers

Import error handlers from `@/lib/errorHandler`:

```typescript
import {
  handleApiError,
  handleValidationError,
  handleForbiddenError,
  handleUnauthorizedError,
  handleNotFoundError
} from '@/lib/errorHandler';

async function myApiHandler(request: NextRequest) {
  try {
    // Your API logic here
    const result = await performOperation();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    // Secure error handling (hides stack traces in production)
    return handleApiError(error, 'my-api-route');
  }
}
```

**Available Error Handlers:**
- `handleApiError(error, context)` - HTTP 500 for unexpected errors
- `handleValidationError(message, details)` - HTTP 400 for validation failures
- `handleForbiddenError(message)` - HTTP 403 for authorization failures
- `handleUnauthorizedError(message)` - HTTP 401 for authentication failures
- `handleNotFoundError(resource)` - HTTP 404 for missing resources

### Security Monitoring Dashboard

The application includes a comprehensive real-time security monitoring dashboard accessible at `/dashboard/security`. This feature provides visibility into all security events across your application with advanced filtering and analysis capabilities.

**Admin Only:** The Security Monitoring dashboard is only accessible to the admin user (configured via `ADMIN_EMAIL` environment variable in Convex dashboard). Admin users see an "Administration" section in the sidebar containing the Security Monitoring link. Non-admin users will not see this section and will receive an "Access Denied" message if they navigate directly to `/dashboard/security`.

#### Key Features

- **Real-time Event Tracking** - Monitor security events as they happen
- **Severity Classification** - Events categorized as Critical, High, Medium, or Low
- **Event Type Filtering** - Filter by specific attack types (rate limiting, CSRF, XSS, prompt injection, etc.)
- **Date Range Selection** - View events from last 24 hours, 7 days, 30 days, or custom ranges
- **Status Management** - Track open (unread) vs closed (read) events
- **Detailed Event Metadata** - View origin, IP address, fingerprint, endpoint, and error details
- **Attack Detection** - Automatic detection of 19+ attack types including:
  - Origin mismatch
  - Rate limit exceeded
  - CSRF validation failed
  - XSS attempts
  - Prompt injection attempts
  - JWT validation failures
  - Fingerprint manipulation
  - Unauthorized access
  - And more...

#### Accessing the Dashboard

1. Ensure `ADMIN_EMAIL` is set in your Convex dashboard environment variables
2. Sign in with the email address matching `ADMIN_EMAIL`
3. Navigate to the "Security Monitoring" link in the "Administration" section of the sidebar

#### Logging Security Events

Security events are automatically logged when using the built-in security middlewares (`withRateLimit`, `withCsrf`, etc.). You can also manually log events using the security logger:

```typescript
import { logSecurity } from '@/convex/lib/securityLogger';

// In a Convex mutation
await logSecurity(
  ctx,
  projectId,
  "xss_attempt",
  "high",
  {
    endpoint: "/api/submit",
    ipAddress: request.headers.get('x-forwarded-for'),
    errorMessage: "XSS pattern detected in user input",
    requestPayload: JSON.stringify(body)
  }
);
```

#### Testing Security Events

Security events are automatically logged when violations occur in the real middleware. The easiest way to test is to trigger actual rate limit violations.

**Testing Rate Limiting (Recommended):**

```bash
# Start the dev server first
npm run dev

# Run the rate limit test script
node scripts/test-rate-limit.js

# Specify a custom port (default is 3000)
node scripts/test-rate-limit.js --port=3001
```

**What happens:**
1. The script sends 10 rapid requests to `/api/test-rate-limit`
2. First 5 requests succeed (HTTP 200)
3. Remaining 5 requests are rate-limited (HTTP 429)
4. Each rate limit violation is logged to the security dashboard
5. Events appear in `/dashboard/security` with type `rate_limit_exceeded`

**Viewing Security Events:**
1. Sign in to the application
2. Navigate to `/dashboard/security`
3. View logged rate limit violations and other security events
4. Filter by severity, event type, or date range

**Note:** Events are logged automatically by the middleware - no manual logging required.

#### Event Types

The dashboard tracks the following security event types:

- `origin_mismatch` - Request from unauthorized origin
- `rate_limit_exceeded` - Too many requests from single IP
- `invalid_api_key` - Invalid API key provided
- `fingerprint_change` - Browser fingerprint changed mid-session
- `suspicious_activity` - Anomaly detection triggered
- `jwt_validation_failed` - JWT token validation error
- `unauthorized_access` - Access to protected resource without auth
- `input_validation_failed` - Input validation rejected malicious data
- `replay_detected` - Replay attack detected
- `csrf_validation_failed` - CSRF token validation failed
- `xss_attempt` - Cross-site scripting attempt detected
- `prompt_injection_attempt` - AI prompt injection detected
- `fingerprint_manipulation` - Browser fingerprint tampering
- `http_origin_blocked` - Blocked origin in HTTP request
- And more...

#### Dashboard Views

**Summary Cards:**
- Total Events - Overview of all security events
- Critical Events - Immediate action required
- High Events - Authentication failures
- Medium Events - Rate limiting violations
- Low Events - Informational events
- Overall Status - Current security posture

**Event Feed:**
- Chronological list of security events
- Expandable details for each event
- Request payload viewing
- Mark as read/unread functionality
- End-user information when available

### Security Auditing

#### Running Security Checks

Use the provided script to audit dependencies and check for vulnerabilities:

```bash
# Run comprehensive security check
bash scripts/security-check.sh

# Or manually:
npm audit --production
npm outdated
```

#### Fixing Vulnerabilities

```bash
# Automatic fixes (minor/patch updates)
npm audit fix

# Force major version updates (review breaking changes!)
npm audit fix --force
```

**Recommendation**: Run `npm audit` regularly and before deploying to production.

## Architecture

## Security Skills

Security architecture is implemented through specialized Claude Code skills managed as a separate package:

- **Package**: [secure-claude-skills](https://github.com/harperaa/secure-claude-skills)
- **npm**: `npx secure-claude-skills init`
- **Location**: `.claude/skills/security/` (managed as git subtree)

The skills are synchronized with the main package using git subtree. To update:

\`\`\`bash
git subtree pull --prefix=.claude/skills/security \\
  https://github.com/harperaa/secure-claude-skills.git main --squash
\`\`\`
```

## 🔄 Keeping Your OS Updated

Secure Vibe Coding OS is a **living template** that receives regular updates including:
- 🛡️ New security features and hardening improvements
- 📚 Additional course modules and learning materials
- 🔧 Enhanced Claude Code commands and agents
- 🐛 Bug fixes and dependency updates
- ⚡ Performance optimizations

### Update Commands Overview

The template includes specialized pull commands to help you selectively update different parts of your installation:

| Command | Updates | Safety Level | Use When |
|---------|---------|--------------|----------|
| `/pull-repo-safe` | Entire repository | ✅ Safe (preview first) | General updates to core template |
| `/pull-security-skills` | Security skills only | ✅ Safe (merge with squash) | Security feature updates |
| `/pull-commands` | Claude commands only | ⚠️ Force overwrites | Command updates only |
| `/pull-agents` | Claude agents only | ⚠️ Force overwrites | Agent updates only |

### How to Update

#### Option 1: Safe Full Update (Recommended)

Use this when you've customized your app and want to safely merge template updates:

```bash
# From your project root, use the Claude Code command:
/pull-repo-safe
```

**What happens:**
1. Fetches latest changes from the main repository
2. Shows you exactly what changed (file-by-file diff)
3. Detects if you have uncommitted local changes
4. Provides step-by-step merge instructions
5. Lets you decide what to merge

**Example workflow:**
```bash
# Step 1: Check for updates
/pull-repo-safe

# Step 2: Review the changes shown
# Read the diffs carefully

# Step 3: Commit your local changes
git add . && git commit -m 'Save my customizations'

# Step 4: Merge the updates
git merge origin/main

# Step 5: Resolve any conflicts (if they occur)
# - Edit conflicted files
# - git add <resolved-files>
# - git commit -m 'Merge template updates'
```

💡 **Let Claude Code help you merge:**
```
Ask Claude: "Commit my current changes, then merge the updates from origin/main,
resolving any conflicts while preserving my customizations"
```

#### Option 2: Update Security Skills Only

Security skills are updated frequently with new security patterns and best practices:

```bash
/pull-security-skills
```

**What happens:**
1. Checks for local changes in `.claude/skills/security/`
2. Shows you what you've modified (if anything)
3. Pulls latest security skills using git subtree
4. Merges changes with `--squash` flag (keeps history clean)

**If conflicts occur:**
```bash
# Manual resolution:
git status                                    # See conflicted files
# Edit files to resolve conflicts
git add .                                     # Stage resolved files
git commit -m 'Merge security skills updates' # Complete the merge

# Or ask Claude Code:
"Review the merge conflicts and resolve them intelligently,
preserving my customizations while integrating new features"
```

#### Option 3: Update Commands Only

Use this to get the latest Claude Code commands without touching your app code:

```bash
/pull-commands
```

**⚠️ Warning:** This will overwrite any local changes in `.claude/commands/`

**What happens:**
1. Checks for uncommitted changes in `.claude/commands/`
2. Shows you what you've modified
3. Warns that continuing will overwrite your changes
4. Gives you a chance to cancel (Ctrl+C)
5. Force pulls latest commands from origin/main

**After successful update:**
```bash
git commit -m "Update Claude Code commands from template"

# Or ask Claude Code:
"Review the updated commands and commit them with a descriptive message"
```

#### Option 4: Update Agents Only

Get the latest Claude Code agents without touching anything else:

```bash
/pull-agents
```

**⚠️ Warning:** This will overwrite any local changes in `.claude/agents/`

**What happens:**
Same as `/pull-commands` but for the `.claude/agents/` folder.

### Best Practices for Updating

#### 1. **Commit Before Updating**
Always commit your work before pulling updates:
```bash
git add .
git commit -m "Save my current work before updating"
```

#### 2. **Use Safe Updates for Customized Code**
If you've modified app pages, components, or core functionality:
- ✅ Use `/pull-repo-safe` to preview changes
- ❌ Don't use force update commands

#### 3. **Review Changes Before Merging**
Take time to read the diffs shown by `/pull-repo-safe`:
- Understand what's changing
- Identify potential conflicts with your customizations
- Decide what to merge and what to skip

#### 4. **Update Frequently**
- Check for updates weekly or monthly
- Smaller, frequent updates are easier to merge than large infrequent ones
- Security updates should be applied promptly

#### 5. **Test After Updates**
After merging updates:
```bash
# Reinstall dependencies (if package.json changed)
npm install

# Run type checking
npm run tsc --noEmit

# Test your app locally
npm run dev

# Visit key pages and test functionality
```

#### 6. **Use Version Tags**
Instead of always pulling from `main`, you can pull specific releases:
```bash
git fetch --tags
git merge v2.0.0  # Merge a specific version
```

### Handling Merge Conflicts

When conflicts occur, you have options:

#### Manual Resolution
```bash
# 1. See conflicted files
git status

# 2. Open each file and look for conflict markers:
<<<<<<< HEAD
Your customizations
=======
Template updates
>>>>>>> origin/main

# 3. Edit to keep what you want
# 4. Remove conflict markers
# 5. Save the file
# 6. Stage resolved files
git add <resolved-file>

# 7. Complete the merge
git commit -m "Merge template updates"
```

#### Claude Code Assisted Resolution

Ask Claude Code to help:
```
"Review the merge conflicts and resolve them intelligently,
preserving my customizations while integrating new features"
```

Or:
```
"Help me merge the security skills updates"
```

Claude Code can:
- Analyze both versions
- Understand intent
- Preserve your customizations
- Integrate new features
- Resolve conflicts intelligently

### What Gets Updated

#### Core Files (Use `/pull-repo-safe`)
- `app/` - Application pages and routes
- `components/` - UI components
- `lib/` - Utility libraries
- `convex/` - Backend functions and schema
- `package.json` - Dependencies

#### Security Skills (Use `/pull-security-skills`)
- `.claude/skills/security/` - All security implementation guides
- New security patterns and best practices
- Updated vulnerability awareness content

#### Commands (Use `/pull-commands`)
- `.claude/commands/` - Claude Code command definitions
- Automation scripts and workflows

#### Agents (Use `/pull-agents`)
- `.claude/agents/` - Specialized Claude Code agents
- Task automation configurations

### Selective Updates Strategy

You don't have to update everything:

**Conservative approach:**
```bash
# Only update what you need
/pull-security-skills  # Get security updates (important!)
/pull-commands         # Get new commands (optional)
# Skip core template updates if you've heavily customized
```

**Aggressive approach:**
```bash
# Stay current with everything
/pull-repo-safe        # Review and merge all updates
# Follow prompts to merge
```

**Smart approach:**
```bash
# Update frequently used parts, cherry-pick core updates
/pull-security-skills  # Security is critical
/pull-commands         # Commands are easy to update
/pull-agents           # Agents enhance productivity

# For core template:
/pull-repo-safe        # Preview changes
# Cherry-pick specific features you want:
git cherry-pick <commit-hash>
```

### Update Checklist

Before deploying updated code to production:

- [ ] All updates committed locally
- [ ] `npm install` completed successfully
- [ ] `npm run tsc --noEmit` passes without errors
- [ ] App runs locally without errors (`npm run dev`)
- [ ] Key features tested manually
- [ ] Security updates applied (if any)
- [ ] Environment variables still correct
- [ ] No secrets committed to git

### Key Routes
- `/` - Beautiful landing page with pricing
- `/dashboard` - Protected user dashboard
- `/dashboard/payment-gated` - Subscription-protected content
- `/clerk-users-webhook` - Clerk webhook handler

### Authentication Flow
- Seamless sign-up/sign-in with Clerk
- Automatic user sync to Convex database
- Protected routes with middleware
- Social login support
- Automatic redirects to dashboard after auth

### Payment Flow
- Custom Clerk pricing table component
- Subscription-based access control
- Real-time payment status updates
- Webhook-driven payment tracking

### Database Schema
```typescript
// Users table
users: {
  name: string,
  externalId: string // Clerk user ID
}

// Payment attempts tracking
paymentAttempts: {
  payment_id: string,
  userId: Id<"users">,
  payer: { user_id: string },
  // ... additional payment data
}
```

## Project Structure

```
├── app/
│   ├── (landing)/          # Landing page components
│   │   ├── hero-section.tsx
│   │   ├── features-one.tsx
│   │   ├── pricing.tsx
│   │   └── ...
│   ├── dashboard/          # Protected dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── payment-gated/
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── not-found.tsx       # Custom 404 page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── custom-clerk-pricing.tsx
│   ├── theme-provider.tsx
│   └── ...
├── convex/                 # Backend functions
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User management
│   ├── paymentAttempts.ts  # Payment tracking
│   └── http.ts             # Webhook handlers
├── lib/
│   └── utils.ts            # Utility functions
└── middleware.ts           # Route protection
```

## Key Components

### Landing Page
- **Hero Section** - Animated hero with CTAs
- **Features Section** - Interactive feature showcase
- **Pricing Table** - Custom Clerk billing integration
- **Testimonials** - Social proof section
- **FAQ Section** - Common questions
- **Footer** - Links and information

### Dashboard
- **Sidebar Navigation** - Collapsible sidebar with user menu
- **Interactive Charts** - Data visualization with Recharts
- **Data Tables** - Sortable and filterable tables
- **Payment Gating** - Subscription-based access control

### Animations & Effects
- **Splash Cursor** - Interactive cursor effects
- **Animated Lists** - Smooth list animations
- **Progressive Blur** - Modern blur effects
- **Infinite Slider** - Continuous scrolling elements

## Theme Customization

The starter kit includes a fully customizable theme system. You can customize colors, typography, and components using:

- **Theme Tools**: [tweakcn.com](https://tweakcn.com/editor/theme?tab=typography), [themux.vercel.app](https://themux.vercel.app/shadcn-themes), or [ui.jln.dev](https://ui.jln.dev/)
- **Global CSS**: Modify `app/globals.css` for custom styling
- **Component Themes**: Update individual component styles in `components/ui/`

## Environment Variables

### Required for .env.local

- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex client URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` - Clerk frontend API URL (from JWT template)
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` - Redirect after sign in
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` - Redirect after sign up
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` - Fallback redirect for sign in
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` - Fallback redirect for sign up

### Required for Convex Dashboard

- `CLERK_WEBHOOK_SECRET` - Clerk webhook secret (set in Convex dashboard)
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` - Clerk frontend API URL (set in Convex dashboard)
- `ADMIN_EMAIL` - Email address of the admin user who can access Security Monitoring dashboard

## Deployment

### Vercel Deployment (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The project is optimized for Vercel with:
- Automatic builds with Turbopack
- Environment variable management
- Edge function support

### Manual Deployment

Build for production:

```bash
npm run build
npm start
```

## Customization

### Styling
- Modify `app/globals.css` for global styles
- Update TailwindCSS configuration
- Customize component themes in `components/ui/`

### Branding
- Update logo in `components/logo.tsx`
- Modify metadata in `app/layout.tsx`
- Customize color scheme in CSS variables

### Features
- Add new dashboard pages in `app/dashboard/`
- Extend database schema in `convex/schema.ts`
- Create custom components in `components/`

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run generate:sitemap` - Generate sitemap.xml and robots.txt

## Blog

The starter kit includes a full-featured, SEO and LLM-optimized blog engine built for maximum discoverability by both search engines and AI crawlers like ChatGPT, Claude, and Perplexity.

### Blog Content Location

Blog posts are stored as Markdown/MDX files in:

```
/content/blog/
├── your-first-post.mdx
├── another-post.mdx
└── ...
```

### Creating a New Blog Post

Create a new `.mdx` file in `/content/blog/` with the following frontmatter:

```markdown
---
title: "Your Post Title"
description: "A clear, concise description for SEO (150-160 characters)"
date: "2026-01-08"
author: "Your Name"
category: "Security"
tags: ["tag1", "tag2", "tag3"]
image: "/blog/images/your-image.png"
---

## Summary

A 2-3 sentence summary of your article. LLMs extract this first, so make it count.

## Your Content Here

Write your content using standard Markdown syntax...
```

### Blog Features

- **Static Site Generation (SSG)** - All posts pre-rendered at build time for fast loading
- **Full-text Search** - Client-side search across all posts
- **Categories & Tags** - Filter posts by category or tag
- **Table of Contents** - Auto-generated from headings with scroll tracking
- **Related Posts** - Automatically suggests related articles
- **Reading Time** - Estimated reading time for each post
- **Social Sharing** - Twitter, LinkedIn, and copy link buttons
- **RSS Feed** - Available at `/feed.xml`
- **Dark Mode** - Full dark mode support with prose styling

### LLM SEO Optimization

The blog is optimized for AI crawlers with:

| File | Purpose |
|------|---------|
| `/public/llms.txt` | Guides AI crawlers to your most important content |
| `/public/sitemap.xml` | Auto-generated sitemap with all blog URLs |
| `/public/robots.txt` | Explicitly allows GPTBot, ClaudeBot, PerplexityBot |
| `/feed.xml` | RSS feed for content syndication |

**Key optimizations:**
- Server-side rendered content (AI crawlers don't execute JavaScript)
- JSON-LD structured data (TechArticle schema) on every post
- Clear heading hierarchy (H1 → H2 → H3)
- Summary sections for easy LLM extraction
- Consistent terminology for strong embeddings

### Generating the Sitemap

The sitemap is automatically generated before each build via the `prebuild` script. You can also generate it manually:

```bash
npm run generate:sitemap
```

This creates:
- `/public/sitemap.xml` - All blog posts, categories, and tags
- `/public/robots.txt` - AI crawler permissions (if not exists)

### Adding Blog Images

Store blog images in `/public/blog/images/` and reference them in your frontmatter:

```yaml
image: "/blog/images/my-post-image.png"
```

### Environment Variables for Blog

Set your site URL for proper sitemap and meta tag generation:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Production Deployment

> **📘 For detailed deployment strategies, 3-environment setups, staging workflows, and advanced deployment patterns, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Understanding Development vs Production Instances

This application uses **separate instances** for development and production. Both can run simultaneously without interfering with each other.

#### Instance Separation

**Clerk:** Has separate Development and Production instances
```
Your Application in Clerk Dashboard
  ├─ Development Instance
  │  ├─ Keys: pk_test_..., sk_test_...
  │  ├─ Users: Test users
  │  └─ Stripe: Test mode
  │
  └─ Production Instance
     ├─ Keys: pk_live_..., sk_live_...
     ├─ Users: Real users
     └─ Stripe: Live mode
```

**Convex:** Has separate Development and Production deployments
```
Your Project in Convex Dashboard
  ├─ dev:your-deployment-name
  │  ├─ URL: https://....convex.cloud
  │  └─ Database: Dev data
  │
  └─ prod:your-deployment-name
     ├─ URL: https://....convex.site
     └─ Database: Prod data
```

#### How Instances Are Selected

**Your application connects to different instances based on environment variables:**

**Local Development (.env.local):**
```bash
# Points to DEV instances
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CONVEX_DEPLOYMENT=dev:polite-bulldog-532
NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
```

**Production (Vercel Environment Variables):**
```bash
# Points to PROD instances
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://....convex.site
```

### Setting Up Production (Step-by-Step Walkthrough)

Follow this complete guide to deploy your application to production with Clerk, Convex, and Vercel.

---

#### Part 1: Create Clerk Production Instance

**Step 1: Create Production Instance**

1. Go to **Clerk Dashboard:** https://dashboard.clerk.com
2. **Select your application** (the one you created for development)
3. **Top of page:** Click the **"Development"** toggle/dropdown (top right corner)
4. **Click:** "Create production instance"
5. **Choose:**
   - **"Clone development settings"** (recommended - copies your dev config), OR
   - **"Use default settings"** (start fresh)
6. **Click:** "Create"

Clerk creates a separate production instance alongside your dev instance (dev instance is NOT removed).

**Step 2: Get Production API Keys**

1. **Ensure you're viewing Production** (top toggle should say "Production")
2. **Left sidebar:** Click **"API Keys"**
3. **Copy and save these keys:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)
   - Frontend API URL (e.g., `https://your-prod.clerk.accounts.dev`)

You'll add these to Vercel later.

**Step 3: Configure Production Domain**

1. **Left sidebar:** Click **"Domains"**
2. **Add your production domain:**
   - For Vercel: `your-app.vercel.app` (DNS automatic)
   - For custom domain: Add domain and configure DNS records shown
3. **Wait for DNS propagation** (if custom domain - can take up to 48 hours)

**Step 4: Configure OAuth Providers (If Using Social Login)**

1. **Left sidebar:** Click **"SSO Connections"** or **"Social Connections"**
2. **For each provider you use** (Google, GitHub, etc.):
   - Click the provider
   - **Important:** Production requires YOUR OWN OAuth credentials
   - Click "Use custom credentials"
   - Follow Clerk's provider-specific guide to create OAuth app
   - Add Client ID and Client Secret from the provider
   - Save

**Note:** Development uses Clerk's shared credentials, but production requires your own for security.

**Step 5: Connect Stripe**

1. **Left sidebar:** Click **"Billing"** → **"Settings"**
2. **Click:** "Connect Stripe Account"
3. **Choose:**
   - Connect existing Stripe account (if you have one), OR
   - Create new Stripe account through Clerk
4. **Follow Stripe connection flow**
5. **Important:** Start in **Stripe Test Mode** (toggle at top of Billing page)

**Step 6: Deploy Certificates**

1. **Go to Clerk Dashboard home page**
2. **Review checklist** - it shows remaining steps
3. **Once all green checkmarks appear:**
   - Click **"Deploy certificates"** button
   - This activates your production instance

**✅ Clerk Production Instance is now active!**

---

#### Part 2: Create Convex Production Deployment

**Step 1: Generate Production Deploy Key**

1. **Go to Convex Dashboard:** https://dashboard.convex.dev
2. **Select your project**
3. **Left sidebar:** Click **"Settings"** → **"Deploy Keys"**
4. **Click:** "Generate a production deploy key"
5. **Copy the entire key** (format: `prod:xxx|yyy...`)
6. **Save it securely** - you'll add this to Vercel

**Important:** This key is shown only once. If you lose it, you'll need to generate a new one.

**Step 2: Note Your Convex Project Info**

You'll need:
- Production deployment name (will be `prod:your-deployment-name`)
- Production URL (will be created on first deploy, ends with `.convex.site`)

These will be auto-configured by Vercel during deployment.

---

#### Part 3: Configure Vercel for Production

**Step 1: Create Vercel Project**

1. **Go to:** https://vercel.com
2. **Click:** "Add New Project"
3. **Import your GitHub repository:** `harperaa/secure-vibe-coding-OS`
4. **Click:** "Import"

**Step 2: Configure Build Settings**

**In Vercel project configuration (before first deploy):**

1. **Build Command** - Override to:
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```

2. **Install Command** - Leave as default:
   ```bash
   npm install
   ```

3. **Output Directory** - Leave as default:
   ```
   .next
   ```

4. **Root Directory** - Leave as default (blank)

**Step 3: Add Production Environment Variables**

**In Vercel → Settings → Environment Variables:**

**For each variable below, select "Production" environment:**

```bash
# Convex Production Deploy Key (CRITICAL - from Part 2, Step 1)
CONVEX_DEPLOY_KEY=prod:abc123|xyz...

# Clerk Production Keys (from Part 1, Step 2)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-prod.clerk.accounts.dev

# Site Branding
NEXT_PUBLIC_SITE_NAME=Secure Vibe Coding OS

# CSRF Protection (use SAME values from your .env.local)
CSRF_SECRET=<copy-from-your-dev-env>
SESSION_SECRET=<copy-from-your-dev-env>

# Clerk Redirects (same as dev)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

**Important:**
- Do NOT add `CONVEX_DEPLOYMENT` or `NEXT_PUBLIC_CONVEX_URL` manually
- Convex automatically sets these during the deploy process
- Only add `CONVEX_DEPLOY_KEY` - the rest is automatic

**Step 4: Deploy to Production**

1. **Click:** "Deploy" button
2. **Watch the deployment logs:**
   - Convex will deploy your functions
   - Create production deployment (if first time)
   - Build your Next.js app
   - Deploy to Vercel

3. **After successful deploy:**
   - Note your production URL: `https://your-app.vercel.app`
   - Visit the URL to verify it's working

4. **Go to Convex Dashboard:**
   - You'll now see a **`prod:your-deployment-name`** deployment
   - Click it and copy the production URL (ends with `.convex.site`)
   - You'll need this for webhooks in the next part

---

#### Part 4: Configure Production Webhooks

**Step 1: Set Up Clerk Production Webhook**

1. **Clerk Dashboard** → Ensure in **Production** mode (top toggle)
2. **Left sidebar:** Click **"Webhooks"**
3. **Click:** "Add Endpoint"
4. **Endpoint URL** - Enter your Convex production URL + endpoint:
   ```
   https://your-prod-deployment.convex.site/clerk-users-webhook
   ```
5. **Subscribe to events** - Check these:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `paymentAttempt.updated`
6. **Click:** "Create"
7. **Copy the signing secret** (starts with `whsec_...`)

**Step 2: Add Webhook Secret to Convex Production**

1. **Convex Dashboard** → Select your **production deployment** (prod:...)
2. **Left sidebar:** Click **"Settings"** → **"Environment Variables"**
3. **Add these variables:**
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_your_production_secret
   NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-prod.clerk.accounts.dev
   ADMIN_EMAIL=your-admin-email@example.com
   ```
4. **Click:** "Save"

**Step 3: Verify Webhook Connection**

1. Create a test user in your production app
2. Check Convex Dashboard → Production → Data → `users` table
3. User should appear (confirms webhook working)

---

#### Part 5: Test Production (Before Going Live)

**Phase 1: Test Mode Testing**

1. **Verify Stripe is in Test Mode:**
   - Clerk Dashboard (Production) → Billing → Settings
   - Should show "Test Mode" toggle enabled

2. **Visit your production URL:** `https://your-app.vercel.app`

3. **Test user signup/login:**
   - Create account
   - Sign in
   - Verify user appears in Convex production database

4. **Test subscription with Stripe test card:**
   - Go to payment-gated page
   - Click subscribe
   - Use test card: `4242 4242 4242 4242`
   - Any future date, any CVC
   - Complete "payment"

5. **Verify subscription access:**
   - Should redirect to payment-gated content
   - Check Convex → `paymentAttempts` table
   - Subscription should be recorded

6. **Test subscription cancellation:**
   - User profile → Manage subscription
   - Cancel subscription
   - Verify access revoked

**Phase 2: Go Live with Real Payments**

**When everything works in test mode:**

1. **Clerk Dashboard** (Production) → **Billing** → **Settings**
2. **Toggle:** Switch from **Test Mode** to **Live Mode**
3. **Confirm** the switch (Clerk will warn you about real payments)
4. **Test with real card:**
   - Subscribe yourself with a real credit card
   - Verify charge appears in your Stripe dashboard
   - Verify subscription works
   - Cancel subscription (to avoid recurring charges)

5. **You're now live!** 🚀
   - Real users can sign up
   - Real payments are processed
   - Stripe takes their fees (~2.9% + 30¢)

---

#### Part 6: Ongoing Production Management

**Monitoring:**
- Clerk Dashboard (Production) → View real users
- Convex Dashboard (Production) → Monitor database
- Stripe Dashboard → Track payments and revenue
- Vercel Dashboard → Monitor deployments and performance

**Updates:**
- Make changes locally (uses dev instances)
- Test thoroughly in development
- Push to GitHub
- Vercel auto-deploys to production
- Both dev and prod run simultaneously

**Key Points:**
- ✅ Production is separate from development
- ✅ Making production doesn't delete development
- ✅ You can develop locally while users use production
- ✅ Each environment is completely isolated

### Development Workflow With Both Instances

**Typical developer workflow:**

**Morning - Start developing:**
```bash
npm run dev          # Terminal 1 - Next.js dev server
npx convex dev       # Terminal 2 - Convex dev connection
```
→ Uses dev instances, test users, test payments

**Meanwhile:**
- Production app running on Vercel
- Real users using production instances
- Completely isolated from your dev work

**Deploy changes:**
```bash
git add .
git commit -m "New feature"
git push origin main
```
→ Vercel auto-deploys to production
→ Production uses prod instances
→ Dev instances unchanged

**Key Points:**
- ✅ Dev and prod instances never interfere
- ✅ Dev instances exist permanently (not removed when creating prod)
- ✅ Same codebase, different environment variables select which instance
- ✅ You can develop locally while prod serves real users
- ✅ Each instance has separate users, databases, and payment data

### Environment Variables Summary

**Variables that CHANGE between dev and prod:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_test_ → pk_live_)
- `CLERK_SECRET_KEY` (sk_test_ → sk_live_)
- `CONVEX_DEPLOYMENT` (dev:... → prod:...)
- `NEXT_PUBLIC_CONVEX_URL` (.convex.cloud → .convex.site)

**Variables that STAY THE SAME:**
- `NEXT_PUBLIC_SITE_NAME`
- `CSRF_SECRET`
- `SESSION_SECRET`
- All `NEXT_PUBLIC_CLERK_SIGN_*` redirect URLs

---

> **📘 For advanced deployment topics including:**
> - 3-environment setup (dev → preview → production)
> - Staging/QA workflows with test branches
> - Database snapshots and rollback strategies
> - Data cloning for testing
> - Emergency hotfix procedures
>
> **See the complete guide: [DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## Why More Secure Starter DIY?

**THE EASIEST TO SET UP. EASIEST IN TERMS OF CODE.**

- ✅ **Clerk + Convex + Clerk Billing** make it incredibly simple
- ✅ **No complex payment integrations** - Clerk handles everything
- ✅ **Real-time user sync** - Webhooks work out of the box
- ✅ **Beautiful UI** - Tailark.com inspired landing page blocks
- ✅ **Production ready** - Authentication, payments, and database included
- ✅ **Type safe** - Full TypeScript support throughout
- ✅ **Security** - Full security support throughout

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Stop rebuilding the same foundation over and over.** More Secure Starter DIY eliminates weeks of integration work by providing a complete, production-ready SaaS template with authentication, payments, and real-time data working seamlessly out of the box.

Built with ❤️ using Next.js 15, Convex, Clerk, and modern web technologies.
