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

type DopplerResponse = Record<string, string>;

let secretsPromise: Promise<void> | null = null;

async function fetchFromDoppler(token: string): Promise<DopplerResponse> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(DOPPLER_API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`Doppler API returned ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as DopplerResponse;
      return json;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 100 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`Doppler fetch failed after ${maxAttempts} attempts: ${(lastError as Error)?.message ?? lastError}`);
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
