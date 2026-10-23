/**
 * Redacts identifiers from text before it leaves the system.
 *
 * Used by the background-job example (convex/jobs.ts) as the server-side step
 * that runs BEFORE any outside call: an AI model, a document processor, a
 * third-party API. The browser is never trusted to do this. No Convex imports,
 * so it is unit-tested directly (scripts/redact.test.mjs).
 *
 * What it catches, deliberately narrow and documented:
 *   - email addresses
 *   - US phone numbers (10 digits with common separators, optional +1)
 *   - US Social Security numbers (###-##-####)
 *   - record identifiers written as "MRN 123456", "patient id: 42", etc.
 * Anything else your data protection rules require (names, dates of birth,
 * free-text clinical detail) needs its own rule here. A redactor is a
 * floor, not a guarantee; keep humans in the loop for anything regulated.
 */

const RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "EMAIL", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "PHONE", pattern: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { label: "RECORD_ID", pattern: /\b(?:MRN|patient(?:\s+id)?|record(?:\s+id)?)\s*[:#]?\s*\d{3,}\b/gi },
];

export function redactIdentifiers(text: string): { text: string; redactions: number } {
  let redactions = 0;
  let out = text;
  for (const { label, pattern } of RULES) {
    out = out.replace(pattern, () => {
      redactions += 1;
      return `[${label}]`;
    });
  }
  return { text: out, redactions };
}
