# Changelog

## 8.1.0 — 2026-11-24

This release includes the changes on `main` since `v7.4.0`, including the
`secure-vibe-runtime` 8.1.0 package. It adds safer secret handling and more
reliable setup and deployment flows, expands the installable content modules,
upgrades Clerk to v7, and fixes Node.js ESM imports from the runtime package.

### Runtime package

- Fix ESM output so plain Node.js can resolve the package and its exported
  entry points.
- Keep runtime security fixes already shipped since `v7.4.0`, including
  session-bound CSRF tokens, production `__Host-` cookies, safer IP handling in
  security logs, and loading the corrected CSRF package from the app.

### App and setup

- Upgrade to Clerk v7 and update the setup and deployment configuration for
  the new Clerk and Convex integration.
- Read secret inputs from environment variables, Doppler, or `.env.local`
  instead of command-line flags; avoid shell interpretation when passing
  values to Convex and Vercel.
- Make installation, migration, and deployment safer to rerun, including
  refusing conflicting secret sources and preserving user-owned settings.
- Let users choose content modules regardless of which modules are present in
  the template, and improve blog search, navigation, feeds, and module checks.
- Update dependencies to address reported advisories and keep deployment and
  CI workflows aligned with current tool versions.

### Upgrade

Update the app to `8.1.0` and install `secure-vibe-runtime@8.1.0`. Existing
template forks can merge the `v8.1.0` release tag or selectively apply the
commits they need.
