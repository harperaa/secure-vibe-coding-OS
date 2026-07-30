// Convex evaluates this file at PUSH time against the deployment env store
// (Convex functions don't share process.env with the Vercel runtime — keep both
// stores in sync). In Doppler mode values are mirrored from Doppler `dev`/`prd`
// via scripts/sync-convex-env.mjs; in legacy mode via `npx convex env set`.
//
// Prefer CLERK_JWT_ISSUER_DOMAIN (official Convex + Clerk docs name). Fall back
// to NEXT_PUBLIC_CLERK_FRONTEND_API_URL (same value: the Clerk Frontend API URL
// / JWT issuer, e.g. https://verb-noun-00.clerk.accounts.dev).
//
// IMPORTANT: Setting the env var alone does NOT activate the provider — you must
// push afterwards (`npx convex dev --once` for dev, `npx convex deploy` for
// prod), or the deployment keeps whatever provider list it had, which is empty
// if the var was unset at the previous push. Symptom when this is missed:
// logins / mutations fail with identity null or
// "No auth provider found matching the given token (no providers configured)".
// scripts/setup.mjs (configure) and scripts/deploy.mjs both re-push for this reason.
const issuer =
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL;

if (!issuer) {
  console.warn(
    "[auth.config] Missing CLERK_JWT_ISSUER_DOMAIN / NEXT_PUBLIC_CLERK_FRONTEND_API_URL — no auth providers configured"
  );
}

export default {
  providers: issuer
    ? [
        {
          domain: issuer,
          applicationID: "convex",
        },
      ]
    : [],
};
