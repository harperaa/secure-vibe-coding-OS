// `process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL` here resolves at Convex
// runtime against Convex's own env store. In Doppler mode it's mirrored from
// Doppler `dev`/`prd` via scripts/sync-convex-env.mjs; in legacy mode it's
// set directly via `npx convex env set`. Convex functions don't share
// process.env with the Vercel runtime — keep both stores in sync.
export default {
    providers: [
      {
        domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
        applicationID: "convex",
      },
    ]
  };