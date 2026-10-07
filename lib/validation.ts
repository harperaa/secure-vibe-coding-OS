import { z } from 'zod';

/**
 * Input Validation Schemas
 * =========================
 *
 * Reusable Zod schemas for validating and normalising user input.
 *
 * SCOPE — what this file does and does not give you:
 *
 *   DOES: shape/length/format validation, trimming, and stripping four HTML
 *         metacharacters (< > " &) from stored values as defence in depth.
 *
 *   DOES NOT: make a string safe to interpolate into HTML. Character removal on
 *         the way in is not XSS protection. XSS is prevented by ENCODING at the
 *         OUTPUT SINK, in the encoding appropriate to that sink.
 *
 * If you are building HTML by hand — email bodies, .ics files, raw Response
 * bodies, dangerouslySetInnerHTML — use escapeHtml() from this file at every
 * interpolation point. React escapes rendered JSX for you; nothing else does.
 *
 * This header previously read "All schemas include XSS prevention by removing
 * dangerous characters". That claim caused a downstream fork to treat these
 * schemas as its XSS control and ship HTML injection into outbound email.
 *
 * Usage:
 * ------
 * import { emailSchema, safeTextSchema, escapeHtml } from '@/lib/validation';
 *
 * const result = emailSchema.safeParse(userInput);
 * if (result.success) {
 *   // result.data is validated and normalised — still encode it at the sink
 * }
 */

/**
 * Strips four HTML metacharacters from stored input: < > " &
 * (preserves ' for names like O'Neal).
 *
 * READ THIS BEFORE USING IT AS XSS PROTECTION — IT IS NOT.
 *
 * This is defence in depth on the way IN. It is deliberately NOT named
 * `sanitizeXSS` any more, because that name caused it to be cited as the app's
 * XSS defence, which it cannot be:
 *
 *   - It REMOVES characters rather than ENCODING them, so it is lossy and
 *     still not safe. Removal cannot be context-correct; encoding can.
 *   - It preserves ' ` = ( ) and /, so it does not survive an unquoted or
 *     single-quoted HTML ATTRIBUTE context: `x' onerror=alert(1) x` passes
 *     through untouched.
 *   - It does nothing for JS, CSS, URL, or email-HTML contexts.
 *
 * The real defence is context-appropriate ENCODING AT THE SINK. React already
 * does this for rendered JSX. For anything React does not render for you —
 * email HTML bodies, .ics files, raw Response bodies, dangerouslySetInnerHTML —
 * use escapeHtml() below, or a context-specific encoder.
 *
 * A downstream fork shipped HTML injection into outbound email precisely by
 * trusting this function as the XSS control. Do not repeat that.
 */
const stripHtmlChars = (val: string): string => val.replace(/[<>"&]/g, '');

/**
 * Encodes a string for safe interpolation into an HTML TEXT or ATTRIBUTE
 * context. This is the function to reach for when building HTML by hand.
 *
 * Unlike stripHtmlChars() above, this is lossless and context-correct: the
 * user's input survives intact and renders as literal text.
 *
 *   const body = `<p>Hi ${escapeHtml(name)}</p>`;   // safe
 *   const body = `<p>Hi ${name}</p>`;               // injection
 *
 * Encodes the five characters that matter in HTML, plus ' and ` which are
 * required for attribute-context safety and are exactly what stripHtmlChars
 * leaves behind.
 */
export const escapeHtml = (val: string): string =>
  String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');

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
  .transform(stripHtmlChars);

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
  .transform(stripHtmlChars);

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
  .transform(stripHtmlChars);

/**
 * Optional Safe Text Schema
 * - Same as safeTextSchema but optional/nullable
 */
export const optionalSafeTextSchema = z
  .string()
  .max(100, 'Too long (max 100 characters)')
  .trim()
  .transform(stripHtmlChars)
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
  .transform(stripHtmlChars)
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
  subject: z.string().min(1, 'Required').max(200, 'Too long').trim().transform(stripHtmlChars),
  message: safeLongTextSchema,
});

/**
 * Create Post Schema
 * Example for user-generated content
 */
export const createPostSchema = z.object({
  title: z.string().min(1, 'Required').max(200, 'Too long').trim().transform(stripHtmlChars),
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
