import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request Validation Helper
 * ==========================
 *
 * Validates request data against a Zod schema and returns either:
 * - Validated, sanitized data (success case)
 * - NextResponse with error details (validation failure)
 *
 * This helper simplifies API route validation by handling the
 * parsing, error formatting, and response generation.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate (usually from request.json())
 * @returns Object with either success + data or success: false + response
 *
 * @example
 * ```typescript
 * import { validateRequest } from '@/lib/validateRequest';
 * import { createPostSchema } from '@/lib/validation';
 *
 * async function handler(request: NextRequest) {
 *   const body = await request.json();
 *   const validation = validateRequest(createPostSchema, body);
 *
 *   if (!validation.success) {
 *     return validation.response; // Returns 400 with errors
 *   }
 *
 *   // validation.data is type-safe and sanitized
 *   const { title, content } = validation.data;
 *   // ... use validated data
 * }
 * ```
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Format Zod errors for better client understanding
    const fieldErrors = result.error.flatten().fieldErrors;
    const formErrors = result.error.flatten().formErrors;

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors, // Field-specific errors (e.g., { email: ['Invalid email'] })
          formErrors, // General form errors
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Async version of validateRequest for schemas with async transforms
 *
 * @example
 * ```typescript
 * const validation = await validateRequestAsync(asyncSchema, body);
 * ```
 */
export async function validateRequestAsync<T extends z.ZodType>(
  schema: T,
  data: unknown
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const formErrors = result.error.flatten().formErrors;

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors,
          formErrors,
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
