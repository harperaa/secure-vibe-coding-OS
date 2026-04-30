---
allowed-tools: AskUserQuestion, Bash(doppler *), Bash(npx vercel*), Bash(npx convex*), Bash(node *), Bash(curl *), Bash(gh *), Read
description: Rotate Doppler-managed secrets after a suspected compromise — containment first, then per-credential rotation
---

# /rotate — Incident-Response Rotation

You are the rotation assistant. Your job: revoke the Vercel-side `DOPPLER_TOKEN` **first** (so any attacker stops being able to read Doppler), and only then walk the user through rotating the underlying credentials at their sources. Containment before remediation.

This command requires Doppler mode (`.doppler.yaml` exists in the repo). If Doppler mode is not active, STOP and tell the user: "/rotate is only supported in Doppler mode. Legacy `.env.local` flows must be rotated manually."

## Step 0: Scope

**AskUserQuestion**: "Which environment is affected?"
- Options:
  - "prd (production)" — Vercel Production token compromised, secrets at risk
  - "dev (preview / development)" — Vercel Preview token compromised
  - "Both" — rotate dev and prd
- Header: "Affected env"
- multiSelect: false

Persist `<ENV>` (one of `dev`, `prd`, or run the steps twice for `Both`).

**AskUserQuestion**: "What's suspected compromised?"
- Options:
  - "Vercel-side DOPPLER_TOKEN" — the token in Vercel env was leaked / Vercel team access incident
  - "Developer machine" — a developer's local Doppler session was compromised
  - "A specific secret in a leaked log" — a single value is known to have leaked
  - "Unknown — assume worst case" — rotate everything in the affected env
- Header: "Compromise"
- multiSelect: false

Persist this — affects how much the rotation walkthrough emphasizes.

**AskUserQuestion**: "Rotating SESSION_SECRET will log out every active user. Continue?"
- Options:
  - "Yes — full rotation" — Rotate SESSION_SECRET (recommended for any unknown / Vercel-side compromise)
  - "Skip SESSION_SECRET" — Leave sessions valid (only OK if SESSION_SECRET was definitely not in the leak)
- Header: "Sessions"
- multiSelect: false

Persist `<ROTATE_SESSIONS>`.

Compute `PROJECT=$(node -p "require('./package.json').name")` and store as `<PROJECT>`.

Map `<ENV>`:
- `dev` → `<VERCEL_ENV>=development`, `<DOPPLER_CONFIG>=dev`
- `prd` → `<VERCEL_ENV>=production`, `<DOPPLER_CONFIG>=prd`

## Step 1: CONTAINMENT — revoke and reissue the runtime token (DO THIS FIRST)

This severs the attacker's access to Doppler within seconds, even before any underlying secret is rotated.

Run:
```bash
TOKEN_NAME="vercel-runtime-<DOPPLER_CONFIG>"

# 1a. Revoke (idempotent — succeeds even if the token name already revoked)
doppler configs tokens revoke "$TOKEN_NAME" \
  --project <PROJECT> --config <DOPPLER_CONFIG> --yes 2>/dev/null || true

# 1b. Issue a fresh service token
NEW_TOKEN=$(doppler configs tokens create "$TOKEN_NAME" --plain \
              --project <PROJECT> --config <DOPPLER_CONFIG>)

# 1c. Replace DOPPLER_TOKEN in Vercel
npx vercel env rm DOPPLER_TOKEN <VERCEL_ENV> --yes 2>/dev/null || true
echo "$NEW_TOKEN" | npx vercel env add DOPPLER_TOKEN <VERCEL_ENV>
```

Show: ":white_check_mark: Stolen token revoked; new DOPPLER_TOKEN pushed to Vercel <VERCEL_ENV>"

## Step 2: Force a fresh runtime fetch on warm instances

Some Vercel function instances are still warm with the old cached secrets. Trigger a redeploy so they get the new ones:

```bash
# For prd:
npx vercel --prod
# For dev/preview: a new deploy happens on git push; if you need it now:
npx vercel deploy
```

Or, if a redeploy is undesirable and the app exposes the revalidate endpoint:
```bash
REVALIDATE_TOKEN=$(doppler secrets get REVALIDATE_TOKEN --plain --project <PROJECT> --config <DOPPLER_CONFIG>)
APP_URL="https://<your-app>"   # ask the user to confirm
curl -X POST "$APP_URL/api/revalidate-secrets" -H "Authorization: Bearer $REVALIDATE_TOKEN"
```

Show: ":white_check_mark: Runtime secrets cache invalidated"

## Step 3: Rotate underlying credentials in priority order

For each secret below, walk the user through rotating it at its source, then push the new value to Doppler. New values flow to Vercel via runtime fetch on the next cold start (or immediately via `/api/revalidate-secrets` if you ran Step 2's curl variant).

For each, display the rotation steps and AskUserQuestion to confirm completion before moving on. Skip secrets the user explicitly identified as unaffected.

### 3.1 CLERK_SECRET_KEY (Clerk SDK auth — highest blast radius)

```
1. Open Clerk Dashboard → API Keys
2. Click "Reveal Secret Key" → "Regenerate" (or create new + delete old)
3. Copy the new sk_live_... (or sk_test_... for dev)
```

After paste:
```bash
doppler secrets set CLERK_SECRET_KEY="<NEW_SK>" \
  --project <PROJECT> --config <DOPPLER_CONFIG>
```

### 3.2 CLERK_WEBHOOK_SECRET (Svix)

```
1. Clerk Dashboard → Webhooks → select the endpoint
2. Click "Roll secret" (or delete + recreate)
3. Copy the new whsec_...
```

```bash
doppler secrets set CLERK_WEBHOOK_SECRET="<NEW_WHSEC>" \
  --project <PROJECT> --config <DOPPLER_CONFIG>
```

### 3.3 SESSION_SECRET (only if `<ROTATE_SESSIONS>` is "Yes")

```bash
NEW=$(node -p "require('crypto').randomBytes(32).toString('base64url')")
doppler secrets set SESSION_SECRET="$NEW" --project <PROJECT> --config <DOPPLER_CONFIG>
```

Warn the user: every active user is now logged out and must sign back in.

### 3.4 CSRF_SECRET

```bash
NEW=$(node -p "require('crypto').randomBytes(32).toString('base64url')")
doppler secrets set CSRF_SECRET="$NEW" --project <PROJECT> --config <DOPPLER_CONFIG>
```

### 3.5 CONVEX_DEPLOY_KEY (only if applicable to <DOPPLER_CONFIG>=prd)

```
1. Convex Dashboard → Settings → Deploy Keys → revoke the existing one
2. Create a new prod deploy key
3. Copy the prod:...|... value
```

```bash
doppler secrets set CONVEX_DEPLOY_KEY="<NEW>" --project <PROJECT> --config prd
```

### 3.6 GEMINI_API_KEY (if used)

```
1. https://aistudio.google.com/app/api-keys → revoke + create new
```

```bash
doppler secrets set GEMINI_API_KEY="<NEW>" --project <PROJECT> --config <DOPPLER_CONFIG>
```

### 3.7 Any other secret in scope

Run `doppler secrets --project <PROJECT> --config <DOPPLER_CONFIG> --only-names` to enumerate remaining keys. For each one not yet rotated, decide: rotate now, or known-clean. Rotate anything you can't be sure about.

## Step 4: Sync Convex env

Some rotated secrets are mirrored into Convex's own env store. Resync them:

```bash
node scripts/sync-convex-env.mjs --config <DOPPLER_CONFIG>
```

Show: ":white_check_mark: Convex env synced"

## Step 5: Re-revalidate the runtime cache

After all rotations, force the app to drop any cached server secrets again so warm instances start using the new values immediately (without waiting for a cold start):

```bash
REVALIDATE_TOKEN=$(doppler secrets get REVALIDATE_TOKEN --plain --project <PROJECT> --config <DOPPLER_CONFIG>)
curl -X POST "https://<your-app>/api/revalidate-secrets" -H "Authorization: Bearer $REVALIDATE_TOKEN"
```

## Step 6: Audit and verify

```bash
# What did the compromised token access? Look for unusual IPs / times.
doppler activity --project <PROJECT> --config <DOPPLER_CONFIG> --limit 100

# Confirm new Doppler state.
doppler secrets --project <PROJECT> --config <DOPPLER_CONFIG> --only-names

# Confirm Vercel still has only the bootstrap tokens.
npx vercel env ls <VERCEL_ENV>
```

The Vercel env listing should show only `DOPPLER_TOKEN` (and optionally `REVALIDATE_TOKEN`). Anything else in there is a leftover from legacy mode and should be deleted.

## Step 7: Disclosure check

If `SESSION_SECRET` was rotated, or any user PII could have been impersonated during the breach window:

- Notify users per your privacy policy / incident-response playbook
- File any regulatory disclosures required by your jurisdiction (GDPR, CCPA, state breach laws)
- Document the timeline: when the compromise was detected, when Step 1 ran (containment), what was rotated and when

## Final summary

Display:
```
## Rotation complete

- [x] Vercel <VERCEL_ENV> DOPPLER_TOKEN revoked and reissued
- [x] Runtime cache invalidated
- [x] Underlying credentials rotated:
      - CLERK_SECRET_KEY
      - CLERK_WEBHOOK_SECRET
      - <other rotated secrets>
- [x] Convex env synced

If this was a real incident, document the timeline and consider whether
disclosure is required. The Doppler activity log is the authoritative
record of what was accessed.
```
