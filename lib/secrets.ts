/**
 * Runtime secrets fetcher for Vercel + Doppler.
 *
 * On cold start, calls Doppler's API with a service token to fetch all secrets
 * for the deployment's config and writes them into `process.env` so the rest of
 * the app (Clerk SDK, lib/csrf.ts, etc.) reads them transparently.
 *
 * Local dev path: when DOPPLER_TOKEN is unset (developers run via
 * `doppler run -- next dev`), this is a no-op — values are already in
 * process.env via the doppler CLI wrapper.
 *
 * Cache: a single in-flight Promise is memoized in module scope. Vercel
 * Fluid Compute reuses function instances across requests, so the fetch
 * cost (~100–300ms) is paid once per instance lifetime, not per request.
 *
 * Cache invalidation: app/api/revalidate-secrets calls revalidateSecrets()
 * to drop the cache and force a refetch — used by /rotate after a key change.
 */

const DOPPLER_API_URL = 'https://api.doppler.com/v3/configs/config/secrets/download?format=json';

// Retry tuning: transient network blips between Vercel egress and Doppler's
// edge last seconds, not milliseconds. Backoff totals ~3.75s across attempts
// (250/500/1000/2000ms) so a brief blip becomes a slower cold start, not a 500.
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 250;
const PER_ATTEMPT_TIMEOUT_MS = 5_000;

type DopplerResponse = Record<string, string>;

let secretsPromise: Promise<void> | null = null;

/**
 * Flatten an error for logging. Undici wraps the real network failure
 * (DNS, TLS, connection reset) in `err.cause`, so a bare `err.message`
 * is often just "fetch failed" — walk the cause chain to keep the detail.
 */
function describeError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    const code = (current as NodeJS.ErrnoException).code;
    parts.push(`${current.name}: ${current.message}${code ? ` (${code})` : ''}`);
    current = current.cause;
  }
  if (current !== undefined && current !== null) parts.push(String(current));
  return parts.join(' <- ') || String(err);
}

async function fetchFromDoppler(token: string): Promise<DopplerResponse> {
  let lastError: unknown;
  const started = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStarted = Date.now();
    try {
      const res = await fetch(DOPPLER_API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Doppler API returned ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as DopplerResponse;
      if (attempt > 1) {
        console.warn(
          `[secrets] Doppler fetch recovered on attempt ${attempt}/${MAX_ATTEMPTS} after ${Date.now() - started}ms`
        );
      }
      return json;
    } catch (err) {
      lastError = err;
      console.warn(
        `[secrets] Doppler fetch attempt ${attempt}/${MAX_ATTEMPTS} failed after ${Date.now() - attemptStarted}ms: ${describeError(err)}`
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BASE_BACKOFF_MS * 2 ** (attempt - 1)));
      }
    }
  }
  console.error(
    `[secrets] Doppler fetch exhausted ${MAX_ATTEMPTS} attempts over ${Date.now() - started}ms; last error: ${describeError(lastError)}`
  );
  throw new Error(
    `Doppler fetch failed after ${MAX_ATTEMPTS} attempts: ${describeError(lastError)}`
  );
}

async function applySecrets(): Promise<void> {
  const token = process.env.DOPPLER_TOKEN;
  if (!token) {
    // Local dev or legacy mode — process.env already populated upstream.
    return;
  }
  const secrets = await fetchFromDoppler(token);
  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
}

/**
 * Ensure secrets are loaded into process.env before the caller proceeds.
 * Safe to call from many places — fetch happens at most once per instance.
 */
export function ensureSecretsLoaded(): Promise<void> {
  if (!secretsPromise) {
    secretsPromise = applySecrets().catch((err) => {
      // Reset on failure so the next call retries instead of caching the error.
      secretsPromise = null;
      throw err;
    });
  }
  return secretsPromise;
}

/**
 * Drop the in-memory cache and force a refetch on the next call.
 * Used by /api/revalidate-secrets after rotation.
 */
export function revalidateSecrets(): void {
  secretsPromise = null;
}
