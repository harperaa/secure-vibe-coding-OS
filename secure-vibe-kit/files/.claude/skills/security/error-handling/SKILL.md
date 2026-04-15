---
name: secure-error-handling
description: Implement secure error handling to prevent information leakage and provide appropriate error responses. Use this skill when you need to handle errors in API routes, prevent stack trace exposure, implement environment-aware error messages, or use the error handler utilities. Triggers include "error handling", "handle errors", "error messages", "information leakage", "stack trace", "handleApiError", "production errors", "error responses".
---

# Secure Error Handling - Preventing Information Leakage

## The Error Message Problem

Error messages are designed to help developers debug. But in production, **detailed errors help attackers more than they help users**.

### What Attackers Learn from Error Messages

**Database structure:**
```
Error: column 'credit_cards.number' does not exist
```
→ Attacker now knows you have a `credit_cards` table

**File paths:**
```
Error at /var/www/app/lib/payment.js:47
```
→ Attacker learns your directory structure

**Dependencies:**
```
Stripe API error: Invalid API key format
```
→ Attacker knows you use Stripe

**System info:**
```
PostgreSQL 9.4 connection failed
```
→ Attacker learns your database version and can look up known vulnerabilities

### Real-World Information Leakage

According to SANS Institute research, **74% of successful attacks start with reconnaissance** phase where attackers gather information about the target system. **Error messages are a primary source** of this intelligence.

**Equifax Breach (2017):**
Detailed error messages revealed they were using Apache Struts with a known vulnerability. Attackers exploited this revealed information.

## Our Error Handling Architecture

### Environment-Aware Error Responses

**Development Mode:**
```javascript
{
  error: "Database connection failed",
  stack: "Error: connection timeout at db.connect (database.js:42:15)...",
  context: "user-profile-update",
  timestamp: "2025-10-15T10:30:00Z"
}
```
→ Developers get full details for debugging

**Production Mode:**
```javascript
{
  error: "Internal server error",
  message: "An unexpected error occurred. Please try again later."
}
```
→ Users get safe, generic message

### The Logging Strategy

**All errors are logged server-side** with full details (for investigation), but **only generic messages are sent to clients** in production. This gives us debugging capability without information leakage.

## Implementation Files

- `lib/errorHandler.ts` - 5 error handlers for different scenarios

## Available Error Handlers

### 1. handleApiError(error, context)

**Use for:** Unexpected errors (HTTP 500)

```typescript
import { handleApiError } from '@/lib/errorHandler';

async function handler(request: NextRequest) {
  try {
    // Risky operation
    await processPayment(data);
    return NextResponse.json({ success: true });

  } catch (error) {
    return handleApiError(error, 'payment-processing');
    // Production: "Internal server error"
    // Development: Full stack trace
  }
}
```

**Returns:**
- **Development:** Full error with stack trace
- **Production:** Generic "Internal server error" message
- **HTTP Status:** 500

### 2. handleValidationError(message, details)

**Use for:** Input validation failures (HTTP 400)

```typescript
import { handleValidationError } from '@/lib/errorHandler';

if (!isValidEmail(email)) {
  return handleValidationError(
    'Validation failed',
    { email: 'Invalid email format' }
  );
}
```

**Returns:**
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format"
  }
}
```
- **HTTP Status:** 400
- **Both dev and production:** Returns detailed field errors (helps users fix input)

### 3. handleForbiddenError(message)

**Use for:** Authorization failures (HTTP 403)

```typescript
import { handleForbiddenError } from '@/lib/errorHandler';

// Check if user owns this resource
if (resource.userId !== userId) {
  return handleForbiddenError('You do not have access to this resource');
}
```

**Returns:**
```json
{
  "error": "Forbidden",
  "message": "You do not have access to this resource"
}
```
- **HTTP Status:** 403
- **Both dev and production:** Returns the provided message

### 4. handleUnauthorizedError(message)

**Use for:** Authentication failures (HTTP 401)

```typescript
import { handleUnauthorizedError } from '@/lib/errorHandler';
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) {
  return handleUnauthorizedError('Authentication required');
}
```

**Returns:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```
- **HTTP Status:** 401
- **Both dev and production:** Returns the provided message
- **Default message:** "Authentication required" if no message provided

### 5. handleNotFoundError(resource)

**Use for:** Resource not found (HTTP 404)

```typescript
import { handleNotFoundError } from '@/lib/errorHandler';

const post = await db.posts.findOne({ id: postId });
if (!post) {
  return handleNotFoundError('Post');
}
```

**Returns:**
```json
{
  "error": "Not found",
  "message": "Post not found"
}
```
- **HTTP Status:** 404
- **Both dev and production:** Returns resource-specific message

## Complete Error Handling Examples

### Example 1: Protected API Route with Full Error Handling

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateRequest } from '@/lib/validateRequest';
import { idSchema } from '@/lib/validation';
import {
  handleApiError,
  handleUnauthorizedError,
  handleForbiddenError,
  handleNotFoundError,
  handleValidationError
} from '@/lib/errorHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return handleUnauthorizedError('Please sign in to view posts');
    }

    // Validate ID parameter
    const validation = validateRequest(idSchema, params.id);
    if (!validation.success) {
      return handleValidationError('Invalid post ID', { id: 'Must be valid ID' });
    }

    const postId = validation.data;

    // Fetch post
    const post = await db.posts.findOne({ id: postId });

    // Handle not found
    if (!post) {
      return handleNotFoundError('Post');
    }

    // Check authorization
    if (post.userId !== userId && !post.isPublic) {
      return handleForbiddenError('You do not have access to this post');
    }

    return NextResponse.json({ post });

  } catch (error) {
    // Catch unexpected errors
    return handleApiError(error, 'get-post');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return handleUnauthorizedError();
    }

    const validation = validateRequest(idSchema, params.id);
    if (!validation.success) {
      return handleValidationError('Invalid post ID', validation.error);
    }

    const postId = validation.data;
    const post = await db.posts.findOne({ id: postId });

    if (!post) {
      return handleNotFoundError('Post');
    }

    // Only post owner can delete
    if (post.userId !== userId) {
      return handleForbiddenError('Only the post author can delete this post');
    }

    await db.posts.delete({ id: postId });

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleApiError(error, 'delete-post');
  }
}
```

### Example 2: Payment Processing with Detailed Error Handling

```typescript
// app/api/process-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { auth } from '@clerk/nextjs/server';
import { handleApiError, handleUnauthorizedError, handleValidationError } from '@/lib/errorHandler';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function paymentHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return handleUnauthorizedError();
    }

    const body = await request.json();
    const { amount, paymentMethodId } = body;

    // Validate amount
    if (!amount || amount < 50) {
      return handleValidationError('Invalid amount', {
        amount: 'Amount must be at least $0.50'
      });
    }

    // Process payment
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        metadata: { userId }
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id
      });

    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      console.error('Stripe error:', stripeError);

      // Don't expose Stripe error details to client
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          {
            error: 'Payment failed',
            message: 'Your card was declined. Please try a different payment method.'
          },
          { status: 400 }
        );
      }

      // Generic error for other Stripe issues
      return NextResponse.json(
        {
          error: 'Payment processing failed',
          message: 'Unable to process payment. Please try again later.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // Catch-all for unexpected errors
    return handleApiError(error, 'process-payment');
  }
}

export const POST = withRateLimit(withCsrf(paymentHandler));

export const config = {
  runtime: 'nodejs',
};
```

### Example 3: Database Operation with Error Handling

```typescript
// app/api/users/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateRequest } from '@/lib/validateRequest';
import { updateProfileSchema } from '@/lib/validation';
import {
  handleApiError,
  handleUnauthorizedError,
  handleForbiddenError,
  handleNotFoundError
} from '@/lib/errorHandler';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return handleUnauthorizedError();
    }

    // Users can only update their own profile
    if (params.id !== userId) {
      return handleForbiddenError('You can only update your own profile');
    }

    const body = await request.json();

    // Validate input
    const validation = validateRequest(updateProfileSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { displayName, bio, website } = validation.data;

    // Update profile
    try {
      const updatedProfile = await db.profiles.update(
        { userId },
        {
          displayName,
          bio,
          website,
          updatedAt: Date.now()
        }
      );

      if (!updatedProfile) {
        return handleNotFoundError('Profile');
      }

      return NextResponse.json({ profile: updatedProfile });

    } catch (dbError: any) {
      // Log database error for debugging
      console.error('Database error:', dbError);

      // Don't expose database structure to client
      if (dbError.code === 'UNIQUE_VIOLATION') {
        return NextResponse.json(
          {
            error: 'Update failed',
            message: 'This username is already taken'
          },
          { status: 409 }
        );
      }

      // Generic database error
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to update profile. Please try again.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    return handleApiError(error, 'update-profile');
  }
}
```

## Error Handler Implementation

### lib/errorHandler.ts

```typescript
import { NextResponse } from 'next/server';

export function handleApiError(error: unknown, context: string) {
  console.error(`[${context}] Error:`, error);

  if (process.env.NODE_ENV === 'production') {
    // Production: Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      },
      { status: 500 }
    );
  } else {
    // Development: Full error details
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export function handleValidationError(
  message: string,
  details: Record<string, string>
) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      message,
      details
    },
    { status: 400 }
  );
}

export function handleForbiddenError(message?: string) {
  return NextResponse.json(
    {
      error: 'Forbidden',
      message: message || 'Access denied'
    },
    { status: 403 }
  );
}

export function handleUnauthorizedError(message?: string) {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: message || 'Authentication required'
    },
    { status: 401 }
  );
}

export function handleNotFoundError(resource: string) {
  return NextResponse.json(
    {
      error: 'Not found',
      message: `${resource} not found`
    },
    { status: 404 }
  );
}
```

## Logging Best Practices

### What to Log

**✅ Safe to Log:**
- Error type/code
- Context (which operation failed)
- User ID (for tracking issues)
- Timestamp
- Request path
- HTTP status code
- IP addresses (for security monitoring)
- Operation names
- Last 4 digits of card (for reference only)
- Transaction IDs

**❌ Never Log:**
- Passwords (even hashed)
- Credit card numbers (full)
- CVV codes
- API keys/secrets/tokens
- Personal Identifiable Information (full addresses, SSN, etc.)
- Session tokens
- Encryption keys
- Full request/response bodies (may contain sensitive data)
- Environment variables (`process.env`)
- Full error stack traces (in production)

### Secure Logging Example

```typescript
// ✅ Good logging
console.error('Payment failed', {
  userId,
  errorCode: error.code,
  errorType: error.type,
  timestamp: new Date().toISOString(),
  path: request.nextUrl.pathname
});

// ❌ Bad logging
console.error('Payment failed', {
  userId,
  creditCard: cardNumber, // ❌ Never log payment info
  apiKey: stripeKey,      // ❌ Never log secrets
  request: req.body       // ❌ May contain sensitive data
});
```

### Redacting Sensitive Fields

Always redact sensitive data before logging:

```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'ssn',
  'creditCard', 'cvv', 'cardNumber'
];

function safelog(data: any) {
  const sanitized = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  console.log(sanitized);
}

// Usage
safelog({
  userId: 'user123',
  email: 'user@example.com',
  password: 'secret123' // Will be [REDACTED]
});
```

### Production Logging Setup

```typescript
// lib/logger.ts
export function logSecurityEvent(event: {
  type: string;
  userId?: string;
  ip?: string;
  details?: Record<string, any>;
}) {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (Vercel logs, Datadog, etc.)
    console.log(JSON.stringify(logEntry));
  } else {
    // Pretty print in development
    console.log('Security Event:', logEntry);
  }
}

// Usage
logSecurityEvent({
  type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  userId,
  ip: request.ip,
  details: {
    path: request.nextUrl.pathname,
    method: request.method
  }
});
```

## Client-Side Error Handling

### Graceful Error Display

```typescript
// components/ErrorDisplay.tsx
export function ErrorDisplay({ error }: { error: ApiError }) {
  const getMessage = () => {
    switch (error.status) {
      case 400:
        return error.details
          ? Object.entries(error.details).map(([field, msg]) =>
              `${field}: ${msg}`
            ).join(', ')
          : 'Invalid input. Please check your data.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You don\'t have permission to do that.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
        return 'Something went wrong. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="error-message">
      {getMessage()}
    </div>
  );
}
```

### Fetch with Error Handling

```typescript
async function createPost(data: PostData) {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle different error types
      switch (response.status) {
        case 400:
          // Validation error - show field errors
          if (error.details) {
            showFieldErrors(error.details);
          }
          break;
        case 401:
          // Redirect to login
          router.push('/sign-in');
          break;
        case 403:
          // Show access denied message
          alert(error.message);
          break;
        case 429:
          // Rate limited - show retry message
          alert(`Too many requests. Please wait ${error.retryAfter} seconds.`);
          break;
        default:
          // Generic error
          alert('An error occurred. Please try again.');
      }

      return null;
    }

    return await response.json();

  } catch (error) {
    console.error('Network error:', error);
    alert('Network error. Please check your connection.');
    return null;
  }
}
```

## What Secure Error Handling Prevents

✅ **Information disclosure** - No system details exposed
✅ **System fingerprinting** - Can't identify technology stack
✅ **Database structure revelation** - No schema details in errors
✅ **Technology stack identification** - Generic errors only
✅ **Attack surface reconnaissance** - Minimal information leakage
✅ **Path disclosure** - No file system paths exposed
✅ **Version disclosure** - No software versions revealed

## Common Mistakes to Avoid

❌ **DON'T return error.message directly to clients**
❌ **DON'T include stack traces in production responses**
❌ **DON'T expose database errors to clients**
❌ **DON'T log sensitive data (passwords, tokens, cards)**
❌ **DON'T use same error messages for dev and prod**
❌ **DON'T forget to log errors server-side for debugging**

✅ **DO use handleApiError() for unexpected errors**
✅ **DO use specific handlers for known error types**
✅ **DO log errors server-side with context**
✅ **DO return helpful (but safe) messages to users**
✅ **DO use appropriate HTTP status codes**
✅ **DO sanitize error messages before sending to client**

## References

- OWASP Error Handling Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- OWASP Top 10 2021 - A04 Insecure Design: https://owasp.org/Top10/A04_2021-Insecure_Design/
- HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- Node.js Error Handling: https://nodejs.org/api/errors.html

## Next Steps

- For input validation errors: Use `input-validation` skill with `validateRequest()`
- For authentication errors: Use `auth-security` skill
- For testing error responses: Use `security-testing` skill
- For complete API security: Combine all error handlers appropriately
