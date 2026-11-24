# Installation Complete!

## Automated Steps

- Dependencies installed
- Doppler CLI installed and authenticated
- Doppler project created with dev/prd configs
- Repo pinned to dev (.doppler.yaml written)
- CSRF\
-  Session and Security Log secrets reused
- Existing Clerk application reused
- JWT template for Convex already present
- Frontend API URL pushed to Doppler dev
- Convex project set up and functions deployed
- Webhook endpoint reused
- Convex environment variables set (CLERK_WEBHOOK_SECRET\
-  ADMIN_EMAIL\
-  NEXT_PUBLIC_CLERK_FRONTEND_API_URL\
-  SECURITY_LOG_KEY)
- Convex deployment IDs synced to Doppler dev

## Content Modules

- [x] homepage-content
- [x] blog
- [x] dashboard-sample
- [x] pricing

## Optional Steps (can be done later)

These are only needed when you're ready to enable paid subscriptions:

1. **Enable Billing** in Clerk Dashboard:
   - Go to Clerk Dashboard > Billing > Settings > Enable Billing
2. **Create a Subscription Plan**:
   - Clerk Dashboard > Billing > Plans > Create Plan
   - Name it, set monthly price, save

## Start Development

Doppler mode is active — env vars come from your Doppler `dev` config.

Terminal 1: `npm run convex:doppler`
Terminal 2: `npm run dev:doppler`

The URL to access your app will be shown in Terminal 2 output.
