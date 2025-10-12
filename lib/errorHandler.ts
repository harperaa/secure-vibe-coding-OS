import { NextResponse } from 'next/server';

/**
 * Secure Error Handler
 * =====================
 *
 * Prevents information leakage through error messages:
 * - Development: Full error details + stack traces for debugging
 * - Production: Generic error messages, no internal details
 *
 * Security Benefits:
 * - Prevents exposure of internal paths, dependencies, database structure
 * - Hides stack traces that could reveal vulnerabilities
 * - Logs all errors server-side for monitoring
 *
 * @param error - The error to handle
 * @param context - Optional context (e.g., route name) for logging
 * @returns NextResponse with appropriate error message
 *
 * @example
 * ```typescript
 * async function handler(request: NextRequest) {
 *   try {
 *     // Your API logic here
 *     const result = await riskyOperation();
 *     return NextResponse.json({ success: true, result });
 *   } catch (error) {
 *     return handleApiError(error, 'my-api-route');
 *   }
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Always log errors server-side (never sent to client)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[API Error]${context ? ` [${context}]` : ''}: ${errorMessage}`,
    isDevelopment ? errorStack : ''
  );

  // Development: Return detailed error info for debugging
  if (isDevelopment) {
    return NextResponse.json(
      {
        error: errorMessage,
        stack: errorStack,
        context: context || 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  // Production: Return generic error message
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
    },
    { status: 500 }
  );
}

/**
 * Handle validation errors with proper status codes
 *
 * @param message - Error message to return
 * @param details - Optional validation error details
 * @returns NextResponse with 400 status
 *
 * @example
 * ```typescript
 * if (!isValid) {
 *   return handleValidationError('Invalid input', { email: 'Email is required' });
 * }
 * ```
 */
export function handleValidationError(
  message: string,
  details?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation error',
      message,
      ...(details && { details }),
    },
    { status: 400 }
  );
}

/**
 * Handle authorization errors
 *
 * @param message - Optional custom message
 * @returns NextResponse with 403 status
 */
export function handleForbiddenError(
  message: string = 'Access denied'
): NextResponse {
  return NextResponse.json(
    {
      error: 'Forbidden',
      message,
    },
    { status: 403 }
  );
}

/**
 * Handle authentication errors
 *
 * @param message - Optional custom message
 * @returns NextResponse with 401 status
 */
export function handleUnauthorizedError(
  message: string = 'Authentication required'
): NextResponse {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message,
    },
    { status: 401 }
  );
}

/**
 * Handle not found errors
 *
 * @param resource - The resource that wasn't found (e.g., 'User', 'Post')
 * @returns NextResponse with 404 status
 */
export function handleNotFoundError(resource: string = 'Resource'): NextResponse {
  return NextResponse.json(
    {
      error: 'Not found',
      message: `${resource} not found`,
    },
    { status: 404 }
  );
}
