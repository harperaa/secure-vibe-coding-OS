#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * =========================
 *
 * USAGE:
 * ------
 * node scripts/test-rate-limit.js
 * node scripts/test-rate-limit.js --port=3001
 * node scripts/test-rate-limit.js /api/custom-endpoint
 * node scripts/test-rate-limit.js /api/custom-endpoint --port=3001
 *
 * WHAT THIS TESTS:
 * ----------------
 * - Rate limiting: 5 requests per minute per IP address
 * - Expected behavior:
 *   - First 5 requests: HTTP 200 (Success)
 *   - Remaining requests: HTTP 429 (Rate Limited)
 *
 * HOW TO PROTECT YOUR API ROUTES:
 * --------------------------------
 *
 * 1. BASIC RATE LIMITING:
 *    Create your API route: app/api/your-route/route.ts
 *
 *    import { NextRequest, NextResponse } from 'next/server';
 *    import { withRateLimit } from '@/lib/withRateLimit';
 *
 *    async function yourHandler(request: NextRequest) {
 *      // Your API logic here
 *      return NextResponse.json({ success: true });
 *    }
 *
 *    // Apply rate limiting (5 requests/minute per IP)
 *    export const POST = withRateLimit(yourHandler);
 *
 * 2. RATE LIMITING + CSRF PROTECTION:
 *    For sensitive operations, combine both protections:
 *
 *    import { withRateLimit } from '@/lib/withRateLimit';
 *    import { withCsrf } from '@/lib/withCsrf';
 *
 *    async function sensitiveHandler(request: NextRequest) {
 *      // Your sensitive API logic
 *      return NextResponse.json({ success: true });
 *    }
 *
 *    // Apply both protections (order matters: rate limit first, then CSRF)
 *    export const POST = withRateLimit(withCsrf(sensitiveHandler));
 *
 * 3. TEST YOUR PROTECTED ROUTE:
 *    After adding withRateLimit() to your route, test it:
 *
 *    node scripts/test-rate-limit.js /api/your-route
 *
 * NOTES:
 * ------
 * - All routes using withRateLimit() share the same 5 req/min budget per IP
 * - Wait 60 seconds between tests for the rate limit to reset
 * - The default test endpoint is: /api/test-rate-limit
 */

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const PORT = portArg ? portArg.split('=')[1] : (process.env.PORT || '3000');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// First non-flag argument is the endpoint
const ENDPOINT_ARG = args.find(arg => !arg.startsWith('--'));
const DEFAULT_ENDPOINT = '/api/test-rate-limit';
const ENDPOINT = ENDPOINT_ARG || DEFAULT_ENDPOINT;
const NUM_REQUESTS = 10;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function testRateLimit() {
  console.log(colorize('\nTesting Rate Limiting (5 requests/minute per IP)', 'bold'));
  console.log(colorize('='.repeat(55), 'cyan'));
  console.log(colorize(`\nEndpoint: ${BASE_URL}${ENDPOINT}`, 'cyan'));
  console.log(colorize(`Making ${NUM_REQUESTS} consecutive requests...\n`, 'cyan'));

  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINT}`);
      const data = await response.json();

      if (response.status === 200) {
        console.log(
          colorize(`Request ${i.toString().padStart(2)}: ✓ ${response.status}`, 'green'),
          '-',
          JSON.stringify(data)
        );
        successCount++;
      } else if (response.status === 429) {
        console.log(
          colorize(`Request ${i.toString().padStart(2)}: ✗ ${response.status}`, 'red'),
          '-',
          JSON.stringify(data)
        );
        rateLimitedCount++;
      } else {
        console.log(
          colorize(`Request ${i.toString().padStart(2)}: ? ${response.status}`, 'yellow'),
          '-',
          JSON.stringify(data)
        );
      }
    } catch (error) {
      console.log(
        colorize(`Request ${i.toString().padStart(2)}: ERROR`, 'red'),
        '-',
        error.message
      );
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log(colorize('\n' + '='.repeat(55), 'cyan'));
  console.log(colorize('\nTest Results:', 'bold'));
  console.log(`  ${colorize('✓', 'green')} Successful requests: ${successCount}`);
  console.log(`  ${colorize('✗', 'red')} Rate limited requests: ${rateLimitedCount}`);

  // Validation
  console.log(colorize('\nValidation:', 'bold'));
  if (successCount === 5 && rateLimitedCount === 5) {
    console.log(colorize('  ✓ Rate limiting is working correctly!', 'green'));
    console.log('    - First 5 requests succeeded (allowed)');
    console.log('    - Remaining 5 requests blocked (rate limited)');
  } else {
    console.log(colorize('  ✗ Unexpected results!', 'red'));
    console.log(`    - Expected: 5 successful, 5 rate limited`);
    console.log(`    - Got: ${successCount} successful, ${rateLimitedCount} rate limited`);
  }

  console.log(colorize('\nNote:', 'yellow'), 'Wait 60 seconds for the rate limit to reset.\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return true;
  } catch (error) {
    console.error(colorize('\n✗ Error: Cannot connect to server at ' + BASE_URL, 'red'));
    console.error(colorize('  Make sure your Next.js dev server is running:', 'yellow'));
    console.error(colorize('  npm run dev\n', 'cyan'));
    return false;
  }
}

// Main execution
(async () => {
  if (await checkServer()) {
    await testRateLimit();
  }
})();
