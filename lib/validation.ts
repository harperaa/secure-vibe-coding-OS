import { z } from 'zod';

/**
 * Input Validation & XSS Prevention Schemas
 * ==========================================
 *
 * Reusable Zod schemas for validating and sanitizing user input.
 * All schemas include XSS prevention by removing dangerous characters: < > " &
 * Single quotes (') are preserved to allow names like O'Neal, D'Angelo, etc.
 *
 * Usage:
 * ------
 * import { emailSchema, safeTextSchema } from '@/lib/validation';
 *
 * const result = emailSchema.safeParse(userInput);
 * if (result.success) {
 *   // result.data is validated and sanitized
 * }
 */

/**
 * XSS-safe string sanitizer
 * Removes: < > " & (but preserves ' for names like O'Neal)
 */
const sanitizeXSS = (val: string): string => val.replace(/[<>"&]/g, '');

/**
 * Email Schema
 * - Validates email format
 * - Converts to lowercase
 * - Trims whitespace
 * - Sanitizes XSS characters
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((val) => val.toLowerCase().trim())
  .transform(sanitizeXSS);

/**
 * Safe Text Schema
 * - For short text inputs (names, titles, usernames, etc.)
 * - Max 100 characters
 * - Trims whitespace
 * - Sanitizes XSS characters
 */
export const safeTextSchema = z
  .string()
  .min(1, 'Required')
  .max(100, 'Too long (max 100 characters)')
  .trim()
  .transform(sanitizeXSS);

/**
 * Safe Long Text Schema
 * - For longer text inputs (descriptions, bios, comments, etc.)
 * - Max 5000 characters
 * - Trims whitespace
 * - Sanitizes XSS characters
 */
export const safeLongTextSchema = z
  .string()
  .min(1, 'Required')
  .max(5000, 'Too long (max 5000 characters)')
  .trim()
  .transform(sanitizeXSS);

/**
 * Optional Safe Text Schema
 * - Same as safeTextSchema but optional/nullable
 */
export const optionalSafeTextSchema = z
  .string()
  .max(100, 'Too long (max 100 characters)')
  .trim()
  .transform(sanitizeXSS)
  .optional()
  .nullable();

/**
 * Optional Safe Long Text Schema
 * - Same as safeLongTextSchema but optional/nullable
 */
export const optionalSafeLongTextSchema = z
  .string()
  .max(5000, 'Too long (max 5000 characters)')
  .trim()
  .transform(sanitizeXSS)
  .optional()
  .nullable();

/**
 * URL Schema
 * - Validates URL format
 * - Requires HTTPS for security
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine((url) => url.startsWith('https://'), {
    message: 'URL must use HTTPS',
  });

/**
 * Optional URL Schema
 */
export const optionalUrlSchema = urlSchema.optional().nullable();

/**
 * Username Schema
 * - Alphanumeric, hyphens, underscores only
 * - 3-30 characters
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
  .trim()
  .toLowerCase();

/**
 * Example Schemas for Common Use Cases
 * =====================================
 */

/**
 * User Profile Update Schema
 * Example for updating user profile information
 */
export const updateProfileSchema = z.object({
  displayName: safeTextSchema,
  bio: optionalSafeLongTextSchema,
  website: optionalUrlSchema,
});

/**
 * Contact Form Schema
 * Example for contact/support forms
 */
export const contactFormSchema = z.object({
  name: safeTextSchema,
  email: emailSchema,
  subject: z.string().min(1, 'Required').max(200, 'Too long').trim().transform(sanitizeXSS),
  message: safeLongTextSchema,
});

/**
 * Create Post Schema
 * Example for user-generated content
 */
export const createPostSchema = z.object({
  title: z.string().min(1, 'Required').max(200, 'Too long').trim().transform(sanitizeXSS),
  content: safeLongTextSchema,
  tags: z.array(safeTextSchema).max(5).optional(),
});

/**
 * User Preferences Schema
 * Example for app settings/preferences
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.boolean(),
  displayName: optionalSafeTextSchema,
});
