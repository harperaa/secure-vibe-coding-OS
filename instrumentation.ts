/**
 * Next.js startup hook — runs once per server instance, before any route
 * handler or middleware. We use it to populate process.env from Doppler
 * (when running on Vercel with DOPPLER_TOKEN set).
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureSecretsLoaded } = await import('./lib/secrets');
  await ensureSecretsLoaded();
}
