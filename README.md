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

3. Configure your environment variables in `.env.local`:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_here
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here

# Clerk Authentication & Billing
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Clerk Frontend API URL (from JWT template - see step 5)
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

4. Initialize Convex:

```bash
npx convex dev
```

5. Set up Clerk JWT Template:
   - Go to your Clerk dashboard
   - Navigate to JWT Templates
   - Create a new template with name "convex"
   - Copy the Issuer URL - this becomes your `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`
   - Add this URL to both your `.env.local` and Convex environment variables

6. Set up Convex environment variables in your Convex dashboard:

```bash
# In Convex Dashboard Environment Variables
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev
```

7. Set up Clerk webhooks:
   - In your Clerk dashboard, configure webhook endpoint: `{your_domain}/clerk-users-webhook`
   - Enable events: `user.created`, `user.updated`, `user.deleted`, `paymentAttempt.updated`
   - Copy the webhook signing secret to your Convex environment variables

8. Configure Clerk Billing:
   - Set up your pricing plans in Clerk dashboard
   - Configure payment methods and billing settings

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
