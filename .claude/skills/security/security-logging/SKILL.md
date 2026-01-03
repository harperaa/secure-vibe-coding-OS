---
name: security-logging
description: Log security events with PII sanitization using the centralized security logger. Use this skill when implementing security monitoring, logging violations, building security dashboards, or testing security event detection. Triggers include "security logging", "log security event", "security dashboard", "logSecurity", "securityLogger", "PII sanitization", "security events", "violation logging", "test-security endpoint".
---

# Security Logging

## Overview

Secure logging of security events is critical for monitoring, incident response, and compliance. This skill covers PII sanitization, consistent event structure, and integration with the security dashboard.

## The Security Logger Library

Location: `convex/lib/securityLogger.ts`

The security logger provides:
- PII sanitization (emails, names, IDs are hashed/masked)
- Consistent event structure across the application
- Direct database insert for reliable logging
- Type-safe event types and severity levels

### Basic Usage

```typescript
import { logSecurity, SecurityEventType, SecuritySeverity } from "./lib/securityLogger";

// Inside a Convex mutation handler:
const eventId = await logSecurity(
  ctx,
  userId,
  "xss_attempt" as SecurityEventType,
  "critical" as SecuritySeverity,
  {
    endpoint: "/api/submit",
    origin: request.headers.get("origin"),
    ipAddress: clientIp,
    errorMessage: "XSS pattern detected: <script>",
    requestPayload: sanitizedPayload.substring(0, 200),
  }
);
```

## Security Event Types

```typescript
type SecurityEventType =
  | "origin_mismatch"           // CORS/origin validation failed
  | "rate_limit_exceeded"       // Too many requests
  | "invalid_api_key"           // Bad or expired API key
  | "fingerprint_change"        // Browser fingerprint changed mid-session
  | "suspicious_activity"       // Generic suspicious behavior
  | "jwt_validation_failed"     // Invalid JWT token
  | "unauthorized_access"       // Access denied to protected resource
  | "input_validation_failed"   // Malicious input detected
  | "replay_detected"           // Duplicate nonce/request replay
  | "not_found_enumeration"     // Multiple 404s suggesting enumeration
  | "jwt_algorithm_attack"      // JWT algorithm substitution attack
  | "tenant_isolation_attack"   // Multi-tenant isolation bypass attempt
  | "jwt_replay_attack"         // JWT token reuse attack
  | "xss_attempt"               // Cross-site scripting attempt
  | "fingerprint_manipulation"  // Spoofed browser fingerprint
  | "http_origin_blocked"       // HTTP (non-HTTPS) origin blocked
  | "prompt_injection_attempt"  // AI prompt injection detected
  | "ai_response_validation_failed" // AI response failed validation
  | "csrf_validation_failed";   // Missing or invalid CSRF token

type SecuritySeverity = "low" | "medium" | "high" | "critical";
```

## Metadata Structure

```typescript
interface SecurityMetadata {
  endpoint: string;              // Required: API endpoint that was hit
  origin?: string;               // Request origin header
  ipAddress?: string;            // Client IP address
  fingerprint?: string;          // Browser fingerprint
  errorMessage?: string;         // Human-readable error description
  endUserEmail?: string;         // Affected user's email (will be sanitized)
  endUserName?: string;          // Affected user's name (will be sanitized)
  endUserId?: string;            // Affected user's ID
  actionType?: string;           // Type of action attempted
  requestPayload?: string;       // Truncated request body (max 200 chars)
}
```

## Implementation Patterns

### Pattern 1: Logging from Authenticated API Routes

```typescript
// app/api/protected/route.ts
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  // Get auth and set token on Convex client
  const authResult = await auth();
  const token = await authResult.getToken({ template: 'convex' });
  if (token) {
    convex.setAuth(token);
  }

  const body = await request.json();

  // Detect violation
  if (detectXSS(body.input)) {
    await convex.mutation(api.security.logSecurityEventForCurrentUser, {
      eventType: 'xss_attempt',
      severity: 'critical',
      metadata: {
        endpoint: '/api/protected',
        errorMessage: 'XSS pattern detected',
        requestPayload: body.input.substring(0, 200),
      },
    });
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

### Pattern 2: Logging from Convex Mutations

For direct logging within Convex mutations using authenticated users:

```typescript
// convex/posts.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrowForMutation } from "./users";
import { logSecurity } from "./lib/securityLogger";

export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    // Check for malicious input
    if (detectXSS(args.content)) {
      // Log the security event
      await logSecurity(
        ctx,
        user._id,
        "xss_attempt",
        "critical",
        {
          endpoint: "posts.createPost",
          errorMessage: "XSS pattern detected in post content",
          requestPayload: args.content.substring(0, 200),
        }
      );
      throw new Error("Invalid content");
    }

    // Continue with normal operation
    return await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      userId: user._id,
    });
  },
});
```

### Pattern 3: Logging Security Events Mutation

A dedicated mutation for logging security events from authenticated users:

```typescript
// convex/security.ts
export const logSecurityEventForCurrentUser = mutation({
  args: {
    eventType: eventTypeValidator,
    severity: severityValidator,
    metadata: metadataValidator,
  },
  returns: v.id("securityEvents"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    // Use security logger for PII sanitization
    const eventId = await logSecurity(
      ctx,
      user._id,
      args.eventType as SecurityEventType,
      args.severity as SecuritySeverity,
      {
        endpoint: args.metadata.endpoint || "unknown",
        origin: args.metadata.origin,
        ipAddress: args.metadata.ipAddress,
        errorMessage: args.metadata.errorMessage,
        requestPayload: args.metadata.requestPayload,
      }
    );

    return eventId;
  },
});
```

## Attack Detection Patterns

### XSS Detection

```typescript
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<img[^>]+onerror/gi,
];

function detectXSS(input: string): string | null {
  for (const pattern of XSS_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state for global patterns
    if (pattern.test(input)) {
      return pattern.source;
    }
  }
  return null;
}
```

### SQL Injection Detection

```typescript
const SQL_INJECTION_PATTERNS = [
  /('\s*OR\s*'1'\s*=\s*'1)/gi,
  /('\s*OR\s*1\s*=\s*1)/gi,
  /(--\s*$)/gm,
  /(;\s*DROP\s+TABLE)/gi,
  /(UNION\s+SELECT)/gi,
];
```

### Prompt Injection Detection

```typescript
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above)?\s*instructions/gi,
  /disregard\s+(all\s+)?(previous|the)?\s*instructions/gi,
  /forget\s+(everything|all|your)\s+(you|instructions|were|told)/gi,
  /you\s+are\s+now\s+in\s+developer\s+mode/gi,
  /pretend\s+you\s+are\s+dan/gi,
  /\[system\]/gi,
];
```

## Testing Security Events

### Via Real Middleware (Recommended)

Security events are automatically logged when violations occur in the real middleware. Test by triggering actual violations:

```bash
# Start the dev server first
npm run dev

# Run the rate limit test script (triggers rate_limit_exceeded events)
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

### Event Types Logged by Middleware

| Middleware | Event Type | Severity | Trigger |
|------------|------------|----------|---------|
| withRateLimit | `rate_limit_exceeded` | medium | >5 requests/minute from same IP |
| withCsrf | `csrf_validation_failed` | critical | Missing or invalid CSRF token |

## Security Best Practices

1. **Truncate request payloads** - Never log full payloads; limit to 200 characters
2. **Use the security logger** - It handles PII sanitization automatically
3. **Generic error messages** - Never reveal detection patterns to attackers
4. **Localhost-only test endpoints** - Restrict test APIs to localhost in production
5. **User ownership** - Always associate events with the correct user ID
6. **Reset regex state** - Set `pattern.lastIndex = 0` before testing global regexes

## Schema Requirements

The `securityEvents` table must exist in your Convex schema:

```typescript
// convex/schema.ts
securityEvents: defineTable({
  userId: v.id("users"),
  eventType: v.string(),
  severity: v.string(),
  metadata: v.object({
    origin: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    fingerprint: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    endUserEmail: v.optional(v.string()),
    endUserName: v.optional(v.string()),
    endUserId: v.optional(v.string()),
    actionType: v.optional(v.string()),
    requestPayload: v.optional(v.string()),
  }),
  timestamp: v.number(),
  isRead: v.boolean(),
}).index("byUser", ["userId"]),
```

## Related Skills

- [Input Validation](../input-validation/SKILL.md) - XSS prevention patterns
- [CSRF Protection](../csrf-protection/SKILL.md) - CSRF token validation
- [AI Chat Protection](../ai-chat-protection/SKILL.md) - Prompt injection prevention
- [Error Handling](../error-handling/SKILL.md) - Secure error responses
