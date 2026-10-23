# secure-vibe-runtime

The runtime security pieces of [Secure Vibe Coding OS](https://github.com/harperaa/secure-vibe-coding-OS) as one package, so every app built from the template gets security fixes by updating a dependency instead of copying files.

| Entry point | What it provides |
|---|---|
| `secure-vibe-runtime/secrets` | `ensureSecretsLoaded()`, `revalidateSecrets()`: Doppler runtime fetch with retry and a per-instance cache |
| `secure-vibe-runtime/csrf` | `generateCsrfToken()`, `validateCsrfToken()`, `generateUUID()`: HMAC tokens bound to a session; refuses to run without `CSRF_SECRET` |
| `secure-vibe-runtime/withCsrf` | `withCsrf(handler)`: route wrapper that validates the token and logs failures |
| `secure-vibe-runtime/withRateLimit` | `withRateLimit(handler)`: per-instance IP rate limit that fails closed on an unresolvable IP and logs refusals |
| `secure-vibe-runtime/convex` | `securityTables` (schema fragment), the validators, `logSecurity()` and the exact-counter helpers, `redactIdentifiers()` |

## Install

```bash
npm install secure-vibe-runtime
```

Peer dependencies: `next` and `convex`. The template already wires everything below; these notes are for an app that adds the package by hand.

### Next.js side

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSecretsLoaded } = await import("secure-vibe-runtime/secrets");
  await ensureSecretsLoaded();
}

// app/api/something/route.ts
import { withRateLimit } from "secure-vibe-runtime/withRateLimit";
import { withCsrf } from "secure-vibe-runtime/withCsrf";
export const POST = withRateLimit(withCsrf(handler));
```

The wrappers write refusals to the Convex security log by calling the app's `security:logSecurityViolation` mutation with `SECURITY_LOG_KEY`. The app owns that mutation and the admin dashboard; see the template's `convex/security.ts`.

### Convex side

```ts
// convex/schema.ts
import { securityTables } from "secure-vibe-runtime/convex";
export default defineSchema({ users: ..., ...securityTables });

// any mutation
import { logSecurity } from "secure-vibe-runtime/convex";
await logSecurity(ctx, user?._id, "unauthorized_access", "high", { endpoint: "..." });
```

Every write to `securityEvents` must go through `insertSecurityEvent`, `deleteSecurityEvent`, or `setSecurityEventRead` so the hourly counters stay exact. An app's `MutationCtx` is assignable to the package's `SecurityMutationCtx` without a cast.

## Versioning

The package version tracks the template release it ships with. Breaking changes to the schema fragment or function contracts are called out in the template's release notes, together with the Convex deploy or rebuild step they need.
