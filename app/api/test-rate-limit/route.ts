import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';

/**
 * Test endpoint for demonstrating rate limiting functionality
 * Protected with rate limiting: 5 requests per minute per IP
 *
 * This endpoint is for testing purposes only and can be removed in production
 */
async function testHandler(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Request successful',
    timestamp: new Date().toISOString()
  });
}

// Apply rate limiting to this endpoint
export const GET = withRateLimit(testHandler);
export const POST = withRateLimit(testHandler);

export const config = {
  runtime: 'nodejs',
};
