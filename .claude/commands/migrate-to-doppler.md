---
allowed-tools: Bash(node *setup.mjs*), Bash(npx convex*), Bash(vercel*), Bash(gh*), Bash(doppler*), Bash(ls *), Bash(cat *), Read
description: Migrate an existing repo's secrets from .env.local + Vercel + Convex into Doppler, then remove them from the source locations
---

# /migrate-to-doppler

You are migrating an existing repo from scattered env-var management (`.env.local` + Vercel env + Convex env) into Doppler-mode (single source of truth in Doppler, only `DOPPLER_TOKEN` left in Vercel).

This is **destructive** — the cleanup phase removes secrets from Vercel and Convex. You MUST confirm with the user before running cleanup.

## Phase 0: Preflight

1. Check Doppler is enabled: `ls .doppler.yaml 2>/dev/null`
   - If missing, run `node scripts/setup.mjs doppler-bootstrap` and wait for completion. If it fails, surface the error verbatim and STOP.
2. Check tools available (note which ones — affects what gets migrated):
   - `node -v` (required)
   - `vercel --version 2>&1` (optional — if missing, Vercel migration is skipped)
   - `npx convex env list 2>&1 | head -1` (optional — if it fails, Convex migration is skipped)
   - `gh --version 2>&1` (optional — needed only to push DOPPLER_TOKEN to GitHub at the end)

If `vercel` is missing, tell the user: "Vercel CLI not found — install with `npm i -g vercel` to include Vercel env vars in this migration. Continuing without Vercel."

## Phase 1: Inventory (read-only)

```bash
node scripts/setup.mjs migrate-to-doppler --phase=inventory
```

Parse the JSON output. It contains:

- `inventory.envLocal` — keys/values from `.env.local`
- `inventory.convex.map` — keys/values from `npx convex env list`
- `inventory.vercel.byTarget.{production,preview,development}` — keys/values per Vercel environment
- `counts` — quick summary

Display a table to the user (don't include values, only keys, to keep secrets off the screen):

```
Found in .env.local:               <count> keys
Found in Convex env:               <count> keys
Found in Vercel Production:        <count> keys
Found in Vercel Preview:           <count> keys
Found in Vercel Development:       <count> keys
```

If a key appears in multiple sources with **different values**, list those conflicts explicitly:

```
⚠ Conflict for KEY=...
  .env.local:           <truncated value>
  Vercel Production:    <truncated value>
  → Doppler dev will get the .env.local value (most-local wins)
```

(Truncate values to first 6 chars + "…" so secrets don't leak to the terminal.)

If `inventory.vercel.ok` is `false`, show the reason (e.g. "Vercel CLI not installed" or "Project not linked"). Continue with whatever was found.

## Phase 2: Confirm migration

Use AskUserQuestion:

- Question: "Push these <total-key-count> keys into Doppler? (Doppler dev gets the union of .env.local + Convex + Vercel-Development + Vercel-Preview. Doppler prd gets Vercel-Production.) This step is non-destructive — sources are NOT removed yet."
- Header: "Migrate to Doppler"
- Options:
  - "Yes — push to Doppler" (description: "Idempotent. Cleanup is a separate step.")
  - "Cancel" (description: "Stop here. The inventory file is preserved at /tmp/doppler-migration-inventory.json for review.")

If the user cancels, STOP. Show them the inventory path so they can inspect it.

## Phase 3: Migrate

```bash
node scripts/setup.mjs migrate-to-doppler --phase=migrate
```

This pushes the values to Doppler. It's idempotent — re-running it just overwrites the same keys.

Parse output and report:

```
Pushed to Doppler dev: <count> keys
Pushed to Doppler prd: <count> keys (or "0 — no Vercel Production values found")
```

Verify with the user that Doppler now has the values:

```bash
doppler secrets --config dev --only-names
```

## Phase 4: Confirm cleanup (HARD STOP)

The next step removes the migrated keys from `.env.local`, Convex env, and Vercel env. **This is destructive and visible to the team if production-bound.**

Use AskUserQuestion:

- Question: "Cleanup will: (1) strip migrated keys from .env.local (delete the file if it ends up empty), (2) `npx convex env unset` for migrated Convex keys (except Convex-local ones like CONVEX_DEPLOY_KEY), (3) `vercel env rm` for migrated Vercel keys in production / preview / development. After cleanup, only DOPPLER_TOKEN should remain in Vercel. Proceed?"
- Header: "Cleanup sources"
- Options:
  - "Yes — remove from sources" (description: "Doppler now has everything; this removes the duplicates.")
  - "No — keep sources for now" (description: "You can run cleanup later with: node scripts/setup.mjs migrate-to-doppler --phase=cleanup --yes")

If the user picks "No", STOP and show them the resume command.

If the user is migrating production secrets (Vercel Production had any keys), ask a second confirmation:

- Question: "About to remove <N> keys from Vercel **Production**. After this, the production app will need DOPPLER_TOKEN set in Vercel + a redeploy to fetch secrets at runtime. Proceed?"
- Header: "Touch production?"
- Options:
  - "Yes — clean Vercel Production too"
  - "No — clean dev/preview/Convex only, leave Production alone"

If "No", note this and you'll skip the Vercel Production cleanup. (We don't currently have a flag for that — instead, after cleanup runs, manually re-add any Vercel Production keys via `vercel env add` if they got removed. Better path: ask before running cleanup if production should be excluded, and if so, *remove* the production entries from `inventory.vercel.byTarget.production` in the inventory JSON before running cleanup, so the script never touches them. Use Read+Edit to do that.)

## Phase 5: Cleanup

```bash
node scripts/setup.mjs migrate-to-doppler --phase=cleanup --yes
```

Parse the output and show:

```
Removed from .env.local: <count> keys (file <deleted | preserved>)
Removed from Convex env: <count> keys
Removed from Vercel Production: <count> keys
Removed from Vercel Preview: <count> keys
Removed from Vercel Development: <count> keys
Skipped: <list> (e.g. CONVEX_DEPLOY_KEY kept in Convex)
```

## Phase 6: Add DOPPLER_TOKEN to Vercel and GitHub

If `vercel` is available, check whether `DOPPLER_TOKEN` is already in Vercel env:

```bash
vercel env ls 2>&1 | grep -i DOPPLER_TOKEN || echo "MISSING"
```

If MISSING, create a Doppler service token for the dev config and push it to Vercel:

```bash
DEV_TOKEN=$(doppler configs tokens create vercel-runtime-dev --plain --project $(node -e "console.log(require('./package.json').name)") --config dev)
echo "$DEV_TOKEN" | vercel env add DOPPLER_TOKEN preview
echo "$DEV_TOKEN" | vercel env add DOPPLER_TOKEN development
```

For production, create a separate `prd`-scoped token:

```bash
PRD_TOKEN=$(doppler configs tokens create vercel-runtime-prd --plain --project $(node -e "console.log(require('./package.json').name)") --config prd)
echo "$PRD_TOKEN" | vercel env add DOPPLER_TOKEN production
```

(Pass these via stdin to avoid the token landing in shell history.)

If `gh` is available and the GitHub Actions secret isn't set, run the existing helper:

```bash
node scripts/setup.mjs doppler-create-ci-token
```

## Phase 7: Verify

Show the user the post-migration state:

```bash
echo "Doppler dev secrets:"
doppler secrets --config dev --only-names
echo ""
echo "Doppler prd secrets:"
doppler secrets --config prd --only-names
echo ""
echo "Vercel env (should show only DOPPLER_TOKEN):"
vercel env ls 2>&1 || echo "(skipped — vercel CLI not installed)"
echo ""
echo "Convex env (should NOT contain Doppler-migrated keys):"
npx convex env list 2>&1 || echo "(skipped — Convex not configured)"
echo ""
echo ".env.local presence:"
ls -la .env.local 2>&1 || echo "(deleted — fully migrated)"
```

## Final summary

```
## Migration Complete

- Doppler dev: <N> keys (was: .env.local + Convex + Vercel-Dev + Vercel-Preview)
- Doppler prd: <N> keys (was: Vercel-Production)
- Vercel env: cleaned (only DOPPLER_TOKEN remains for preview/development/production)
- Convex env: cleaned (kept: CONVEX_DEPLOY_KEY)
- .env.local: <deleted | preserved with non-migrated entries>
- GitHub Actions: DOPPLER_TOKEN secret set

### Next steps

- Local dev: `npm run dev:doppler` and `npm run convex:doppler`
- Deploy: `/deploy-to-dev` (preview) or `/deploy-to-prod` (production)
- Incident response: `/rotate`
```

## Notes

- The inventory JSON is at `/tmp/doppler-migration-inventory.json`. Keep it until you're confident the migration succeeded; delete it afterward (it contains plaintext secrets):
  ```bash
  rm /tmp/doppler-migration-inventory.json
  ```
- If anything goes wrong mid-flight, the original sources are still intact until cleanup runs. The migrate phase is idempotent — re-run it freely.
- Convex keeps `CONVEX_DEPLOY_KEY` because Convex needs it in its own env to authenticate deploys. It's not a Doppler-managed secret.
- This command does not touch `.gitignore` or commit anything. Local file changes are uncommitted; review with `git status` and commit when satisfied.
