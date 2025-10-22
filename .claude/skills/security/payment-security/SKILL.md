---
name: payment-security-clerk-billing-stripe
description: Implement secure payments using Clerk Billing and Stripe without ever touching card data. Use this skill when you need to set up subscription payments, handle webhooks, implement payment gating, understand PCI-DSS compliance, or integrate Stripe Checkout. Triggers include "payment", "Stripe", "Clerk Billing", "subscription", "PCI-DSS", "credit card", "payment security", "checkout", "webhook", "billing".
---

# Payment Security - Clerk Billing + Stripe

## Why We Don't Handle Payments Directly

### PCI-DSS Compliance Requirements

If you store, process, or transmit credit card data, you must comply with **Payment Card Industry Data Security Standard (PCI-DSS)**. Requirements include:

- Annual security audits ($20,000-$50,000)
- Quarterly vulnerability scans
- Secure network architecture
- Encryption of cardholder data
- Access control measures
- Regular security testing

**Small companies:** 84% fail initial PCI audit

**Ongoing compliance costs:** $50,000-$200,000 annually

### Real-World Payment Handling Failures

**Target Breach (2013):**
41 million card accounts compromised because they stored payment data and had insufficient security.
**Settlement: $18.5 million**

**Home Depot Breach (2014):**
56 million cards stolen. They were storing card data locally.
**Settlement: $17.5 million**

### The Secure Approach: Never Touch Card Data

By using Clerk Billing + Stripe, we **never see, store, or transmit** credit card data. We're not subject to PCI-DSS. Stripe is.

## Our Payment Architecture

### What Happens (What DOESN'T Happen)

**User subscribes:**

1. Frontend shows Clerk's `PricingTable` component
2. User clicks subscribe → Clerk opens Stripe Checkout
3. User enters card → **Stripe's servers (not ours)**
4. Stripe processes payment → **Stripe's servers (not ours)**
5. Stripe notifies Clerk → Webhook (verified by Clerk)
6. Clerk updates subscription status
7. Clerk notifies Convex → Webhook to our database
8. Our app reads subscription status → Grants access

### What Never Touches Our Servers

- ❌ Credit card numbers
- ❌ CVV codes
- ❌ Expiration dates
- ❌ Billing addresses (unless user separately provides)

### What We Store

- ✅ Subscription status (free/basic/pro)
- ✅ Subscription start date
- ✅ Customer ID (Stripe's internal ID, not card info)

### This Architecture Means

- We're **NOT subject to PCI-DSS** (Stripe is)
- We **can't leak card data** (we never have it)
- Stripe handles **fraud detection**
- Stripe handles **3D Secure**
- Clerk handles **webhook security**

## Implementation Files

- `components/custom-clerk-pricing.tsx` - Pricing table component
- `app/dashboard/payment-gated/page.tsx` - Example of subscription gating
- `convex/http.ts` - Webhook receiver (signature verified by Svix)

## Setting Up Clerk Billing

### 1. Configure in Clerk Dashboard

1. Go to Clerk Dashboard → Billing
2. Connect Stripe account
3. Create subscription plans (Free, Basic, Pro)
4. Copy Clerk Billing publishable key

### 2. Environment Variables

```bash
# .env.local

# Clerk Billing
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe (automatically configured by Clerk Billing)
# No manual Stripe keys needed!

# Webhook signing secret (from Clerk)
CLERK_WEBHOOK_SECRET=whsec_...
```

### 3. Add Pricing Table Component

```typescript
// components/custom-clerk-pricing.tsx
'use client';

import { PricingTable } from '@clerk/clerk-react';

export function CustomClerkPricing() {
  return (
    <div className="pricing-container">
      <h1>Choose Your Plan</h1>

      <PricingTable
        appearance={{
          elements: {
            card: 'border rounded-lg p-6',
            cardActive: 'border-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
          }
        }}
      />
    </div>
  );
}
```

## Checking Subscription Status

### Server-Side (API Routes)

```typescript
// app/api/premium-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleUnauthorizedError, handleForbiddenError } from '@/lib/errorHandler';

export async function GET(request: NextRequest) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return handleUnauthorizedError();
  }

  // Check subscription status from Clerk
  const plan = sessionClaims?.metadata?.plan as string;

  if (plan === 'free_user') {
    return handleForbiddenError('Premium subscription required');
  }

  // User has paid subscription
  return NextResponse.json({
    message: 'Welcome to premium feature!',
    plan: plan
  });
}
```

### Client-Side (Components)

```typescript
'use client';

import { Protect } from '@clerk/nextjs';
import Link from 'next/link';

export function PremiumFeature() {
  return (
    <Protect
      condition={(has) => !has({ plan: "free_user" })}
      fallback={<UpgradePrompt />}
    >
      <div>
        {/* Premium feature content */}
        <h2>Premium Feature</h2>
        <p>This content is only visible to paid subscribers</p>
      </div>
    </Protect>
  );
}

function UpgradePrompt() {
  return (
    <div className="upgrade-prompt">
      <h3>Upgrade to Premium</h3>
      <p>This feature is available on our paid plans</p>
      <Link href="/pricing">
        <button>View Pricing</button>
      </Link>
    </div>
  );
}
```

## Complete Payment-Gated Page Example

```typescript
// app/dashboard/payment-gated/page.tsx
'use client';

import { Protect } from '@clerk/nextjs';
import { CustomClerkPricing } from '@/components/custom-clerk-pricing';

export default function PaymentGatedPage() {
  return (
    <div>
      <Protect
        condition={(has) => !has({ plan: "free_user" })}
        fallback={
          <div className="upgrade-required">
            <h1>Premium Access Required</h1>
            <p>Subscribe to access this page</p>
            <CustomClerkPricing />
          </div>
        }
      >
        <div className="premium-content">
          <h1>Premium Dashboard</h1>
          <p>Welcome to the premium features!</p>
          {/* Premium features here */}
        </div>
      </Protect>
    </div>
  );
}
```

## Webhook Handling

### Clerk Webhook (User & Subscription Events)

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  // Get webhook headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const { id, type, data } = evt;

  // Handle subscription events
  switch (type) {
    case 'subscription.created':
      await handleSubscriptionCreated(data);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(data);
      break;

    case 'subscription.deleted':
      await handleSubscriptionDeleted(data);
      break;

    case 'user.created':
      await handleUserCreated(data);
      break;

    case 'user.updated':
      await handleUserUpdated(data);
      break;
  }

  return new Response('', { status: 200 });
}

async function handleSubscriptionCreated(data: any) {
  const { user_id, plan, stripe_customer_id } = data;

  // Store subscription in database
  await db.subscriptions.create({
    userId: user_id,
    plan: plan,
    stripeCustomerId: stripe_customer_id,
    status: 'active',
    createdAt: Date.now()
  });

  // Update user metadata
  await db.users.update(
    { clerkId: user_id },
    { plan: plan, updatedAt: Date.now() }
  );
}

async function handleSubscriptionUpdated(data: any) {
  const { user_id, plan, status } = data;

  await db.subscriptions.update(
    { userId: user_id },
    {
      plan: plan,
      status: status,
      updatedAt: Date.now()
    }
  );

  // Update user plan
  await db.users.update(
    { clerkId: user_id },
    { plan: plan }
  );
}

async function handleSubscriptionDeleted(data: any) {
  const { user_id } = data;

  await db.subscriptions.update(
    { userId: user_id },
    {
      status: 'cancelled',
      cancelledAt: Date.now()
    }
  );

  // Downgrade to free
  await db.users.update(
    { clerkId: user_id },
    { plan: 'free_user' }
  );
}
```

### Convex Webhook (Alternative)

If using Convex, you can receive Clerk webhooks directly:

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const headers = request.headers;

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    let evt: any;
    try {
      evt = wh.verify(payload, {
        "svix-id": headers.get("svix-id")!,
        "svix-timestamp": headers.get("svix-timestamp")!,
        "svix-signature": headers.get("svix-signature")!,
      });
    } catch (err) {
      return new Response("Invalid signature", { status: 400 });
    }

    const { type, data } = evt;

    switch (type) {
      case "subscription.created":
        await ctx.runMutation(internal.subscriptions.create, {
          userId: data.user_id,
          plan: data.plan,
          stripeCustomerId: data.stripe_customer_id,
        });
        break;

      case "subscription.updated":
        await ctx.runMutation(internal.subscriptions.update, {
          userId: data.user_id,
          plan: data.plan,
          status: data.status,
        });
        break;

      case "subscription.deleted":
        await ctx.runMutation(internal.subscriptions.cancel, {
          userId: data.user_id,
        });
        break;
    }

    return new Response("", { status: 200 });
  }),
});

export default http;
```

## Testing Payments

### Test Mode (Stripe Test Cards)

**Always use Stripe test cards in development:**

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
Insufficient funds: 4000 0000 0000 9995

CVV: Any 3 digits
Expiry: Any future date
ZIP: Any 5 digits
```

### Testing Subscription Flow

1. Go to `/pricing`
2. Click "Subscribe" on a paid plan
3. Clerk opens Stripe Checkout
4. Enter test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify subscription status updated
7. Check premium features are accessible

### Testing Webhook

```bash
# Use Stripe CLI to forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/clerk

# Trigger test subscription event
stripe trigger subscription.created
```

## Handling Failed Payments

### Failed Payment Flow

1. Stripe attempts to charge card
2. Payment fails (expired card, insufficient funds, etc.)
3. Stripe notifies Clerk
4. Clerk sends webhook: `subscription.payment_failed`
5. We notify user via email
6. Stripe retries (smart retry logic)
7. If still fails after retries → subscription cancelled

### Implementing Payment Failure Handling

```typescript
// In webhook handler
case 'subscription.payment_failed':
  await handlePaymentFailed(data);
  break;

async function handlePaymentFailed(data: any) {
  const { user_id, attempt_count } = data;

  // Update subscription status
  await db.subscriptions.update(
    { userId: user_id },
    {
      status: 'past_due',
      lastPaymentFailed: Date.now(),
      failedAttempts: attempt_count
    }
  );

  // Send email to user
  await sendEmail({
    to: getUserEmail(user_id),
    subject: 'Payment Failed',
    template: 'payment-failed',
    data: {
      attemptCount: attempt_count,
      retryDate: calculateRetryDate(attempt_count)
    }
  });
}
```

## Security Best Practices

### 1. Always Verify Webhooks

❌ **DON'T trust webhook data without verification:**
```typescript
// Bad - no signature verification
export async function POST(request: NextRequest) {
  const data = await request.json();
  // Process data directly - could be forged!
}
```

✅ **DO verify webhook signatures:**
```typescript
// Good - signature verified by Svix
const wh = new Webhook(WEBHOOK_SECRET);
const evt = wh.verify(body, headers); // Throws if invalid
// Now safe to process
```

### 2. Never Store Payment Info

❌ **DON'T store card data:**
```typescript
// Bad - PCI-DSS violation
await db.payments.create({
  userId,
  cardNumber: '4242424242424242', // ❌ NEVER DO THIS
  cvv: '123',                      // ❌ NEVER DO THIS
  expiry: '12/25'                  // ❌ NEVER DO THIS
});
```

✅ **DO store Stripe IDs only:**
```typescript
// Good - no card data
await db.subscriptions.create({
  userId,
  stripeCustomerId: 'cus_123',        // ✅ Stripe internal ID
  stripeSubscriptionId: 'sub_456',   // ✅ Stripe internal ID
  plan: 'pro',
  status: 'active'
});
```

### 3. Check Subscription Status on Server

❌ **DON'T rely on client-side checks:**
```typescript
// Bad - can be bypassed
'use client';
const { user } = useUser();
if (user?.publicMetadata?.plan === 'pro') {
  // Show premium feature - attacker can fake this
}
```

✅ **DO verify on server:**
```typescript
// Good - secure
export async function GET(request: NextRequest) {
  const { sessionClaims } = await auth();
  const plan = sessionClaims?.metadata?.plan;

  if (plan !== 'pro') {
    return handleForbiddenError();
  }

  // Premium feature access
}
```

### 4. Implement Idempotency

Handle duplicate webhooks (Stripe may retry):

```typescript
// Track processed webhook IDs
const processedWebhooks = new Set<string>();

export async function POST(request: NextRequest) {
  const evt = await verifyWebhook(request);
  const { id } = evt;

  // Check if already processed
  if (processedWebhooks.has(id)) {
    return new Response('Already processed', { status: 200 });
  }

  // Process webhook
  await handleWebhook(evt);

  // Mark as processed
  processedWebhooks.add(id);

  return new Response('', { status: 200 });
}
```

## What Clerk Billing Handles

✅ **Stripe API integration** - No manual Stripe code needed
✅ **Customer creation/management** - Automatic
✅ **Subscription lifecycle** - Create, update, cancel
✅ **Webhook signature verification** - Built-in via Svix
✅ **User/subscription sync** - Automatic metadata updates
✅ **Idempotency** - Handles duplicate webhooks
✅ **Retry logic** - Smart retry on failed webhooks

## What This Architecture Prevents

✅ **PCI-DSS compliance burden** - Not subject to PCI-DSS
✅ **Card data breaches** - We never have card data
✅ **Payment fraud** - Stripe's fraud detection
✅ **Webhook forgery** - Svix signature verification
✅ **Man-in-the-middle attacks** - Stripe Checkout is HTTPS only
✅ **Session hijacking** - Clerk's secure session management

## Common Mistakes to Avoid

❌ **DON'T try to process cards yourself**
❌ **DON'T store any payment card information**
❌ **DON'T trust webhook data without verification**
❌ **DON'T rely on client-side subscription checks for access control**
❌ **DON'T forget to handle failed payments**
❌ **DON'T expose Stripe secret keys in client code**

✅ **DO use Clerk Billing + Stripe Checkout**
✅ **DO verify webhook signatures (Svix)**
✅ **DO check subscription status on server**
✅ **DO handle webhook events (created, updated, cancelled)**
✅ **DO test with Stripe test cards in development**
✅ **DO implement idempotency for webhooks**

## References

- Clerk Billing Documentation: https://clerk.com/docs/billing/overview
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- PCI-DSS Standards: https://www.pcisecuritystandards.org/
- Stripe Testing: https://stripe.com/docs/testing
- Webhook Security: https://docs.svix.com/

## Next Steps

- For subscription-based access control: Use `auth-security` skill with Protect component
- For webhook endpoint security: Combine with `rate-limiting` skill
- For error handling in payment processing: Use `error-handling` skill
- For testing: Use `security-testing` skill
