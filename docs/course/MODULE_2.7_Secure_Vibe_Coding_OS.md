# 2.6: Secure Vibe Coding OS

**Your Security-Hardened SaaS Foundation**

## Learning Objectives

By the end of this lesson, you will be able to:

- Install and configure Secure Vibe Coding OS with comprehensive security controls
- Understand the built-in security architecture (CSRF, rate limiting, input validation)
- Customize the starter for your specific SaaS application
- Leverage pre-built security utilities in your development
- Deploy with proper environment separation (dev, preview, production)
- Prompt Claude Code to extend the secure foundation without compromising it
- Verify that all security controls remain active as you customize

## Introduction: Security-First Development

Most SaaS starters give you authentication and a database. Secure Vibe Coding OS gives you a **hardened security foundation** that's been analyzed against OWASP Top 10 and achieves a 90/100 security score out of the box.

As a vibe coder, you're not just building features—you're building them on a fortress. This starter eliminates the weeks of security implementation you'd otherwise need, while teaching you industry-standard security patterns.

**Core Principle:** Start secure, stay secure. Every feature you build inherits defense-in-depth protection from day one.

---

## Section 1: Understanding Secure Vibe Coding OS

### What Makes This Starter Different

**The Security Gap in Typical SaaS Starters:**

According to research from Veracode's 2024 State of Software Security Report, AI-generated code picks insecure patterns 45% of the time. Standard Next.js starters compound this problem by providing minimal security guidance—usually just basic authentication and maybe some environment variables.

This creates a dangerous situation: You start with an insecure foundation and then prompt AI to build features on top of it. Each new feature becomes a potential vulnerability.

**The Secure Vibe Coding OS Difference:**

Instead of adding security later (which studies show rarely happens), this starter **embeds security controls from the beginning**:

1. **CSRF Protection** - HMAC-SHA256 signed tokens prevent cross-site request forgery
2. **Rate Limiting** - 5 requests/minute per IP blocks brute force attacks
3. **Input Validation** - Zod schemas with XSS sanitization on all user input
4. **Security Headers** - CSP, HSTS, X-Frame-Options automatically applied
5. **Secure Error Handling** - Generic errors in production, detailed errors in dev
6. **Dependency Auditing** - 0 known vulnerabilities, automated checking

### The Security Stack

```
Your SaaS Application
└─ Built on Secure Vibe Coding OS
   ├─ Authentication Layer (Clerk)
   │  ├─ Industry-standard OAuth 2.0
   │  ├─ MFA support built-in
   │  └─ Secure session management
   │
   ├─ Security Middleware (Auto-applied)
   │  ├─ CSRF token validation
   │  ├─ Rate limiting (IP-based)
   │  ├─ Security headers (CSP, HSTS, etc.)
   │  └─ Input sanitization
   │
   ├─ Database Layer (Convex)
   │  ├─ Real-time serverless database
   │  ├─ Type-safe queries
   │  └─ Built-in validation
   │
   └─ Payment Processing (Clerk Billing + Stripe)
      ├─ PCI-compliant by default
      ├─ Webhook security handled
      └─ Subscription management automated
```

### OWASP Top 10 Security Posture

According to the project's security assessment (docs/security/OWASP_TOP_10_ASSESSMENT.md):

| OWASP Category | Score | Status |
|----------------|-------|--------|
| Injection Prevention | 10/10 | 🟢 Excellent |
| Cryptographic Failures | 10/10 | 🟢 Excellent |
| Broken Authentication | 10/10 | 🟢 Excellent |
| Secure Design | 10/10 | 🟢 Excellent |
| Security Misconfiguration | 9/10 | 🟢 Strong |
| Vulnerable Components | 10/10 | 🟢 Excellent |
| Overall Score | **90/100** | **🟢 Production Ready** |

**What this means:** You're starting in the **top 10% of Next.js applications for security**, according to industry benchmarks.

---

## Section 2: Installation and Setup

### Prerequisites

Before you begin:
- Node.js 18+ installed
- Git installed
- GitHub account
- Text editor with Claude Code extension
- Basic understanding of Next.js (helpful but not required)

**Accounts you'll need to create:**
- Clerk account (authentication) - https://dashboard.clerk.com
- Convex account (database) - https://dashboard.convex.dev
- Stripe account (payments) - https://dashboard.stripe.com (connected via Clerk)

All have free tiers sufficient for development.

### Installation Steps (Follow Exactly)

**Step 1: Download and Set Up the Starter Template**

```bash
# Clone the repository
git clone https://github.com/harperaa/secure-vibe-coding-OS.git [project-name]
cd [project-name]

# Install dependencies
npm install
# or use: pnpm install / yarn install / bun install
```

**Step 2: Set Up Your Environment Variables**

```bash
cp .env.example .env.local
```

This creates your local environment configuration file from the template.

**Step 3: Configure Your Environment Variables**

**Complete each step/setting in order in the `.env.local` file:**

**3a. Site Branding (Name your site)**

```bash
NEXT_PUBLIC_SITE_NAME=YOUR SITE NAME HERE
```

Replace with your application name. This appears in the header, footer, sidebar, and page title.

**3b. Clerk Authentication & Billing**

1. Sign up at https://dashboard.clerk.com
2. Select **"Create application"**
3. Name it (e.g., "My SaaS App Dev")
4. Click **"Create application"**
5. On Overview page, scroll down to **"2. Set your Clerk API keys"**
6. Copy and paste to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
```

**3c. Setup Your JWT Template Clerk Frontend API URL in Clerk**

1. Clerk Dashboard → **Configure** → **JWT Templates**
2. Click **"Add new template"**
3. Select **"convex"** from Template dropdown
4. Click **Save**
5. Copy the URL from the **"Issuer"** field
6. Ensure it ends with `.dev`
7. Paste to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev
```

**3d. Convex Configuration**

1. Sign up at https://dashboard.convex.dev
2. Create new project
3. Go to **Settings** → **Project Settings** → **Lost Access**
4. Copy the command shown (looks like):
   ```bash
   npx convex dev --configure=existing --team your_team_name --project your_project_name
   ```
5. Paste and execute that command in your terminal
6. This automatically updates `.env.local` with:

```bash
CONVEX_DEPLOYMENT=your_convex_deployment_here
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
```

**3e. Confirm Values Updated Automatically**

Check your `.env.local` file - the `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` values should be filled in by the convex script from step 3d.

**3f. Set the Convex Environment Variable for NEXT_PUBLIC_CLERK_FRONTEND_API_URL**

1. The convex config script should have provided a link in the terminal
2. Click that link to open Convex environment variables
3. Set `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` in Convex dashboard
4. Use the same value from step 3c (your Clerk Frontend API URL)

**3g. CSRF Protection**

Generate secrets for CSRF protection:

```bash
# Generate CSRF_SECRET
node -p "require('crypto').randomBytes(32).toString('base64url')"

# Generate SESSION_SECRET
node -p "require('crypto').randomBytes(32).toString('base64url')"
```

Add both to `.env.local`:

```bash
CSRF_SECRET=<paste-first-generated-value>
SESSION_SECRET=<paste-second-generated-value>
```

**Note:** The Clerk Redirect URLs are pre-configured and should be left as-is for now:

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

**Step 4: Terminate and Re-Initialize Convex**

Leave this running in the background:

```bash
npx convex dev
```

This connects your local development environment to your Convex deployment and watches for schema changes.

**Step 5: Convex Webhook Secret**

**5a. Get Your Convex HTTP Actions URL:**

1. Go to Convex dashboard at https://dashboard.convex.dev
2. Select your new project
3. Navigate to **Settings** → **URL & Deploy Key**
4. Click **"Show development credentials"**
5. Copy the **HTTP Actions URL**

**5b. Configure Clerk Webhook:**

1. Go to Clerk dashboard at https://dashboard.clerk.com
2. Navigate to **Configure** → **Webhooks**
3. Click **"Add Endpoint"**
4. Paste the Convex HTTP Actions URL and append `/clerk-users-webhook`
   - Example: `https://your-deployment.convex.cloud/clerk-users-webhook`
5. Search for and enable the following events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `paymentAttempt.updated`
6. Click **"Create"**
7. Copy the webhook signing secret (starts with `whsec_...`)

**5c. Add Webhook Secret to Convex:**

The webhook signing secret should be set in your **Convex dashboard environment variables** (NOT in your `.env.local` file).

**Step 6: Set Up Convex Environment Variables**

In your Convex Dashboard:

1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

```bash
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev
```

Use the webhook secret from Step 5b and the Clerk Frontend API URL from Step 3c.

**Step 7: Setup Clerk Subscriptions**

**Required for the template to work:**

1. Clerk dashboard → **Subscriptions**
2. Click **"Create a Plan"**
3. Click **"Add User Plan"**
4. Name the plan (e.g., "Basic", "Pro", "Premium")
5. Set the **Monthly base fee** (e.g., $10.00)
6. Click **"Save"** button
7. Click **"Enable Billing"** button at top of screen (**very important!**)

Repeat for each subscription tier you want to offer.

**Final Step: Start Development Server**

```bash
# In a new terminal window (Convex should still be running from Step 4)
npm run dev
```

**Verification:**

Visit `http://localhost:3000` - you should see:
- ✅ Landing page loads
- ✅ Pricing table shows your subscription plans
- ✅ Sign up/sign in buttons work
- ✅ After signing in, dashboard is accessible
- ✅ No console errors related to Clerk or Convex

**Total setup time:** ~30-45 minutes for complete configuration including billing.

**Troubleshooting:**

If you encounter errors:
- Ensure both `npx convex dev` and `npm run dev` are running
- Check that all environment variables are set in `.env.local`
- Verify `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` is set in both `.env.local` AND Convex dashboard
- Confirm webhook secret is in Convex dashboard (not `.env.local`)
- Check that Billing is enabled in Clerk dashboard

---

## Section 3: Understanding the Security Architecture

### Built-In Security Controls

#### 1. CSRF Protection (Cross-Site Request Forgery Prevention)

**What it prevents:** Attackers tricking users into performing unwanted actions by exploiting trusted sessions.

**Real-world CSRF attacks:** According to OWASP, CSRF attacks can lead to:
- Unauthorized fund transfers
- Changing user email addresses or passwords
- Making purchases without consent
- Deleting user data

One documented case: An attacker created a webpage with hidden forms that, when visited by logged-in users of a banking application, would transfer money to the attacker's account. Because the application didn't verify CSRF tokens, the browsers automatically sent valid session cookies, and the bank's server accepted the requests as legitimate.

**How Secure Vibe Coding OS prevents this:**

```typescript
// Automatic CSRF protection on all state-changing operations
import { withCsrf } from '@/lib/withCsrf';

export const POST = withCsrf(async (request) => {
  // Your code here - CSRF already verified
  // Token checked against HMAC-SHA256 signature
  // Invalid tokens rejected with 403
});
```

**What happens behind the scenes:**
1. Client fetches CSRF token from `/api/csrf`
2. Token is session-bound using HMAC-SHA256
3. Token stored in HTTP-only, SameSite=Strict cookie
4. Client includes token in `X-CSRF-Token` header
5. Server validates token against cookie
6. Token cleared after use (single-use protection)

#### 2. Rate Limiting (Brute Force Prevention)

**What it prevents:** Automated attacks that make thousands of requests to guess passwords, spam forms, or abuse resources.

**Real-world rate limiting failures:** The 2020 Zoom credential stuffing attack leveraged endpoints without rate limiting. Attackers made over 500,000 login attempts using leaked credentials from other breaches. According to security reports, proper rate limiting would have detected and blocked this attack within the first few hundred attempts.

**How Secure Vibe Coding OS prevents this:**

```typescript
// Automatic rate limiting: 5 requests per minute per IP
import { withRateLimit } from '@/lib/withRateLimit';

export const POST = withRateLimit(async (request) => {
  // Your code here - rate limit already enforced
  // Excess requests blocked with 429 status
});
```

**Configuration:**
- 5 requests per minute per IP address
- Tracks by `x-forwarded-for` header (proxy-aware)
- Returns HTTP 429 (Too Many Requests) when exceeded
- Shared limit across all protected endpoints

#### 3. Input Validation & XSS Prevention

**What it prevents:** Cross-site scripting attacks where attackers inject malicious scripts into your application.

**Real-world XSS statistics:** According to Acunetix's Web Application Vulnerability Report, XSS accounts for approximately 40% of all web application attacks. The impact ranges from session hijacking to complete account takeover.

A documented case: British Airways suffered a data breach in 2018 where attackers injected malicious JavaScript that harvested payment card details. The attack affected 380,000 transactions and resulted in a £20 million fine under GDPR.

**How Secure Vibe Coding OS prevents this:**

```typescript
// Automatic validation and sanitization with Zod
import { validateRequest } from '@/lib/validateRequest';
import { safeTextSchema } from '@/lib/validation';

const validation = validateRequest(safeTextSchema, userInput);
if (!validation.success) {
  return validation.response; // Returns 400 with errors
}

// validation.data is now type-safe and sanitized
// Removed: < > " & (XSS characters)
// Preserved: ' (for names like O'Neal)
```

**Pre-built validation schemas:**
- `emailSchema` - Email validation with sanitization
- `safeTextSchema` - Short text (100 chars max)
- `safeLongTextSchema` - Long text (5000 chars max)
- `usernameSchema` - Alphanumeric usernames only
- `urlSchema` - HTTPS URLs only

#### 4. Security Headers

**What they prevent:** Various attacks including clickjacking, MIME type confusion, and cross-origin attacks.

**Headers automatically applied:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: <dynamic, restricts resource loading>
Strict-Transport-Security: max-age=31536000 (production only)
X-Robots-Tag: noindex, nofollow (protected routes)
```

According to Mozilla's security documentation, these headers prevent entire classes of attacks that account for 30-40% of web vulnerabilities.

---

## Section 4: Using Secure Vibe Coding OS for Your Project

### The Secure Development Workflow

**Traditional SaaS Development:**
1. Build feature
2. Add security later (maybe)
3. Security gaps accumulate
4. Audit finds problems
5. Scramble to fix

**Secure Vibe Coding OS Workflow:**
1. Feature already has security built-in
2. Use pre-built security utilities
3. Claude Code follows security rules
4. Continuous security validation
5. Ship with confidence

### Your First Secure Feature

**Scenario:** You want to add a contact form where users submit feedback.

**Without Secure Vibe Coding OS, you'd need to:**
- Implement CSRF protection (hours)
- Add rate limiting (hours)
- Create input validation (hours)
- Set up error handling (hours)
- Add security headers (hours)
- Test everything (hours)

**Total:** Days of work, high risk of mistakes.

**With Secure Vibe Coding OS:** Use the security stack.

---

## Prompt Pattern 1: Creating a Secure API Route

**When to use:** Adding any new backend endpoint that handles user data

**The security advantage:** Every route you create automatically inherits defense-in-depth protection when you use the provided security utilities.

**The Prompt:**

```
I'm building a contact form for my SaaS app using Secure Vibe Coding OS.

Feature Requirements:
- User submits: name, email, subject, message
- Sends email to admin
- Thank you message on success

Security Requirements (from project security rules):
- Use withRateLimit() to prevent spam (5 req/min per IP)
- Use withCsrf() to prevent CSRF attacks
- Use validateRequest() with contactFormSchema for input validation
- Use handleApiError() for secure error handling
- No sensitive data in error messages

Implementation:
1. Create app/api/contact/route.ts
2. Import security utilities from @/lib
3. Use contactFormSchema from @/lib/validation
4. Apply security middlewares: withRateLimit(withCsrf(handler))
5. Validate input, send email, return success

Reference: Follow the pattern in app/api/example-protected/route.ts

Please create the complete secure contact form API route.
```

**What you get:**

```typescript
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { validateRequest } from '@/lib/validateRequest';
import { contactFormSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/errorHandler';

async function contactHandler(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize input (XSS protection built-in)
    const validation = validateRequest(contactFormSchema, body);
    if (!validation.success) {
      return validation.response; // 400 with detailed errors
    }

    // validation.data is type-safe and XSS-sanitized
    const { name, email, subject, message } = validation.data;

    // Send email (using your email service)
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      from: email,
      subject: `Contact: ${subject}`,
      body: `From: ${name} (${email})\n\n${message}`
    });

    return NextResponse.json({ success: true, message: 'Thank you for contacting us!' });
  } catch (error) {
    // Secure error handling (no stack traces in production)
    return handleApiError(error, 'contact-form');
  }
}

// Apply security layers: rate limit first, then CSRF, then handler
export const POST = withRateLimit(withCsrf(contactHandler));

export const config = {
  runtime: 'nodejs',
};
```

**Security controls automatically enforced:**
- ✅ Rate limited to 5 requests/minute per IP (prevents spam)
- ✅ CSRF token verified (prevents cross-site attacks)
- ✅ Input validated with Zod schema (prevents injection)
- ✅ XSS characters removed: `< > " &` (prevents script injection)
- ✅ Apostrophes preserved: `'` (names like O'Neal work)
- ✅ Errors handled securely (no info leakage in production)

**Verification Prompt:**

```
Explain the security of this contact form implementation:
1. What attacks does withRateLimit() prevent?
2. How does withCsrf() protect against CSRF attacks?
3. What XSS attacks are prevented by contactFormSchema?
4. What happens if a user sends `<script>alert('xss')</script>` in the message?
5. What happens if the same IP makes 10 requests in 30 seconds?
6. What error details are shown in production vs development?
```

---

## Prompt Pattern 2: Adding Feature-Gated Content

**When to use:** Creating features only available to paid subscribers

**The security advantage:** Clerk's authorization checks happen server-side and cannot be bypassed by modifying client code.

**The Prompt:**

```
I'm adding a premium feature to my SaaS app that should only be accessible to paid subscribers.

Feature: [Describe your premium feature]

Security Requirements:
- Use Clerk's Protect component with subscription checking
- Server-side verification (client can't bypass)
- Clear upgrade prompt for non-subscribers
- Audit trail of access attempts

Reference implementation: app/dashboard/payment-gated/page.tsx

Please:
1. Create a new protected page in app/dashboard/my-feature/page.tsx
2. Use Clerk's Protect component with subscription check
3. Add fallback upgrade card for non-subscribers
4. Show the feature content for valid subscribers
5. Ensure all checks happen server-side

Show me how to test that client-side code modifications can't bypass the protection.
```

**What you get:**

```typescript
// app/dashboard/my-feature/page.tsx
import { Protect } from '@clerk/nextjs'
import CustomClerkPricing from "@/components/custom-clerk-pricing";

function UpgradePrompt() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Upgrade Required</h1>
      <p>This feature is available on paid plans.</p>
      <CustomClerkPricing />
    </div>
  )
}

function PremiumFeature() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Premium Feature</h1>
      <p>Access to premium functionality.</p>
      {/* Your premium feature UI here */}
    </div>
  )
}

export default function MyFeaturePage() {
  return (
    <Protect
      condition={(has) => !has({ plan: "free_user" })}
      fallback={<UpgradePrompt />}
    >
      <PremiumFeature />
    </Protect>
  )
}
```

**Security verification:**
- Subscription check happens on **server-side** (Clerk validates)
- Client JavaScript cannot bypass the Protect component
- No subscription = no access to component code
- Audit trail maintained by Clerk

---

## Prompt Pattern 3: Creating Custom Validation Schemas

**When to use:** Adding features with data types not covered by pre-built schemas

**Why custom validation matters:** According to the Georgetown Center for Security and Emerging Technology, up to 36% of AI-generated code contains security vulnerabilities, with input validation being the most common gap. Custom schemas ensure your unique data types are secured.

**The Prompt:**

```
I'm adding a feature that needs custom data validation.

Data Structure:
- Field 1: [name, type, constraints]
- Field 2: [name, type, constraints]
- Field 3: [name, type, constraints]

Security Requirements (from project security rules):
- Use Zod for type-safe validation
- Include XSS sanitization transform
- Add length limits appropriate to field
- Validate data types strictly
- Provide clear error messages
- Follow pattern in lib/validation.ts

Please:
1. Create custom Zod schema in lib/validation.ts
2. Include XSS sanitization: .transform((val) => val.replace(/[<>"&]/g, ''))
3. Add appropriate length constraints
4. Export schema for reuse
5. Show usage example with validateRequest()

The schema should handle:
- Type validation
- Length constraints
- XSS character removal
- Required vs optional fields
```

**Example implementation:**

```typescript
// lib/validation.ts (add to existing file)
export const myFeatureSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .trim()
    .transform((val) => val.replace(/[<>"&]/g, '')),

  description: z.string()
    .min(10, 'Description too short')
    .max(5000, 'Description too long')
    .trim()
    .transform((val) => val.replace(/[<>"&]/g, '')),

  category: z.enum(['tech', 'business', 'personal'], {
    errorMap: () => ({ message: 'Invalid category' })
  }),

  tags: z.array(
    z.string().max(50).transform((val) => val.replace(/[<>"&]/g, ''))
  ).max(5, 'Maximum 5 tags allowed').optional(),
});

// Type inference
export type MyFeatureInput = z.infer<typeof myFeatureSchema>;
```

**Usage in API route:**

```typescript
const validation = validateRequest(myFeatureSchema, body);
if (!validation.success) return validation.response;

// TypeScript knows the exact shape, data is sanitized
const { title, description, category, tags } = validation.data;
```

---

## Prompt Pattern 4: Extending Security for Custom Features

**When to use:** Building features not covered by example routes

**The Prompt:**

```
I'm building [describe your feature] for my SaaS app.

Feature Details:
- What it does: [description]
- User inputs: [list all user-provided data]
- Database operations: [what gets stored]
- External services called: [if any]

Security Requirements (following project security rules):
- Follow the security stack pattern from app/api/example-protected/route.ts
- Apply withRateLimit() if route could be abused
- Apply withCsrf() for POST/PUT/DELETE operations
- Create or use Zod schema from lib/validation.ts
- Use validateRequest() for input validation
- Check authentication with Clerk's auth()
- Use handleApiError() for error handling
- No sensitive data in logs

Please:
1. Create the API route with full security stack
2. Implement proper validation schema
3. Add authentication check if needed
4. Handle errors securely
5. Add server-side authorization if accessing user-specific data
6. Document security controls applied

Show me the complete implementation following project security standards.
```

**Security checklist for your feature:**
- [ ] Rate limiting applied (if needed)
- [ ] CSRF protection (for state changes)
- [ ] Input validation with Zod
- [ ] XSS sanitization
- [ ] Authentication check (if needed)
- [ ] Authorization check (if accessing user data)
- [ ] Secure error handling
- [ ] No secrets in code
- [ ] Logging without PII

---

## Section 5: Customizing the Starter

### What You Can Safely Customize

**✅ Safe to change without security review:**
- UI components (styling, layout, animations)
- Landing page content
- Dashboard layout
- Theme colors and fonts
- Page metadata and SEO
- Static content
- Component styling

**⚠️ Requires security review when changing:**
- Security middleware (`lib/withCsrf.ts`, `lib/withRateLimit.ts`)
- Validation schemas (`lib/validation.ts`)
- Error handlers (`lib/errorHandler.ts`)
- Middleware (`middleware.ts` - especially CSP)
- Authentication flows
- API routes (must maintain security stack)

**❌ Should NOT change unless you understand implications:**
- CSRF token generation (`lib/csrf.ts`)
- Core security architecture
- Clerk/Convex configuration
- Webhook handlers (`convex/http.ts`)

### Customization Prompt Pattern 5: Branding Your App

**When to use:** Making the starter look like your product

**The Prompt:**

```
I want to rebrand Secure Vibe Coding OS for my SaaS product.

My Brand:
- App Name: [Your App Name]
- Tagline: [Your Tagline]
- Primary Color: [Color hex]
- Logo: [Describe or provide]

Changes Needed:
- Update site name throughout
- Replace logo
- Update landing page copy
- Customize color scheme
- Update meta descriptions

Security Requirements:
- Don't modify security utilities in lib/ folder
- Keep security middleware intact
- Maintain all validation schemas
- Preserve error handling

Please:
1. Update NEXT_PUBLIC_SITE_NAME in .env.local and .env.example
2. Replace logo in components/logo.tsx
3. Update app/layout.tsx metadata
4. Guide me on customizing colors in app/globals.css
5. Update landing page copy in app/(landing)/
6. Preserve all security controls

Note: The site name is already configured to use NEXT_PUBLIC_SITE_NAME environment variable.
```

### Customization Prompt Pattern 6: Adding Database Tables

**When to use:** Extending the Convex database schema

**The Prompt:**

```
I need to add new database tables to store [describe your data].

Data Structure:
- Table name: [name]
- Fields:
  - [field1]: [type, description]
  - [field2]: [type, description]
  - [field3]: [type, description]

Security Requirements:
- Follow Convex schema patterns in convex/schema.ts
- Add validation in Convex mutations
- Use Zod schemas from lib/validation.ts for input validation
- Associate data with authenticated users (ctx.auth.userId)
- Validate input before database insert
- Handle errors securely

Please:
1. Add table definition to convex/schema.ts
2. Create mutation with input validation
3. Create query to fetch user's data
4. Add index for userId if needed
5. Show how to call from Next.js API route
6. Include validation using project's Zod schemas

Reference: Existing schema in convex/schema.ts and convex/users.ts
```

**What you'll get:**

```typescript
// convex/schema.ts (add to existing schema)
myFeature: defineTable({
  title: v.string(),
  content: v.string(),
  userId: v.string(),
  createdAt: v.number(),
}).index("by_user", ["userId"]),
```

```typescript
// convex/myFeature.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { safeTextSchema, safeLongTextSchema } from "../lib/validation";

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate with Zod (security requirement)
    const titleValidation = safeTextSchema.safeParse(args.title);
    const contentValidation = safeLongTextSchema.safeParse(args.content);

    if (!titleValidation.success || !contentValidation.success) {
      throw new Error("Invalid input");
    }

    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Insert with validated, sanitized data
    await ctx.db.insert("myFeature", {
      title: titleValidation.data,
      content: contentValidation.data,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const getUserItems = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("myFeature")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
```

**Security controls enforced:**
- ✅ Input validated with Zod before database
- ✅ XSS characters sanitized
- ✅ User authentication required
- ✅ Data scoped to authenticated user only
- ✅ Type-safe operations

---

## Prompt Pattern 7: Understanding the Security Utilities

**When to use:** Before building custom features, understand what's available

**The Prompt:**

```
Explain the security utilities available in Secure Vibe Coding OS.

I need to understand:
1. What each utility in lib/ does
2. When to use each one
3. How to combine them properly
4. What security controls they provide
5. Examples of using them together

Utilities to explain:
- lib/csrf.ts
- lib/withCsrf.ts
- lib/withRateLimit.ts
- lib/validation.ts
- lib/validateRequest.ts
- lib/errorHandler.ts

For each utility:
- Purpose and what attacks it prevents
- When it should be used
- How to use it (code example)
- What NOT to do with it

Reference: .cursor/rules/security_rules.mdc for usage patterns
```

**This teaches you:**
- Complete security architecture
- How utilities work together
- When to apply each protection
- Common patterns and anti-patterns

---

## Section 6: Testing Security Controls

### Verifying Security Works

**Important:** You should test that security controls actually work, not just assume they do.

### Prompt Pattern 8: Testing Security Features

**When to use:** After customizing or adding new features

**The Prompt:**

```
I need to verify all security controls are working in my customized app.

Features I've Added:
- [List your custom features]

Security Tests Needed:
1. CSRF Protection Test
   - Try POST without CSRF token → Should get 403
   - Try POST with invalid token → Should get 403
   - Try POST with valid token → Should succeed

2. Rate Limiting Test
   - Make 10 rapid requests → First 5 succeed, rest get 429
   - Different IP addresses → Each has own limit

3. Input Validation Test
   - Send XSS payload → Should be sanitized
   - Send invalid data types → Should get 400 error
   - Send too-long input → Should be rejected

4. Authentication Test
   - Access protected route without auth → Should get 401
   - Access protected route with auth → Should succeed

5. Error Handling Test
   - Trigger error in development → Should see stack trace
   - Simulate production → Should see generic error only

Please:
1. Create test script or show manual testing steps
2. For each test, show expected vs actual results
3. Document any security controls that aren't working
4. Verify security headers present (curl -I localhost:3000)
5. Test rate limiting: node scripts/test-rate-limit.js

Show me the test results proving security controls are active.
```

**Built-in test scripts:**

```bash
# Test rate limiting
node scripts/test-rate-limit.js
# Expected: 5 success, 5 rate limited

# Test CSRF endpoint
curl http://localhost:3000/api/csrf
# Expected: {"csrfToken":"..."}

# Test security headers
curl -I http://localhost:3000
# Expected: X-Frame-Options, CSP, HSTS (if prod), etc.

# Test dependency security
bash scripts/security-check.sh
# Expected: 0 vulnerabilities
```

---

## Section 7: Deployment Security

### Development vs Production Security Posture

**Development security is relaxed:**
- Detailed error messages (debugging)
- HTTP allowed (localhost)
- Verbose logging
- Development Clerk keys
- Stripe test mode

**Production security is strict:**
- Generic error messages only
- HTTPS enforced (HSTS)
- Minimal logging (no PII)
- Production Clerk keys
- Stripe live mode

**The environment-aware code handles this automatically:**

```typescript
// Error handling knows the environment
if (process.env.NODE_ENV === 'development') {
  // Show detailed errors
} else {
  // Show generic errors only
}

// HSTS only in production
if (process.env.NODE_ENV === 'production') {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000');
}
```

### Prompt Pattern 9: Production Deployment Checklist

**When to use:** Before deploying to production

**The Prompt:**

```
I'm ready to deploy my customized Secure Vibe Coding OS app to production.

Walk me through the pre-deployment security checklist:

1. Environment Variables
   - What must be configured in Vercel production environment?
   - Which secrets need to be different from dev?
   - What values can stay the same?

2. Security Verification
   - How do I verify security controls work in production?
   - What security tests should pass?
   - How do I check security headers in production?

3. Clerk Production Setup
   - Switch from dev to production instance
   - What changes in Clerk dashboard?
   - Production webhook configuration

4. Convex Production Setup
   - Deploy to production deployment
   - Production environment variables
   - Webhook secrets

5. Final Checks
   - npm audit → 0 vulnerabilities?
   - All security features tested?
   - Monitoring set up?
   - Backup plan ready?

Reference: DEPLOYMENT.md and docs/security/OWASP_TOP_10_ASSESSMENT.md

Create a deployment checklist specific to my app.
```

**Pre-deployment security checklist (from project):**

- [ ] `CSRF_SECRET` and `SESSION_SECRET` generated and configured
- [ ] All environment variables set in Vercel production
- [ ] Clerk production instance created and configured
- [ ] Convex production deployment created
- [ ] Production webhooks configured with secrets
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] Security headers verified in production (`curl -I https://your-domain.com`)
- [ ] HSTS header present (production only)
- [ ] Rate limiting tested (`node scripts/test-rate-limit.js`)
- [ ] CSRF protection verified
- [ ] Input validation working
- [ ] Error messages generic (no stack traces)
- [ ] Stripe in test mode first, then switch to live after validation
- [ ] Authentication flow tested end-to-end
- [ ] Subscription flow tested with test card
- [ ] Payment-gated content access verified

---

## Hands-On Practice: Customizing Your Secure Starter

### Complete Customization Project

**Objective:** Transform Secure Vibe Coding OS into your own SaaS application while maintaining all security controls.

---

### Part 1: Planning Your SaaS (30 minutes)

**Task 1: Define Your Application**

Create `docs/MY_SAAS_PLAN.md`:

```markdown
# My SaaS Application Plan

## Application Overview
**Name:** [Your App Name]
**Purpose:** [What problem does it solve?]
**Target Users:** [Who will use it?]

## Core Features
1. [Feature 1 - describe]
2. [Feature 2 - describe]
3. [Feature 3 - describe]

## Subscription Tiers
**Free Tier:**
- [Feature access]
- [Limitations]

**Basic Tier ($X/month):**
- [All free features plus]
- [Premium feature 1]
- [Limitation adjustments]

**Pro Tier ($Y/month):**
- [All basic features plus]
- [Premium feature 2]
- [Premium feature 3]

## Data Model
**User data to store:**
- [Field 1]
- [Field 2]
- [Field 3]

**User-generated content:**
- [What users create]
- [Ownership model]
- [Access controls needed]

## Security Priorities
1. [Your top security concern]
2. [Your second concern]
3. [Your third concern]
```

**Task 2: Map Features to Security Controls**

In `docs/MY_SAAS_PLAN.md`, add:

```markdown
## Security Controls Needed

### Feature 1: [Name]
- **Input:** [User provides what?]
- **Validation:** [Which Zod schema?]
- **Rate Limiting:** [Yes/No - why?]
- **CSRF:** [Yes/No - state changing?]
- **Auth Required:** [Yes/No]
- **Subscription Gate:** [Free/Basic/Pro]

### Feature 2: [Name]
- **Input:** [User provides what?]
- **Validation:** [Which Zod schema?]
- **Rate Limiting:** [Yes/No - why?]
- **CSRF:** [Yes/No - state changing?]
- **Auth Required:** [Yes/No]
- **Subscription Gate:** [Free/Basic/Pro]

[Repeat for each feature]
```

---

### Part 2: Branding and UI Customization (45 minutes)

**Task 3: Rebrand the Application**

Use Prompt Pattern 5:

```
I want to rebrand Secure Vibe Coding OS for my SaaS: [Your App Name from docs/MY_SAAS_PLAN.md]

My Brand:
- App Name: [Your App Name]
- Tagline: [Your Tagline]
- Primary Color: [Hex code]
- Secondary Color: [Hex code]
- Font: [Font name or keep default]

Changes Needed:
1. Update NEXT_PUBLIC_SITE_NAME in environment files
2. Update landing page hero section
3. Update pricing page messaging
4. Customize color scheme
5. Update page metadata (title, description)

Security Requirements:
- Don't modify files in lib/ folder
- Keep all security middleware intact
- Preserve Clerk and Convex integrations

Please guide me through:
1. Updating environment variables
2. Changing landing page copy in app/(landing)/
3. Customizing colors in app/globals.css
4. Updating metadata in app/layout.tsx
5. Keeping all security features active

Verify that no security controls are affected by branding changes.
```

**Task 4: Customize Landing Page**

Files to modify (safe for customization):
- `app/(landing)/hero-section.tsx` - Main hero
- `app/(landing)/features-one.tsx` - Features section
- `app/(landing)/testimonials.tsx` - Social proof
- `app/(landing)/faqs.tsx` - FAQ section
- `app/(landing)/footer.tsx` - Footer content

**Prompt for each section:**

```
Update the [section name] for my SaaS app: [Your App Name].

Current Content:
[Copy current text from file]

New Content:
- Headline: [Your headline]
- Description: [Your description]
- Features/Benefits: [Your list]

Keep:
- All security features intact
- Component structure
- Styling approach (customize colors if needed)

Please update the content while preserving the component architecture.
```

---

### Part 3: Implementing Your Core Features (90 minutes)

**Task 5: Build Your First Secure Feature**

Choose Feature 1 from `docs/MY_SAAS_PLAN.md`.

Use Prompt Pattern 1 and 4 combined:

```
I'm implementing [Feature 1 from MY_SAAS_PLAN.md] for my SaaS app.

Feature Details (from docs/MY_SAAS_PLAN.md):
- [Copy your feature description]
- [User inputs]
- [Expected outputs]

Security Implementation:
- Reference: app/api/example-protected/route.ts
- Use: withRateLimit() and withCsrf() from @/lib
- Validate: Create or use schema from @/lib/validation
- Errors: Use handleApiError() from @/lib/errorHandler
- Auth: Use Clerk's auth() if user-specific
- Subscription: Use Protect component if paid feature

Please create:
1. Custom Zod validation schema (if needed) in lib/validation.ts
2. API route in app/api/[feature-name]/route.ts
3. Convex mutation (if storing data) in convex/[feature-name].ts
4. Frontend page in app/dashboard/[feature-name]/page.tsx (if needed)

Follow the security stack pattern:
export const POST = withRateLimit(withCsrf(handler));

Show me the complete implementation with all security controls.
```

**Task 6: Add Subscription Gating (If Applicable)**

If Feature 1 is a paid feature, use Prompt Pattern 2:

```
Feature 1 should only be available to [Free/Basic/Pro] tier subscribers.

Following app/dashboard/payment-gated/page.tsx pattern:

Please:
1. Wrap the feature page in Clerk's Protect component
2. Set condition: !has({ plan: "free_user" }) for paid features
3. Create upgrade fallback with CustomClerkPricing
4. Ensure newSubscriptionRedirectUrl redirects back to feature
5. Verify client code can't bypass protection

Show me how to test that non-subscribers can't access the feature.
```

**Task 7: Repeat for Remaining Features**

For each additional feature from `docs/MY_SAAS_PLAN.md`:
1. Use Prompt Pattern 1 or 4 (secure API route)
2. Add validation schema if needed
3. Create Convex mutations if storing data
4. Apply subscription gating if paid feature
5. Test security controls

---

### Part 4: Testing Your Customized App (45 minutes)

**Task 8: Security Testing**

Use Prompt Pattern 8:

```
I've customized Secure Vibe Coding OS with my features. I need to verify all security controls still work.

My Custom Features:
- [List all features you added]

Security Tests:
1. Rate Limiting
   - Test: node scripts/test-rate-limit.js
   - Expected: 5 success, 5 blocked

2. CSRF Protection
   - Test custom API routes without token
   - Expected: 403 Forbidden

3. Input Validation
   - Send XSS payloads to each endpoint
   - Expected: Sanitized or rejected

4. Authentication
   - Access protected routes without login
   - Expected: Redirect to sign-in

5. Subscription Gating
   - Access paid features as free user
   - Expected: Upgrade prompt

6. Security Headers
   - curl -I http://localhost:3000
   - Expected: X-Frame-Options, CSP, etc.

Please create a test plan for my specific features and show me how to verify each security control.
```

**Document results in:** `docs/SECURITY_TEST_RESULTS.md`

**Task 9: Dependency Security Audit**

```bash
# Run security audit
bash scripts/security-check.sh

# Should show:
# - 0 vulnerabilities
# - List of outdated packages (if any)
```

If vulnerabilities found:

```bash
npm audit fix
# Or if needed:
npm audit fix --force
```

**Document in** `docs/SECURITY_TEST_RESULTS.md`:
- Vulnerability count before/after
- Packages updated
- Testing performed after update

---

### Part 5: Documentation (30 minutes)

**Task 10: Document Your Security Posture**

Create `docs/MY_APP_SECURITY.md`:

```markdown
# [Your App Name] Security Documentation

## Security Score: X/100

Based on OWASP Top 10 assessment (see docs/security/OWASP_TOP_10_ASSESSMENT.md):

| Category | Score | Notes |
|----------|-------|-------|
| Injection Prevention | X/10 | [Any changes from baseline?] |
| CSRF Protection | X/10 | [Any changes from baseline?] |
| Authentication | X/10 | [Using Clerk, any customizations?] |
| [Continue for all 10]... | | |

## Security Controls Active

### Inherited from Secure Vibe Coding OS:
- ✅ CSRF Protection (HMAC-SHA256)
- ✅ Rate Limiting (5 req/min per IP)
- ✅ Input Validation (Zod schemas)
- ✅ Security Headers (CSP, HSTS, X-Frame-Options)
- ✅ Secure Error Handling
- ✅ 0 Known Vulnerabilities

### Added for My Application:
- [List custom security controls]
- [Any additional protections]

## Custom Features Security

### Feature 1: [Name]
- **Validation:** [Schema used]
- **Rate Limited:** [Yes/No]
- **CSRF Protected:** [Yes/No]
- **Auth Required:** [Yes/No]
- **Subscription Gate:** [Tier]
- **Tested:** [✓] [Date]

### Feature 2: [Name]
[Repeat for each feature]

## Attack Surface

### Public Endpoints (no auth required):
- `/` - Landing page (static, safe)
- `/api/csrf` - CSRF token generation (rate limited)
- [Your public endpoints]

### Authenticated Endpoints:
- `/dashboard` - Requires authentication
- `/api/[your-endpoints]` - [Security controls listed]

### Payment Processing:
- Handled by: Clerk Billing + Stripe
- PCI Compliance: ✅ (no card data touches our servers)
- Webhook Security: ✅ (Clerk handles signature verification)

## Security Monitoring

**What we monitor:**
- Failed authentication attempts (via Clerk)
- Rate limit violations (logged in console)
- CSRF validation failures (logged in console)
- Input validation failures (logged with context)
- Dependency vulnerabilities (npm audit)

**Monitoring frequency:**
- Real-time: Authentication, rate limiting, CSRF
- Daily: `npm audit` check
- Weekly: Manual security review
- Monthly: OWASP assessment update

## Incident Response Plan

**If security incident detected:**

1. **Immediate:**
   - Roll back deployment via Vercel dashboard
   - Revoke compromised credentials
   - Enable Clerk rate limiting if not already active

2. **Investigation:**
   - Review logs (Clerk, Convex, Vercel)
   - Identify scope of breach
   - Document timeline

3. **Resolution:**
   - Patch vulnerability
   - Test fix thoroughly
   - Deploy to staging first
   - Deploy to production
   - Update security documentation

4. **Post-Incident:**
   - Update security rules in .cursor/rules/security_rules.mdc
   - Add tests to prevent recurrence
   - Review similar code for same issue

## Resources

- Security Implementation: `docs/security/SECURITY_IMPLEMENTATION.md`
- OWASP Assessment: `docs/security/OWASP_TOP_10_ASSESSMENT.md`
- Security Rules for AI: `.cursor/rules/security_rules.mdc`
- Deployment Guide: `DEPLOYMENT.md`
```

---

## Common Customization Patterns

### Pattern 1: Adding a Data Collection Feature

**Use case:** User submissions, posts, comments, etc.

**Security requirements:**
1. Input validation with Zod
2. Rate limiting (prevent spam)
3. CSRF protection (state-changing)
4. XSS sanitization
5. User authentication
6. Associate data with user ID

**Example implementations in project:**
- `app/api/example-protected/route.ts` - Full security stack
- `lib/validation.ts` - Pre-built schemas
- `convex/users.ts` - Database pattern

---

### Pattern 2: Adding External API Integration

**Use case:** Calling third-party services (maps, weather, analytics, AI)

**Security requirements:**
1. API keys in environment variables only
2. Backend calls only (never from frontend)
3. Input validation before sending
4. Response validation after receiving
5. Rate limiting to prevent abuse
6. Timeout protection
7. Secure error handling

**Refer to:** Module 2.5 (External Integrations Security) for complete patterns

---

### Pattern 3: Adding Admin Features

**Use case:** Admin dashboard, user management, analytics

**Security requirements:**
1. Role-based access control
2. Audit logging of admin actions
3. Extra authentication layer (consider MFA requirement)
4. Separate from user features
5. No sensitive data exposure

**Prompt:**

```
I'm adding admin features to my SaaS built on Secure Vibe Coding OS.

Admin Features Needed:
- [List admin capabilities]

Security Requirements:
- Check user role/permissions (via Clerk metadata)
- Require MFA for admin actions (Clerk supports this)
- Log all admin actions for audit trail
- Separate admin routes from user routes
- Extra validation on admin operations

Please:
1. Show me how to check for admin role using Clerk
2. Create protected admin route
3. Implement admin action logging
4. Add extra security controls for admin features
5. Ensure admin can't be bypassed

Reference: Clerk role-based access control documentation
```

---

## Practical Exercise: Build Your SaaS on Secure Foundation

### Complete Project (3-4 hours)

**Exercise Overview:**

Transform Secure Vibe Coding OS into your production-ready SaaS application. You'll customize branding, add your core features, configure subscriptions, and verify all security controls remain active.

---

#### Phase 1: Planning (30 minutes)

**Task 1: Complete Planning Documents**

Create these files in `docs/` folder:

1. **docs/MY_SAAS_PLAN.md**
   - Application overview
   - Feature list
   - Subscription tiers
   - Data model
   - Security priorities

2. **docs/SECURITY_MAPPING.md**
   - Map each feature to security controls
   - Identify which schemas to use/create
   - Note which features need rate limiting
   - List features requiring CSRF protection
   - Identify subscription-gated features

**Deliverable:** Complete plan approved before coding

---

#### Phase 2: Branding (30 minutes)

**Task 2: Rebrand the Starter**

Using Prompt Pattern 5:

1. Update `NEXT_PUBLIC_SITE_NAME` in `.env.local` and `.env.example`
2. Customize landing page copy (hero, features, testimonials)
3. Update color scheme in `app/globals.css`
4. Replace logo in `components/logo.tsx`
5. Update metadata in `app/layout.tsx`

**Verification:**
- [ ] Site name appears correctly throughout app
- [ ] Landing page reflects your brand
- [ ] Colors match your design
- [ ] Metadata updated for SEO
- [ ] No security features broken

**Deliverable:** Branded starter matching your design

---

#### Phase 3: Configure Subscriptions (30 minutes)

**Task 3: Set Up Your Pricing Plans**

1. **In Clerk Dashboard (Development):**
   - Billing → Create pricing plans
   - Define tiers from MY_SAAS_PLAN.md
   - Set pricing and features
   - Enable Billing (test mode)

2. **Verify Pricing Table:**
   - Visit `http://localhost:3000`
   - Pricing section should show your plans
   - Test subscribing with card: `4242 4242 4242 4242`

3. **Test Payment Gating:**
   - Visit `/dashboard/payment-gated`
   - Should show upgrade prompt
   - Subscribe to plan
   - Should show premium content after payment

**Deliverable:** Working subscription system

---

#### Phase 4: Build Core Features (120 minutes)

**Task 4: Implement Feature 1**

Using Prompt Patterns 1, 3, and 4:

1. **Create validation schema** (if needed) in `lib/validation.ts`
2. **Create API route** in `app/api/[feature]/route.ts`
3. **Create Convex mutation** (if storing data) in `convex/[feature].ts`
4. **Create UI page** in `app/dashboard/[feature]/page.tsx`
5. **Apply security stack:**
   ```typescript
   export const POST = withRateLimit(withCsrf(handler));
   ```

**Security checklist for this feature:**
- [ ] Input validated with Zod schema
- [ ] XSS characters sanitized
- [ ] Rate limiting applied
- [ ] CSRF protection active
- [ ] Authentication required
- [ ] Subscription tier checked (if paid feature)
- [ ] Errors handled securely
- [ ] No sensitive data logged

**Task 5: Implement Feature 2**

Repeat process for second feature from your plan.

**Task 6: Implement Feature 3**

Repeat process for third feature from your plan.

**Deliverable:** 3 working features with full security stack

---

#### Phase 5: Security Testing (45 minutes)

**Task 7: Test All Security Controls**

Using Prompt Pattern 8:

1. **Rate Limiting Test:**
   ```bash
   node scripts/test-rate-limit.js /api/your-feature
   # Should block after 5 requests
   ```

2. **CSRF Test:**
   ```bash
   # Try POST without CSRF token
   curl -X POST http://localhost:3000/api/your-feature \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   # Should get 403 Forbidden
   ```

3. **XSS Test:**
   ```bash
   # Send XSS payload
   curl -X POST http://localhost:3000/api/your-feature \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: <get-from-/api/csrf>" \
     -d '{"message": "<script>alert(1)</script>"}'
   # Should sanitize the script tags
   ```

4. **Authentication Test:**
   - Access `/dashboard/your-feature` while logged out
   - Should redirect to sign-in

5. **Subscription Test:**
   - Access paid feature as free user
   - Should show upgrade prompt
   - Subscribe and verify access granted

**Task 8: Security Audit**

```bash
# Run comprehensive security check
bash scripts/security-check.sh

# Should show:
# - 0 vulnerabilities
# - All packages up to date
```

**Task 9: Type Check**

```bash
# Verify TypeScript types
npm run build

# Should complete without errors
```

**Deliverable:** All tests passing, documented in `docs/SECURITY_TEST_RESULTS.md`

---

#### Phase 6: Documentation (30 minutes)

**Task 10: Document Your Implementation**

Create `docs/IMPLEMENTATION_NOTES.md`:

```markdown
# [Your App Name] Implementation Notes

## Features Implemented

### Feature 1: [Name]
- **Files Created:**
  - `app/api/[feature]/route.ts`
  - `convex/[feature].ts`
  - `app/dashboard/[feature]/page.tsx`
- **Security Controls:**
  - ✅ Rate limiting
  - ✅ CSRF protection
  - ✅ Input validation (schema: [name])
  - ✅ Authentication required
  - ✅ [Subscription tier] required
- **Tested:** ✓ [Date]

[Repeat for each feature]

## Security Architecture Maintained

✅ All security utilities from lib/ preserved
✅ Middleware security headers intact
✅ CSRF protection active on all POST routes
✅ Rate limiting applied to appropriate endpoints
✅ Input validation on all user inputs
✅ Error handling secure (no leaks in production)

## Customizations Made

**Branding:**
- Site name: [Your name]
- Colors: [Your colors]
- Logo: [Updated/Original]

**Landing Page:**
- Hero section: [Customized]
- Features: [Customized]
- Testimonials: [Customized]

**Features Added:**
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

**Database Schema:**
- Tables added: [List]
- Indexes created: [List]

## Security Test Results

- npm audit: 0 vulnerabilities ✓
- Rate limiting: Working ✓
- CSRF protection: Working ✓
- Input validation: Working ✓
- Security headers: Present ✓
- TypeScript: No errors ✓

## Production Readiness

- [ ] All features tested
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Deployment plan reviewed (DEPLOYMENT.md)
```

---

## Section 8: Advanced Security Customizations

### When You Need More Than the Defaults

The starter provides enterprise-grade security for most use cases, but you might need additional controls for specific scenarios.

### Prompt Pattern 10: Adding Authorization Middleware

**When to use:** Features with resource ownership (posts, documents, projects)

**Currently in starter:** Authentication (who you are) via Clerk
**You might need:** Authorization (what you can access)

**The Prompt:**

```
I'm adding a feature where users own resources (posts/documents/projects) in Secure Vibe Coding OS.

Feature: [Your feature with ownership model]

Authorization Requirements:
- Users can only access their own resources
- Users can't view/edit other users' resources
- Return 403 Forbidden if unauthorized access attempted
- Log unauthorized access attempts
- Check ownership on every request

Please:
1. Create withAuthorization() middleware in lib/withAuthorization.ts
2. Implement resource ownership check function
3. Show how to combine with existing security stack
4. Add to API route: withRateLimit(withCsrf(withAuthorization(handler)))
5. Create test showing users can't access others' resources

Reference: OWASP Top 10 - Broken Access Control prevention
```

**When authorization matters:**
- User-generated content (blogs, posts, comments)
- Documents or files (user uploads)
- Projects or workspaces (multi-tenant features)
- Private data (health records, financial data)

---

### Prompt Pattern 11: Custom Security Requirements

**When to use:** Industry-specific compliance (HIPAA, GDPR, PCI-DSS)

**The Prompt:**

```
My SaaS app needs to comply with [HIPAA/GDPR/PCI-DSS/etc.].

Compliance Requirements:
- [List specific requirements from regulation]

Additional Security Needed:
- [Field-level encryption]
- [Audit logging]
- [Data retention policies]
- [Right to deletion]
- [Consent management]

Current Security in Secure Vibe Coding OS:
- CSRF, rate limiting, input validation (already covered)
- Clerk handles auth/session (SOC 2 certified)
- Convex database (GDPR compliant)

Please:
1. Identify gaps between current security and compliance requirements
2. Implement additional security controls needed
3. Add audit logging for sensitive operations
4. Implement data retention/deletion policies
5. Create compliance documentation

Show me the complete compliance implementation plan.
```

---

## Key Takeaways

### The Secure Vibe Coding OS Security Checklist

**Before deploying your customized app:**

#### Foundation Security (Should Already Be Active)
- [ ] CSRF protection working (`withCsrf` on POST routes)
- [ ] Rate limiting enforced (`withRateLimit` on sensitive endpoints)
- [ ] Input validation (Zod schemas) on all user inputs
- [ ] XSS sanitization removing `< > " &`
- [ ] Security headers present (CSP, X-Frame-Options, HSTS)
- [ ] Secure error handling (generic errors in production)
- [ ] 0 known vulnerabilities (`npm audit`)

#### Authentication & Authorization
- [ ] Clerk authentication configured
- [ ] Protected routes use middleware
- [ ] Subscription gating on paid features
- [ ] Authorization checks for owned resources (if applicable)

#### Custom Features Security
- [ ] All custom API routes use security stack
- [ ] Custom validation schemas created for new data types
- [ ] Rate limiting on endpoints that could be abused
- [ ] CSRF on all POST/PUT/DELETE operations
- [ ] Authentication on user-specific features

#### Environment & Deployment
- [ ] Secrets in environment variables (never hardcoded)
- [ ] `.env.local` not committed to Git
- [ ] Separate dev and production credentials configured
- [ ] Production deployment guide followed (DEPLOYMENT.md)

#### Testing Completed
- [ ] Rate limiting tested (`node scripts/test-rate-limit.js`)
- [ ] CSRF protection verified
- [ ] Input validation tested with XSS payloads
- [ ] Authentication flow tested
- [ ] Subscription gating verified
- [ ] Security headers present (`curl -I`)
- [ ] Error handling tested (dev vs prod)

#### Documentation
- [ ] Custom features documented with security controls
- [ ] Security test results recorded
- [ ] Deployment checklist completed
- [ ] Team trained on security requirements (if applicable)

---

## Tips for Maintaining Security

### As You Build New Features

**DO:**
- ✅ Use existing security utilities from `lib/`
- ✅ Follow patterns in `app/api/example-protected/route.ts`
- ✅ Reference `.cursor/rules/security_rules.mdc`
- ✅ Test security controls after each feature
- ✅ Run `npm audit` regularly
- ✅ Keep dependencies updated

**DON'T:**
- ❌ Skip security middlewares to "save time"
- ❌ Modify core security utilities without understanding
- ❌ Hardcode secrets "temporarily"
- ❌ Disable security features for debugging
- ❌ Trust user input without validation
- ❌ Return detailed errors in production

### Prompting Claude Code Securely

**Always include security context:**

```
Following the security standards in .cursor/rules/security_rules.mdc and using the utilities in lib/, implement [your feature]...
```

**Claude Code knows to:**
- Apply security middlewares
- Use validation schemas
- Handle errors securely
- Never hardcode secrets
- Follow defense-in-depth patterns

**Verify Claude's output:**
- Check that security imports are present
- Verify security middlewares applied
- Confirm validation schemas used
- Review error handling
- Test the security controls

---

## Common Mistakes to Avoid

### Mistake 1: Removing Security Middlewares

```typescript
// ❌ BAD - No security protection
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Use body.field directly - DANGER!
}

// ✅ GOOD - Full security stack
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { validateRequest } from '@/lib/validateRequest';

export const POST = withRateLimit(withCsrf(async (request) => {
  const body = await request.json();
  const validation = validateRequest(schema, body);
  if (!validation.success) return validation.response;
  // Use validation.data - SAFE!
}));
```

### Mistake 2: Skipping Input Validation

```typescript
// ❌ BAD - No validation
const { title } = await request.json();
await saveToDatabase(title); // Could contain XSS!

// ✅ GOOD - Validated and sanitized
const validation = validateRequest(safeTextSchema, body);
if (!validation.success) return validation.response;
const { title } = validation.data; // XSS-safe!
await saveToDatabase(title);
```

### Mistake 3: Hardcoding Secrets

```typescript
// ❌ BAD - Hardcoded API key
const apiKey = 'sk-1234567890abcdef';

// ✅ GOOD - Environment variable
const apiKey = process.env.MY_API_KEY;
if (!apiKey) throw new Error('API key not configured');
```

### Mistake 4: Exposing Error Details in Production

```typescript
// ❌ BAD - Leaks internal details
catch (error) {
  return NextResponse.json({
    error: error.message,
    stack: error.stack,
    query: failedQuery
  }, { status: 500 });
}

// ✅ GOOD - Secure error handling
catch (error) {
  return handleApiError(error, 'my-feature');
  // Production: generic message only
  // Development: full details
}
```

### Mistake 5: Forgetting to Test Security

```typescript
// ❌ BAD - Assume security works
// Build feature → Deploy → Hope for the best

// ✅ GOOD - Verify security works
// Build feature → Test security controls → Document results → Deploy
```

---

## Resources

### Project Documentation

**Security:**
- `docs/security/SECURITY_IMPLEMENTATION.md` - Complete security controls guide
- `docs/security/OWASP_TOP_10_ASSESSMENT.md` - Security posture analysis
- `docs/security/security_risk.md` - Risk analysis with examples

**Development:**
- `README.md` - Setup and configuration
- `DEPLOYMENT.md` - 3-environment deployment guide
- `.cursor/rules/security_rules.mdc` - Security rules for AI coding
- `.cursor/rules/convex_rules.mdc` - Convex best practices

**Testing:**
- `scripts/test-rate-limit.js` - Rate limiting verification
- `scripts/security-check.sh` - Dependency audit
- `app/api/example-protected/route.ts` - Complete security example

### External Resources

**Clerk:**
- Authentication: https://clerk.com/docs
- Billing: https://clerk.com/docs/billing
- Security: https://clerk.com/docs/security

**Convex:**
- Documentation: https://docs.convex.dev
- Production deployment: https://docs.convex.dev/production

**Security Standards:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org
- Next.js Security: https://nextjs.org/docs/app/guides/security

---

## Deliverables

By completing this module, you should have:

- [ ] `docs/MY_SAAS_PLAN.md` - Complete application plan
- [ ] `docs/SECURITY_MAPPING.md` - Features mapped to security controls
- [ ] `docs/MY_APP_SECURITY.md` - Your app's security documentation
- [ ] `docs/IMPLEMENTATION_NOTES.md` - Implementation details
- [ ] `docs/SECURITY_TEST_RESULTS.md` - All security tests documented
- [ ] Branded application (NEXT_PUBLIC_SITE_NAME configured)
- [ ] 3+ core features implemented with full security stack
- [ ] Subscription plans configured in Clerk
- [ ] All security controls tested and verified
- [ ] TypeScript building without errors
- [ ] `npm audit` showing 0 vulnerabilities
- [ ] Clear understanding of security architecture
- [ ] Ready for production deployment

**Expected Time:** 3-4 hours

**Note:** This is your foundation for every future SaaS project. Take time to understand the security architecture. Once you master this starter, you can build secure SaaS applications in days instead of weeks.

---

## Next Steps

You now have a production-ready, security-hardened SaaS application foundation. In the next lesson (Module 2.7), you'll learn how to maintain security as you scale, add team members, and evolve your application.

**Before Moving On:** Complete the practical exercise. Don't proceed until you have:
1. At least 3 custom features implemented
2. All security tests passing
3. Documentation complete
4. Clear understanding of each security control

Your secure foundation is only valuable if you keep it secure as you build. The patterns you learned here will guide every feature you add.

---

## Quick Reference: Security Utilities

### When Building Features, Use These:

**API Route Security:**
```typescript
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { validateRequest } from '@/lib/validateRequest';
import { handleApiError } from '@/lib/errorHandler';

export const POST = withRateLimit(withCsrf(handler));
```

**Input Validation:**
```typescript
import { safeTextSchema, emailSchema } from '@/lib/validation';
const validation = validateRequest(schema, data);
```

**Error Handling:**
```typescript
import {
  handleApiError,
  handleUnauthorizedError,
  handleForbiddenError
} from '@/lib/errorHandler';
```

**Authentication:**
```typescript
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();
```

**Subscription Gating:**
```typescript
import { Protect } from '@clerk/nextjs';
<Protect condition={(has) => !has({ plan: "free_user" })} fallback={...}>
```

**Pro Tip:** Keep `.cursor/rules/security_rules.mdc` open as reference. It contains copy-paste templates for all common patterns.

---

## Summary

Secure Vibe Coding OS provides a security-hardened foundation that achieves a 90/100 OWASP security score out of the box, placing it in the top 10% of Next.js applications. The starter embeds defense-in-depth security controls including CSRF protection with HMAC-SHA256 signed tokens, IP-based rate limiting at 5 requests per minute, Zod-powered input validation with automatic XSS sanitization, comprehensive security headers (CSP, HSTS, X-Frame-Options), and environment-aware error handling. Installation requires configuring three accounts (Clerk for authentication, Convex for database, Stripe for payments via Clerk Billing) and takes approximately 30 minutes for basic setup. The security architecture follows a layered approach where every API route automatically inherits protection through utility functions: withRateLimit() prevents brute force attacks, withCsrf() blocks cross-site request forgery, validateRequest() ensures type-safe sanitized input, and handleApiError() prevents information leakage. Customization follows secure patterns where UI changes are safe while security utility modifications require careful review. Building features on this foundation means prompting Claude Code to use pre-built security utilities from lib/, following patterns in app/api/example-protected/route.ts, and referencing .cursor/rules/security_rules.mdc for AI-guided development. Testing security involves running built-in scripts for rate limiting verification, manual CSRF testing, XSS payload testing, and comprehensive dependency auditing. The starter supports professional deployment workflows with separate development, preview, and production environments, each with isolated Clerk instances and Convex deployments. As you customize and extend the starter, maintaining security requires applying security middlewares to all new routes, validating all user input with Zod schemas, using secure error handlers, testing security controls after each feature, and running regular security audits. The result is a production-ready SaaS foundation where security is implemented, not assumed, and every feature you build inherits enterprise-grade protection from day one.

---

## Before Moving On

**Verify your foundation is secure:**

1. ✅ Install Secure Vibe Coding OS and configure all services
2. ✅ Complete the hands-on exercise (3+ features implemented)
3. ✅ All security tests passing
4. ✅ Documentation complete
5. ✅ Understand each security utility and when to use it

**Don't proceed to the next module until:**
- You can explain what each security control does
- You've built at least one feature using the security stack
- All tests in `docs/SECURITY_TEST_RESULTS.md` are passing
- You're comfortable prompting Claude Code to extend the secure foundation

**Your secure SaaS foundation is now ready for production deployment and real users.** 🚀
