---
allowed-tools: Bash(node *setup.mjs*), Bash(npx convex*), Bash(npx vercel*), Bash(npx --no-install vercel*), Bash(vercel*), Bash(gh*), Bash(doppler*), Bash(ls *), Bash(cat *), Read
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
   - `npx --no-install vercel --version 2>&1 || npx vercel --version 2>&1` (optional — Vercel CLI is invoked via `npx vercel` in this repo, no global install required. If `npx` can't resolve it, Vercel migration is skipped.)
   - `npx convex env list 2>&1 | head -1` (optional — if it fails, Convex migration is skipped)
   - `gh --version 2>&1` (optional — needed only to push DOPPLER_TOKEN to GitHub at the end)

If `npx vercel --version` fails (no internet to fetch it, or `vercel` not in `package.json` and not cached), tell the user: "Vercel CLI not resolvable via npx — Vercel env vars will not be migrated this run. Run `npm i -g vercel` or ensure network access for npx, then re-run /migrate-to-doppler. Continuing without Vercel."

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

- Question: "Cleanup will: (1) `npx convex env unset` for migrated Convex keys EXCEPT the Convex-runtime allowlist (CLERK_WEBHOOK_SECRET, NEXT_PUBLIC_CLERK_FRONTEND_API_URL, ADMIN_EMAIL stay because Convex functions read them at runtime; CONVEX_DEPLOY_KEY also stays). (2) Strip migrated keys from .env.local (delete the file if it ends up empty). (3) `vercel env rm` for migrated Vercel keys in production / preview / development. After cleanup, only DOPPLER_TOKEN should remain in Vercel. Proceed?"
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

If Vercel is resolvable (`npx vercel`), check whether `DOPPLER_TOKEN` is already in Vercel env:

```bash
npx vercel env ls 2>&1 | grep -i DOPPLER_TOKEN || echo "MISSING"
```

Decide which scope to use for the **production** Vercel target. The rule mirrors `/deploy-to-dev`:

- **Production NOT promoted yet** (no `_PROD_PROMOTED_AT` marker in either Doppler `dev` secrets or Vercel Production env): push the **dev**-scoped token to all three Vercel targets. Doppler `prd` is empty at this point, so a prd-scoped token would make the runtime fetch return nothing and the production deploy would 500. The first run of `/deploy-to-prod` will overwrite Production's token with a prd-scoped one once real prod keys are populated.
- **Production already promoted**: dev-scoped token to development+preview, prd-scoped token to production (the original design).

Detect promotion state:

```bash
PROD_PROMOTED=$(doppler secrets get _PROD_PROMOTED_AT --project $(node -e "console.log(require('./.doppler.yaml').toString().match(/project:\s*(\S+)/)?.[1] || require('./package.json').name)") --config dev --plain 2>/dev/null && echo "yes" || echo "no")
```

If MISSING, create a dev-scoped token. Use the `--value <v> --yes` non-interactive form for all three targets — and for **preview**, you MUST pass an empty string `""` as the third positional argument (Vercel CLI 52+ requires the branch positional even for "all preview branches"; the `--yes` flag alone does not skip the prompt):

```bash
PROJECT=$(node -e "const m=require('fs').readFileSync('.doppler.yaml','utf-8').match(/project:\s*(\S+)/); console.log(m ? m[1] : require('./package.json').name)")
DEV_TOKEN=$(doppler configs tokens create vercel-runtime-dev --plain --project "$PROJECT" --config dev)
npx vercel env add DOPPLER_TOKEN development --value "$DEV_TOKEN" --yes
npx vercel env add DOPPLER_TOKEN preview "" --value "$DEV_TOKEN" --yes
```

Production target — branch on the promotion state:

```bash
if [ "$PROD_PROMOTED" = "yes" ]; then
  PRD_TOKEN=$(doppler configs tokens create vercel-runtime-prd --plain --project "$PROJECT" --config prd)
  npx vercel env add DOPPLER_TOKEN production --value "$PRD_TOKEN" --yes
else
  # Use the same dev-scoped token; /deploy-to-prod will replace it later.
  npx vercel env add DOPPLER_TOKEN production --value "$DEV_TOKEN" --yes
fi
```

(The token is passed via `--value` — momentarily visible in `ps`/shell history, but acceptable for a one-time service-token bootstrap. Stdin form was deprecated by Vercel CLI 52 for env-add when combined with `--yes`.)

If `gh` is available and the GitHub Actions secret isn't set, run the existing helper:

```bash
node scripts/setup.mjs doppler-create-ci-token
```

## Phase 6.5: Sync Convex mirror

After cleanup, run the Convex sync once to guarantee the Convex-mirrored runtime values match what's in Doppler `dev` (idempotent — reports "already in sync" if everything matches):

```bash
npm run sync:convex
```

Why: Convex functions run on Convex's cloud, not Vercel. They can't fetch from Doppler at runtime — they read `process.env` from Convex's own env store. The cleanup phase intentionally keeps `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`, and `ADMIN_EMAIL` in Convex; `sync:convex` keeps those values in lock-step with Doppler going forward.

If a tester accidentally unset those Convex keys before this fix shipped, `npm run sync:convex` is the recovery command — it pulls the values from Doppler and re-applies them.

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
echo "Convex env (should contain only the allowlist: ADMIN_EMAIL, CLERK_WEBHOOK_SECRET, NEXT_PUBLIC_CLERK_FRONTEND_API_URL, plus CONVEX_DEPLOY_KEY if set):"
# Wrap in `doppler run` because the Convex CLI needs CONVEX_DEPLOYMENT injected — it's no longer in .env.local after migration.
doppler run -- npx convex env list 2>&1 || echo "(skipped — Convex not configured)"
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
