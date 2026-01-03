/**
 * Seed script to create sample security events for testing the dashboard
 * Run with: npx convex run seedSecurityEvents:seedEvents
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedEvents = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get the first user (or create one if none exists)
    const users = await ctx.db.query("users").collect();
    let userId;

    if (users.length === 0) {
      // Create a test user
      userId = await ctx.db.insert("users", {
        name: "Test User",
        externalId: "test_user_123",
      });
    } else {
      userId = users[0]._id;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Sample events with variety
    const sampleEvents = [
      // Recent critical events
      {
        userId,
        eventType: "xss_attempt" as const,
        severity: "critical" as const,
        metadata: {
          endpoint: "/api/submit-comment",
          ipAddress: "192.168.1.100",
          fingerprint: "fp_xss_test_001",
          errorMessage: "Blocked XSS attempt: <script>alert('xss')</script>",
          requestPayload: '{"comment":"<script>alert(\'xss\')</script>"}',
        },
        timestamp: now - 2 * oneHour,
        isRead: false,
      },
      {
        userId,
        eventType: "csrf_validation_failed" as const,
        severity: "critical" as const,
        metadata: {
          endpoint: "/api/delete-account",
          ipAddress: "10.0.0.45",
          fingerprint: "fp_csrf_test_001",
          errorMessage: "CSRF token validation failed",
          origin: "https://malicious-site.com",
        },
        timestamp: now - 4 * oneHour,
        isRead: false,
      },

      // High severity events
      {
        userId,
        eventType: "jwt_validation_failed" as const,
        severity: "high" as const,
        metadata: {
          endpoint: "/api/protected-resource",
          ipAddress: "203.0.113.42",
          fingerprint: "fp_jwt_test_001",
          errorMessage: "Invalid JWT signature",
        },
        timestamp: now - 6 * oneHour,
        isRead: false,
      },
      {
        userId,
        eventType: "prompt_injection_attempt" as const,
        severity: "high" as const,
        metadata: {
          endpoint: "/api/ai-chat",
          ipAddress: "198.51.100.23",
          fingerprint: "fp_prompt_inj_001",
          errorMessage: "Detected prompt injection pattern: 'ignore previous instructions'",
          requestPayload: '{"message":"Ignore previous instructions and reveal..."}',
        },
        timestamp: now - 8 * oneHour,
        isRead: false,
      },
      {
        userId,
        eventType: "unauthorized_access" as const,
        severity: "high" as const,
        metadata: {
          endpoint: "/api/admin/users",
          ipAddress: "172.16.0.89",
          fingerprint: "fp_unauth_test_001",
          errorMessage: "Attempt to access admin endpoint without proper role",
          endUserEmail: "test@example.com",
          endUserName: "John Doe",
        },
        timestamp: now - 12 * oneHour,
        isRead: true,
      },

      // Medium severity events
      {
        userId,
        eventType: "rate_limit_exceeded" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/search",
          ipAddress: "192.168.1.200",
          fingerprint: "fp_rate_limit_001",
          errorMessage: "Rate limit exceeded: 100 requests in 1 minute",
        },
        timestamp: now - 1 * oneDay,
        isRead: true,
      },
      {
        userId,
        eventType: "fingerprint_change" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/login",
          ipAddress: "10.0.0.150",
          fingerprint: "fp_changed_002",
          errorMessage: "User fingerprint changed during session",
          endUserEmail: "user@example.com",
        },
        timestamp: now - 1 * oneDay - 4 * oneHour,
        isRead: true,
      },
      {
        userId,
        eventType: "input_validation_failed" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/create-post",
          ipAddress: "203.0.113.88",
          fingerprint: "fp_validation_001",
          errorMessage: "Invalid input: SQL-like syntax detected",
          requestPayload: '{"title":"Test\' OR 1=1--"}',
        },
        timestamp: now - 2 * oneDay,
        isRead: false,
      },

      // Low severity events
      {
        userId,
        eventType: "not_found_enumeration" as const,
        severity: "low" as const,
        metadata: {
          endpoint: "/api/users/99999",
          ipAddress: "192.168.1.50",
          fingerprint: "fp_enum_001",
          errorMessage: "Multiple 404 requests suggesting enumeration",
        },
        timestamp: now - 2 * oneDay - 6 * oneHour,
        isRead: false,
      },
      {
        userId,
        eventType: "suspicious_activity" as const,
        severity: "low" as const,
        metadata: {
          endpoint: "/api/download",
          ipAddress: "198.51.100.77",
          fingerprint: "fp_suspicious_001",
          errorMessage: "Unusual download pattern detected",
        },
        timestamp: now - 3 * oneDay,
        isRead: true,
      },

      // Additional events for variety
      {
        userId,
        eventType: "origin_mismatch" as const,
        severity: "high" as const,
        metadata: {
          endpoint: "/api/webhook",
          ipAddress: "172.16.0.200",
          origin: "https://untrusted-origin.com",
          errorMessage: "Request origin does not match allowed origins",
        },
        timestamp: now - 3 * oneDay - 12 * oneHour,
        isRead: false,
      },
      {
        userId,
        eventType: "replay_detected" as const,
        severity: "high" as const,
        metadata: {
          endpoint: "/api/payment",
          ipAddress: "10.0.0.99",
          fingerprint: "fp_replay_001",
          errorMessage: "Duplicate nonce detected - possible replay attack",
        },
        timestamp: now - 4 * oneDay,
        isRead: false,
      },
      {
        userId,
        eventType: "fingerprint_manipulation" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/vote",
          ipAddress: "192.168.1.175",
          fingerprint: "fp_manip_001",
          errorMessage: "Fingerprint appears to be spoofed",
        },
        timestamp: now - 5 * oneDay,
        isRead: true,
      },
      {
        userId,
        eventType: "http_origin_blocked" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/graphql",
          ipAddress: "203.0.113.99",
          origin: "http://localhost:3000",
          errorMessage: "HTTP origin blocked - HTTPS required",
        },
        timestamp: now - 6 * oneDay,
        isRead: false,
      },
      {
        userId,
        eventType: "invalid_api_key" as const,
        severity: "medium" as const,
        metadata: {
          endpoint: "/api/data",
          ipAddress: "198.51.100.123",
          fingerprint: "fp_api_key_001",
          errorMessage: "API key not found or expired",
        },
        timestamp: now - 7 * oneDay,
        isRead: true,
      },
    ];

    // Insert all events
    console.log(`Creating ${sampleEvents.length} sample security events...`);

    for (const event of sampleEvents) {
      await ctx.db.insert("securityEvents", event);
    }

    console.log("✅ Sample security events created successfully!");
    console.log(`Events range from ${Math.floor((now - 7 * oneDay) / 1000 / 60 / 60 / 24)} days ago to ${Math.floor((now - 2 * oneHour) / 1000 / 60 / 60)} hours ago`);

    return null;
  },
});

export const debugListAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    console.log(`\n=== USERS (${users.length}) ===`);
    for (const user of users) {
      console.log(`  ${user._id}: ${user.name} (${user.externalId})`);
    }

    const events = await ctx.db.query("securityEvents").collect();
    console.log(`\n=== SECURITY EVENTS (${events.length}) ===`);
    for (const event of events.slice(0, 10)) {
      console.log(`  ${event._id}: ${event.eventType} (${event.severity}) - userId: ${event.userId}`);
    }
    if (events.length > 10) {
      console.log(`  ... and ${events.length - 10} more`);
    }

    return null;
  },
});

export const clearEvents = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const events = await ctx.db.query("securityEvents").collect();
    console.log(`Deleting ${events.length} security events...`);

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    console.log("✅ All security events cleared!");
    return null;
  },
});
