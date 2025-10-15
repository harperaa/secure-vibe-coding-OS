# More Secure Starter DIY - Next.js SaaS Starter Kit

A modern, production-ready SaaS starter template for building full-stack applications using Next.js 15, Convex, Clerk, and Clerk Billing. The easiest way to start accepting payments with beautiful UI and seamless integrations.

[🌐 Live Demo](https://more-secure-starter.vercel.app/) – Try the app in your browser!


## Features

- 🚀 **Next.js 15 with App Router** - Latest React framework with server components
- ⚡️ **Turbopack** - Ultra-fast development with hot module replacement
- 🎨 **TailwindCSS v4** - Modern utility-first CSS with custom design system
- 🔐 **Clerk Authentication** - Complete user management with social logins
- 💳 **Clerk Billing** - Integrated subscription management and payments
- 🗄️ **Convex Real-time Database** - Serverless backend with real-time sync
- 🛡️ **Protected Routes** - Authentication-based route protection
- 🔒 **CSRF Protection** - Built-in Cross-Site Request Forgery protection with HMAC-SHA256
- 🔐 **Security Headers** - Automatic security headers (CSP, X-Frame-Options, HSTS)
- 🚦 **Rate Limiting** - IP-based rate limiting (5 requests/minute) to prevent abuse
- ✅ **Input Validation** - Zod-based validation with XSS sanitization
- 🛡️ **Secure Error Handling** - Environment-aware error responses (no data leakage)
- 💰 **Payment Gating** - Subscription-based content access
- 🎭 **Beautiful 404 Page** - Custom animated error page
- 🌗 **Dark/Light Theme** - System-aware theme switching
- 📱 **Responsive Design** - Mobile-first approach with modern layouts
- ✨ **Custom Animations** - React Bits and Framer Motion effects
- 🧩 **shadcn/ui Components** - Modern component library with Radix UI
- 📊 **Interactive Dashboard** - Complete admin interface with charts
- �� **Webhook Integration** - Automated user and payment sync
- 🚢 **Vercel Ready** - One-click deployment

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
```

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
# Test the default test endpoint
node scripts/test-rate-limit.js

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
