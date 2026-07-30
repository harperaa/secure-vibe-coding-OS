// `process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL` reads Convex's OWN env store
// (Convex functions don't share process.env with the Vercel runtime — keep both
// stores in sync). In Doppler mode it's mirrored from Doppler `dev`/`prd` via
// scripts/sync-convex-env.mjs; in legacy mode it's set via `npx convex env set`.
//
// IMPORTANT: Convex evaluates this file at PUSH time, not per request. Setting
// the env var alone does NOT activate the provider — you must push afterwards
// (`npx convex dev --once` for dev, `npx convex deploy` for prod), or the
// deployment keeps whatever provider list it had, which is empty if the var was
// unset at the previous push. Convex docs: "You must run `npx convex dev` or
// `npx convex deploy` after adding a new provider to sync the configuration to
// your backend." Symptom when this is missed: logins fail with
// "No auth provider found matching the given token (no providers configured)".
// scripts/setup.mjs (configure) and scripts/deploy.mjs both re-push for this reason.
export default {
    providers: [
      {
        domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
        applicationID: "convex",
      },
    ]
  };