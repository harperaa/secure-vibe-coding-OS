# Migrating from Doppler to Azure Key Vault — Research Plan & Design

**Status:** Research plan / design doc. Nothing implemented.
**Date:** 2026-08-17
**Scope:** Full functional parity with the current Doppler integration, scripted end to end, across `/install`, `/deploy-to-dev`, `/deploy-to-prod`, `/rotate`, and `/migrate-to-doppler`.

---

## 0. Governing constraint — Azure is an OPTION, Doppler is untouched

**This is a hard requirement, not a preference. Every design choice below is subordinate to it.**

This repo is a template with existing clones running Doppler in production. A migration that changes their behaviour is a broken release regardless of how good Azure is.

Concretely, that means:

1. **Three supported modes, selected by marker file**, exactly as today's Doppler/legacy split works:

   | Mode | Marker | Status |
   |---|---|---|
   | `doppler` | `.doppler.yaml` | **Default. Unchanged. Not deprecated.** |
   | `azure` | `.azure-kv.json` | New, opt-in |
   | `legacy` | neither | Unchanged |

2. **`/install` asks**, the same way it already asks Doppler vs legacy. Doppler stays the recommended default until Azure has run in production somewhere.

3. **No canonical names change.** Application code keeps reading `process.env.CLERK_SECRET_KEY`. The hyphenated form exists *only* inside the Key Vault boundary, via the §4.1 map. Nothing in `app/`, `convex/`, `lib/` (other than the new provider file) is aware Azure exists.

4. **A Doppler user must be able to pull this release and notice nothing.** The regression test for the whole project: on a `.doppler.yaml` repo, `/install`, `/deploy-to-dev` and `/rotate` behave byte-identically to today.

5. **Azure files are additive.** New: `lib/azure-secrets.ts`, `scripts/lib/azure-kv.mjs`, `scripts/lib/secret-name-map.mjs`, `scripts/azure-run.mjs`. Existing Doppler files are *moved behind an interface*, not rewritten.

This resolves **R9** below: build the abstraction, keep both.

---

## 0.1 Non-interactive invocation — provider as a CLI parameter

**Requirement:** `/install` must be fully scriptable with the provider chosen on the
command line, exactly like `--site-name` and `--admin-email` are today.

**Current state (verified):** it is *not*. Provider choice is implicit — `install.md`
asks interactively, then conditionally runs the `doppler-bootstrap` subcommand, which
writes `.doppler.yaml`. Every later step calls `isDopplerEnabled()`, which just tests
for that file. There is no `--secrets-provider` flag. **This is a gap in the Doppler
flow today, not only in the Azure design**, and fixing it benefits both.

### Target interface

```bash
# Fully non-interactive, all three providers
node scripts/setup.mjs init \
  --site-name="myapp" \
  --admin-email="me@example.com" \
  --secrets-provider=doppler          # doppler (default) | azure | legacy

# Azure needs four more parameters Doppler never required
node scripts/setup.mjs init \
  --site-name="myapp" \
  --admin-email="me@example.com" \
  --secrets-provider=azure \
  --azure-subscription-id="<uuid>" \
  --azure-tenant-id="<uuid>" \
  --azure-location="eastus" \
  --azure-resource-group="rg-myapp"   # optional; derived from site name if omitted
```

Rules:

1. **`--secrets-provider` omitted → `doppler`.** Preserves today's behaviour exactly;
   a cloner scripting against the current interface sees no change.
2. **Flag beats marker file.** If the flag is passed, it wins and the corresponding
   marker is written. If omitted, fall back to marker detection (current behaviour).
3. **Conflicting state is an error, not a guess.** `--secrets-provider=azure` in a repo
   that already has `.doppler.yaml` must fail loudly and name both, rather than
   silently ending up in a half-migrated state with two markers.
4. **Azure parameters are required only when `--secrets-provider=azure`.** Missing ones
   fail fast, listing exactly which, before any cloud resource is created.
5. `install.md` keeps its `AskUserQuestion` path for humans; it simply passes the answer
   through as the flag rather than branching on it internally. One code path, two entry
   points.

### Refactor implied

`isDopplerEnabled()` → `detectProvider({ flag })` returning `'doppler' | 'azure' | 'legacy'`.
It is called at 8 sites in `setup.mjs` and more in `deploy.mjs`; all become
`detectProvider() === 'doppler'`. Mechanical, but it must be done in **Phase 1** (the
abstraction) so no Doppler behaviour changes while Azure is still unwritten.

---

## 0.2 Idempotency — a requirement, and an active defect to not replicate

Every script must be safe to re-run. The current Doppler implementation is *mostly*
idempotent by probe-then-act, and Azure must copy that shape:

| Primitive | Pattern | Idempotent? |
|---|---|---|
| `ensureCliInstalled` | `commandExists()` first | ✅ |
| `ensureLoggedIn` | `doppler me` probe | ✅ |
| `ensureProject` | `projects get` probe | ✅ |
| `setupRepoForConfig` | `doppler setup` overwrites | ✅ (naturally) |
| `setSecret` / `setSecrets` | upsert semantics | ✅ (naturally) |
| `revokeServiceToken` | tolerates missing token | ✅ |
| **`createServiceToken`** | **no probe — creates unconditionally** | ❌ **defect** |

### ⚠️ Verified live defect (2026-08-17)

`createServiceToken` has no probe and `doppler configs tokens create` permits duplicate
names. Every re-run of `/install` or `/deploy-to-dev` mints another never-expiring
read token. Measured on this repo:

```
total live tokens : 15
never expire      : 15
distinct names    : 4
actually needed   : 2   (one CI, one Vercel runtime)
```

**13 orphaned, never-expiring, read-capable credentials for the dev config.**

This is worse than untidiness because `/rotate`'s containment step revokes **by name**:

```bash
doppler configs tokens revoke "$TOKEN_NAME" --project … --config … --yes
```

With 7 tokens sharing the name `vercel-runtime-dev`, whether that command revokes all
of them or one is **unverified** — and if it revokes one, `/rotate` reports successful
containment while six equivalent credentials remain live. That is a false assurance of
exactly the kind this repo has been removing elsewhere.

**Two consequences for this plan:**

1. **Fix the Doppler side independently of Azure.** It is a live issue on every existing
   clone, and it should not wait behind a migration that may not happen. Remedy: list
   tokens by name before creating; revoke pre-existing ones with that name, or reuse.
   Then sweep the 13 orphans here.
2. **Azure must not inherit it.** Service principal secrets and federated credentials
   accumulate the same way. The Azure provider must list-then-reconcile before creating
   any credential, and `/rotate` must target a credential **by ID**, never by display
   name. Display names are not unique in Entra ID either.

---

## 1. Verdict up front

Migration is **feasible but not a drop-in**. Doppler is a *secrets-as-environment* product; Azure Key Vault is a *secrets-as-individually-addressed-objects* product. Three differences are structural, not cosmetic, and each requires code we do not have today:

| # | Blocker | Impact |
|---|---|---|
| **B1** | **Key Vault forbids underscores in secret names** (`^[a-zA-Z][a-zA-Z0-9-]{0,126}$`) | **All 21 of our secrets are illegal as-is** (every one contains an underscore). Every read and write path needs a name-mapping layer. |
| **B2** | **No bulk value download.** You `LIST` names, then `GET` each value individually. | Our runtime fetch is **1 HTTP call**; Azure needs **N+1** (22 for 21 secrets) on every cold start. |
| **B3** | **No `doppler run --` equivalent.** Key Vault has no process-env injection. | Local dev (`npm run dev:doppler`, `convex:doppler`) needs a wrapper we write ourselves. |

None is fatal. All three are solvable with a shim layer. But "swap the provider" understates the work by roughly an order of magnitude — the honest estimate is **a new `lib/azure-secrets.ts` + `scripts/lib/azure-kv.mjs` of comparable size to the Doppler ones, plus a rewrite of five slash commands.**

**Recommendation:** build a provider abstraction first, keep Doppler working throughout, and cut over per-environment (dev → prd) with a documented rollback. Do not do a big-bang switch.

---

## 2. Complete inventory — what Doppler does for us today

This is the parity checklist. **Anything not replicated here is a regression.**

Sources: `scripts/lib/doppler.mjs` (65 refs), `scripts/setup.mjs` (141), `scripts/deploy.mjs` (51), `lib/secrets.ts`, `scripts/vercel-prebuild.mjs`, `scripts/sync-convex-env.mjs`, `.claude/commands/{install,deploy-to-dev,deploy-to-prod,rotate,migrate-to-doppler}.md`, `.github/workflows/ci.yml`.

### 2.1 Provisioning & lifecycle

| # | Capability | Where | Azure equivalent | Gap |
|---|---|---|---|---|
| C1 | **Cross-platform CLI install** (brew / scoop / curl, mac+win+linux) | `doppler.mjs:90-215` | `az` CLI — brew, MSI, apt/dnf script | Different installers; same shape. **Rewrite required.** |
| C2 | **Interactive OAuth login** (`doppler login`, blocks until browser flow done) | `doppler.mjs:216-230` | `az login` (device code / browser) | Equivalent. **User action required.** |
| C3 | **Create/get project** | `doppler.mjs:232-242` | Resource group + Key Vault (`az keyvault create`) | Two-level (RG + vault) vs one. Also needs **region** and **subscription** choices Doppler never asked for. |
| C4 | **Environments as configs** (`dev`, `prd`; deletes default `stg`) | `doppler.mjs:241` | **No config concept.** Either one vault per env, or name-prefix within one vault | **Design decision required** — see §4.2. |
| C5 | **Repo pinning** (`doppler setup` → `~/.doppler/.doppler.yaml` + repo `.doppler.yaml` marker) | `doppler.mjs:244-260` | No equivalent. We invent `.azure-kv.json` marker | **Write ourselves.** `isDopplerEnabled()` keys off this marker everywhere. |

### 2.2 Secret read/write

| # | Capability | Where | Azure equivalent | Gap |
|---|---|---|---|---|
| C6 | **Set one secret** | `doppler.mjs:263` | `az keyvault secret set` | Name mapping (B1). |
| C7 | **Set many** (bulk seed, 26 call sites) | `doppler.mjs:275` | Loop of `secret set` | **300 CREATE/10s limit** — fine at 21, note it for larger projects. |
| C8 | **Download all as JSON** (`secrets download --no-file --format json`) | `doppler.mjs:282` | **None.** `secret list` + `secret show` per key | **B2.** N+1. |
| C9 | **Get one** (`secrets get --plain`) | 8 call sites | `az keyvault secret show --query value -o tsv` | Name mapping. |
| C10 | **Unset** | `sync-convex-env.mjs` | `az keyvault secret delete` (+ `purge` if soft-delete on) | **Soft-delete changes semantics** — see §4.5. |
| C11 | **Upload (bulk import)** | `migrate-to-doppler.md` | Loop | — |
| C12 | **List names only** | `rotate.md:166` | `az keyvault secret list --query "[].name"` | Returns mapped names; must reverse-map for display. |

### 2.3 Runtime & build integration

| # | Capability | Where | Azure equivalent | Gap |
|---|---|---|---|---|
| C13 | **Runtime fetch on Vercel** — REST + Bearer token, memoized per instance, retry w/ backoff, cache invalidation | `lib/secrets.ts` | Key Vault REST + AAD token | **B2** (N+1) + token acquisition adds a round trip. **Rewrite.** |
| C14 | **Build-time fetch** → writes `.env.production.local` so `next build` inlines `NEXT_PUBLIC_*` | `vercel-prebuild.mjs` | Same shape, N+1 fetch | **Rewrite.** |
| C15 | **Local dev env injection** (`doppler run -- next dev`) | `package.json` scripts | **None** | **B3.** Write `scripts/azure-run.mjs` wrapper. |
| C16 | **Service token for CI** → GitHub secret `DOPPLER_TOKEN` | `setup.mjs`, `ci.yml` | Service principal secret, or **OIDC federation** | See §4.3 — OIDC is a genuine *upgrade*. |

### 2.4 Operational

| # | Capability | Where | Azure equivalent | Gap |
|---|---|---|---|---|
| C17 | **Token create/revoke** (containment in `/rotate`) | `doppler.mjs:305,318` | SP secret rotate, or federated-credential delete | Revocation latency differs — **verify** (R4). |
| C18 | **Cache revalidation endpoint** | `app/api/revalidate-secrets/route.ts` | Provider-agnostic — **reusable as-is** | None. |
| C19 | **Convex env bridge** (Convex can't fetch at runtime; allowlist mirrored via `convex env set`) | `sync-convex-env.mjs` | Identical pattern, different source | Low risk. **Reusable shape.** |
| C20 | **Activity/audit log** (`doppler activity`) | `rotate.md` | Azure Monitor diagnostic logs → Log Analytics | **Not on by default.** Must be explicitly enabled + costs money. |
| C21 | **Vercel holds only `DOPPLER_TOKEN`** — blast-radius reduction | `deploy.mjs` | Same, or zero secrets with OIDC | **Improvement available.** |

---

## 3. Research plan — open questions, and how to answer each

Each item states the question, why it changes the design, and the *cheapest experiment* that settles it. Do these **before** writing migration code.

| ID | Question | Why it matters | How to settle it | Effort |
|---|---|---|---|---|
| **R1** | Can Vercel's OIDC token federate to Azure workload identity, removing the long-lived secret entirely? | Decides §4.3. If yes, this is strictly better than Doppler today. | Configure a federated credential on an App Registration with Vercel's issuer; deploy a probe route that exchanges the OIDC token for an AAD token and reads one secret. | 1 day |
| **R2** | What is real cold-start latency for N+1 fetch of 21 secrets from Vercel `iad1` to a chosen Azure region? | If >1s it changes the caching design (may need build-time bake + shorter runtime path). | Deploy a probe route; measure p50/p95 over 50 cold starts. Compare against Doppler's current ~100–300ms single call. | 0.5 day |
| **R3** | One vault per environment, or one vault with name prefixes? | Determines blast radius, RBAC granularity, cost, and the whole naming scheme. | Decision, informed by R6 cost + RBAC model. Write both as ADRs and pick. | 0.5 day |
| **R4** | How fast does revoking a service principal secret / federated credential actually stop access? | `/rotate`'s containment guarantee depends on it. Doppler token revocation is effectively immediate. AAD token lifetime is typically ~60–90 min — **a revoked SP may keep working until its issued token expires.** | Issue a token, revoke the credential, poll a secret read every 30s until it fails. Record the actual window. | 0.5 day |
| **R5** | ~~Does soft-delete/purge-protection interfere with `unset` and re-install?~~ **PARTLY ANSWERED — see §4.5.** Remaining question: does `az keyvault create` on a soft-deleted name return a distinguishable error code we can branch on, or must we pre-check `list-deleted`? | Determines whether `/install` can auto-recover or must always pre-flight. | One throwaway vault: create, delete, attempt same-name create, capture exact exit code + message. Then test recover and confirm RBAC assignments are indeed absent afterwards. | 0.5 day |
| **R6** | Total cost at our scale, including the audit logging we'd need for C20 parity. | Doppler has a flat team price; Key Vault bills per 10k transactions + Log Analytics ingestion. N+1 multiplies transaction count by 22. | Model: (cold starts/day × 22 calls) + CI + local dev. Price against current Doppler plan. | 0.5 day |
| **R7** | Is `@azure/keyvault-secrets` + `@azure/identity` acceptable in the Vercel runtime, and what do they add to the bundle? | `lib/secrets.ts` today uses bare `fetch` with zero deps. Adding two SDKs affects cold start and supply-chain surface (we run a 7-day install cooldown). | Build with each approach; compare bundle size and cold-start. Consider raw REST to keep the zero-dep property. | 0.5 day |
| **R8** | ~~Does anything depend on Doppler-specific env vars (`DOPPLER_PROJECT`, `DOPPLER_CONFIG`, `DOPPLER_ENVIRONMENT`)?~~ | — | **ANSWERED 2026-08-17: No.** Repo-wide grep across `.ts/.tsx/.mjs/.js` returns zero reads. They are Doppler-injected metadata that appear in our secret list but are never consumed. Safe to drop; do **not** recreate them in Key Vault. | done |
| **R9** | ~~Keep Doppler as an option, or replace it?~~ | — | **ANSWERED — decided, see §0.** Both are supported; Doppler remains the default and is not deprecated. Azure is opt-in via `.azure-kv.json`. This is a governing constraint, not an open question. | done |

---

## 4. Design decisions

### 4.1 Name mapping (solves B1) — explicit map, not a transform

**Use an explicit lookup table, not an algorithmic `_` → `-` replace.**

A blind transform looks simpler and is worse:

- **It is not reversible in general.** `A_B` → `A-B`, but so does a hypothetical `A-B`. Reading back, you cannot tell which you started with. The bug surfaces the first time someone adds a key with a hyphen — silently, as a wrong value.
- **It hides new keys.** A transform quietly accepts anything. A map forces a human to add a line, which means a reviewer sees the new secret entering the vault.
- **It cannot express exceptions.** Azure requires names start with a letter; a future `2FA_SECRET` is illegal and a transform would produce an invalid name at write time, in the middle of a migration.

The map lives in **one file**, is loaded by both the Node scripts and the runtime, and is the single source of truth:

```js
// scripts/lib/secret-name-map.mjs — shared by scripts AND lib/azure-secrets.ts
//
// Left  = canonical env var name, used EVERYWHERE in application code.
// Right = Azure Key Vault secret name (^[a-zA-Z][a-zA-Z0-9-]{0,126}$, no underscores).
//
// Doppler ignores this file entirely — it stores the canonical name verbatim.
// This exists solely because Key Vault forbids underscores.
//
// Adding a secret? Add a line here. A missing entry FAILS LOUDLY rather than
// guessing, so a typo cannot silently write to the wrong secret name.
export const ENV_TO_AZURE = Object.freeze({
  ADMIN_EMAIL:                        'ADMIN-EMAIL',
  CLERK_SECRET_KEY:                   'CLERK-SECRET-KEY',
  CLERK_WEBHOOK_SECRET:               'CLERK-WEBHOOK-SECRET',
  CLERK_JWT_ISSUER_DOMAIN:            'CLERK-JWT-ISSUER-DOMAIN',
  CONVEX_DEPLOYMENT:                  'CONVEX-DEPLOYMENT',
  CONVEX_DEPLOY_KEY:                  'CONVEX-DEPLOY-KEY',
  CSRF_SECRET:                        'CSRF-SECRET',
  SESSION_SECRET:                     'SESSION-SECRET',
  REVALIDATE_TOKEN:                   'REVALIDATE-TOKEN',
  GEMINI_API_KEY:                     'GEMINI-API-KEY',
  NEXT_PUBLIC_CONVEX_URL:             'NEXT-PUBLIC-CONVEX-URL',
  NEXT_PUBLIC_CONVEX_SITE_URL:        'NEXT-PUBLIC-CONVEX-SITE-URL',
  NEXT_PUBLIC_SITE_NAME:              'NEXT-PUBLIC-SITE-NAME',
  NEXT_PUBLIC_SITE_URL:               'NEXT-PUBLIC-SITE-URL',
  NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT:  'NEXT-PUBLIC-AXIOM-INGEST-ENDPOINT',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:  'NEXT-PUBLIC-CLERK-PUBLISHABLE-KEY',
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: 'NEXT-PUBLIC-CLERK-FRONTEND-API-URL',
  NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:    'NEXT-PUBLIC-CLERK-SIGN-IN-FORCE-REDIRECT-URL',
  NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:    'NEXT-PUBLIC-CLERK-SIGN-UP-FORCE-REDIRECT-URL',
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: 'NEXT-PUBLIC-CLERK-SIGN-IN-FALLBACK-REDIRECT-URL',
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: 'NEXT-PUBLIC-CLERK-SIGN-UP-FALLBACK-REDIRECT-URL',
  // DOPPLER_PROJECT / DOPPLER_CONFIG / DOPPLER_ENVIRONMENT are intentionally
  // absent — R8 confirmed nothing reads them. Do not recreate them in Azure.
});

export const AZURE_TO_ENV = Object.freeze(
  Object.fromEntries(Object.entries(ENV_TO_AZURE).map(([k, v]) => [v, k]))
);
```

**Required invariants, enforced by test:**

1. **Bijective** — `Object.keys(ENV_TO_AZURE).length === Object.keys(AZURE_TO_ENV).length`. A duplicate right-hand value collapses two secrets into one and would silently overwrite; the test must catch it.
2. **Every value is Azure-legal** — matches `^[a-zA-Z][a-zA-Z0-9-]{0,126}$`.
3. **Covers reality** — every key returned by the live provider is present. Run this against the actual secret list in CI so a secret added via the dashboard, bypassing our scripts, fails the build instead of vanishing at runtime.
4. **Unmapped names throw.** `toAzureName()` on a key not in the map must throw with the exact line to add. Never fall back to a transform — that reintroduces every problem above.

A companion `scripts/check-secret-map.mjs` (same shape as `check-convex-auth.mjs`) can assert 1–3 in CI without needing cloud credentials.

### 4.2 Environment model (R3)

| Option | Pros | Cons |
|---|---|---|
| **A. One vault per env** (`svc-myapp-dev`, `svc-myapp-prd`) | Clean RBAC boundary; prd readable only by prd identity; blast radius contained | 2× vaults to provision; global-unique vault names; purge-protection reuse pain (R5) |
| **B. One vault, prefixed names** (`DEV-CLERK-SECRET-KEY`) | One resource; cheaper; simpler bootstrap | **RBAC is per-vault, not per-secret-prefix** — any reader reads *both* environments. Fails the isolation Doppler gives us for free. |

**Recommendation: Option A.** Option B silently weakens the dev/prd boundary we have today, which is the opposite of the point.

### 4.3 Authentication (C16, C21, R1)

Two paths, in preference order:

**Preferred — Workload Identity Federation (OIDC).** Vercel issues an OIDC token per deployment; Azure trusts it via a federated credential. **No long-lived secret in Vercel at all.** This is strictly better than today's `DOPPLER_TOKEN` and would remove the single highest-value credential from our threat model. Gated on **R1**.

**Fallback — Service principal + client secret.** Vercel holds `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`. Same shape as today (one credential in Vercel), but now **three** env vars and the secret has an expiry Doppler tokens don't — so `/rotate` must also handle *scheduled* expiry, not just incident rotation.

⚠️ **Do not use `DefaultAzureCredential` in the Vercel runtime.** It probes managed identity, IMDS, and CLI in order, adding latency and failure modes that don't apply outside Azure. Construct the specific credential explicitly.

### 4.4 Runtime fetch (solves B2)

`lib/azure-secrets.ts` mirrors `lib/secrets.ts`'s contract exactly — `ensureSecretsLoaded()` / `revalidateSecrets()`, memoized promise, reset-on-failure. Differences:

1. Acquire AAD token (cache until ~5 min before expiry).
2. `LIST` secret names (1 call).
3. `GET` each value **with bounded concurrency** (suggest 8) — 22 sequential round trips would dominate cold start.
4. Reverse-map names, write `process.env`.

**Retry only on 429/5xx**, honouring `Retry-After`. Never retry 403 — that's a permissions fault and retrying hides it.

### 4.5 Soft-delete and purge protection (R5) — **verified against Microsoft docs 2026-08-17**

This section was **corrected after verification**; the first draft conflated soft-delete with
purge protection. The distinction decides whether a failed `/install` is recoverable.

**Verified facts:**

| Behaviour | Reality |
|---|---|
| Soft-delete on new vaults | **On by default. Cannot be disabled once enabled.** |
| Retention | 7–90 days, **default 90**. Set only at vault creation, **immutable afterwards**. |
| Deleted vault name | **Cannot be reused in the same location until retention expires** — *unless* you purge it. |
| Purge protection | **Optional, OFF by default.** Can only be enabled after soft-delete. **Cannot be disabled once on.** |
| With purge protection on | You **cannot** purge early. The name is locked for the full retention period with **no escape**. |
| Deleted secret name | A new secret with the same name **cannot** be created while a deleted one exists. Recover or purge first. |
| Purge permission | Requires subscription Owner or the **Key Vault Purge Operator** role — *not* granted by Contributor. |

**Consequences for our scripts:**

1. **`/install` must handle "vault name is soft-deleted".** `az keyvault create` fails with a
   name-conflict that looks like "already exists" but is not. The script must call
   `az keyvault list-deleted`, and then either **recover** or **purge**, or pick a suffixed
   name — and say which, loudly. Guessing here strands the user.

2. **⚠️ Recovering a vault does NOT restore its RBAC role assignments.** Microsoft states
   plainly: *"When a Key Vault is soft-deleted, services that are integrated with the Key
   Vault are deleted. For example: Azure RBAC roles assignments… Recovering a soft-deleted
   Key Vault does not restore these services. They must be recreated."*

   This is the nastiest edge case in the whole migration: a naive recover-and-continue
   produces a vault that **exists, contains the right secrets, and the app cannot read**.
   The failure appears at runtime as a 403, far from the `/install` that caused it.
   **`/install` must re-apply role assignments after any recover, unconditionally.**

3. **Do NOT enable purge protection by default.** It is off by default, and for a *template*
   that people install, tear down, and reinstall, turning it on converts a routine re-install
   into a hard 7–90 day block on the vault name. Offer it as an opt-in flag
   (`--azure-purge-protection`) for production installs, defaulting off, with the trade
   stated in the prompt.

4. **`unset` (C10) is two operations, not one.** `az keyvault secret delete` soft-deletes;
   the name stays occupied. `sync-convex-env.mjs`'s unset path must either purge (needs the
   Purge Operator role) or tolerate the name being unavailable for re-creation. **Doppler's
   `secrets unset` is immediate and unconditional — this is a genuine behaviour change**, and
   the Convex sync's remove-then-add pattern would break without handling it.

5. **Set retention explicitly at creation** (`--retention-days`). It is immutable afterwards,
   and the 90-day default is the most painful choice for a repo people reinstall. 7 days is
   the reasonable template default; production installs can choose longer.

### 4.6 Doppler non-regression — the gate every phase must pass

§0 states the constraint; this is how it is *enforced*. Before any phase merges, all of
these must hold on a repo with `.doppler.yaml` and **no** Azure parameters:

| # | Check | How |
|---|---|---|
| D1 | `detectProvider()` returns `doppler` with no flag passed | unit test |
| D2 | No new required parameter on any existing subcommand | run `init`, `configure`, `convex-setup`, `doppler-bootstrap`, `doppler-sync-env-local`, `doppler-create-ci-token` with **today's exact arguments** and diff the JSON output |
| D3 | `lib/secrets.ts` runtime path byte-identical for Doppler | the Azure provider is a **separate file**; `secrets.ts` is not edited |
| D4 | `.doppler.yaml` semantics unchanged | marker still written by `doppler-bootstrap`, still read everywhere |
| D5 | `/rotate` Doppler path unchanged | dry-run against a scratch Doppler project |
| D6 | `vercel-prebuild.mjs` still no-ops without `DOPPLER_TOKEN` | run with the var unset |
| D7 | CI green on a Doppler clone | full pipeline |
| D8 | **No Azure SDK in the Doppler dependency path** | if the Azure provider needs `@azure/*`, they must be `optionalDependencies` or lazily imported, so Doppler users neither install nor bundle them — this also keeps them out of the 7-day install cooldown surface |

D8 is easy to miss and would be a real regression: adding `@azure/identity` to
`dependencies` puts two new packages into every Doppler cloner's tree, their `npm audit`,
and their supply-chain exposure — for a provider they do not use.

---

## 5. Migration phases

Each phase is independently revertible. **Doppler keeps working until Phase 5.**

### Phase 0 — Research spike (R1–R9) · ~4 days
No production changes. Produces: OIDC verdict, latency numbers, cost model, env-model ADR.
**Exit criteria:** R1, R2, R4, R5 answered with measurements, not estimates.

### Phase 0.5 — Fix the Doppler token defect (independent of Azure) · ~0.5 day
Not part of the migration; listed here because §0.2 found it and it should not wait.
Add list-then-reconcile to `createServiceToken`, target revoke by slug not name, and sweep
the 13 orphaned tokens on this repo. **Ships to Doppler users as a straight bug fix.**

### Phase 1 — Provider abstraction + CLI parameterization · ~2.5 days
Introduce a `SecretsProvider` interface; move all Doppler calls behind it. **Doppler remains
the only implementation.** `isDopplerEnabled()` → `detectProvider({ flag })` returning
`'doppler' | 'azure' | 'legacy'`, and add `--secrets-provider` per §0.1 so the existing
Doppler and legacy flows become fully non-interactive too.

**Verify:** §4.6 gate D1–D8, plus a real `/deploy-to-dev`. Zero behaviour change; the flag
defaults to `doppler` so every existing invocation is untouched.

### Phase 2 — Azure provider, dev only · ~3 days
`scripts/lib/azure-kv.mjs` + `lib/azure-secrets.ts` + `scripts/azure-run.mjs` (B3 wrapper).
**Verify:** a scratch clone installs to Azure dev and deploys; app boots; Clerk login works; Convex bridge syncs.

### Phase 3 — Command parity · ~3 days
Rewrite `/install`, `/deploy-to-dev`, `/deploy-to-prod`, `/rotate` to branch on provider. Add `/migrate-to-azure` mirroring `/migrate-to-doppler` (inventory → migrate → cleanup, with the `0600` + shred handling we already fixed).
**Verify:** run each command end to end on a scratch clone.

### Phase 4 — Production dry run · ~1 day
Migrate a **non-critical** project's prd. Rotate once. Confirm `/rotate` containment against the R4 measurement.

### Phase 5 — Cutover (this repo only) · ~1 day
Switch **this repo's own** deployment to Azure. Doppler stays populated and untouched for the rollback window.

This is a change to our installation, **not to the template's default**. `/install` continues to
recommend Doppler for cloners until Azure has run in production here without incident.

### Phase 6 — Decommission OUR Doppler project · after 30 days clean
Revoke **our** Doppler tokens and archive **our** project. **Not before.**

Explicitly NOT in scope: removing Doppler support from the template. `scripts/lib/doppler.mjs`,
the `doppler` provider, and `/migrate-to-doppler` all stay shipped and working. Cloners on Doppler
are unaffected by anything in this plan.

---

## 6. What only you can do

Everything else is scripted. These require a human because they involve accounts, billing, or browser auth.

| # | Action | When | Notes |
|---|---|---|---|
| **A1** | Provide an **Azure subscription** and confirm who pays | Before Phase 0 | Needed for any vault. Get the subscription ID. |
| **A2** | Decide **tenant + subscription + region** | Phase 0 | Region affects R2 latency. Pick near Vercel's primary region (`iad1` → East US). |
| **A3** | Run `az login` in your terminal | Each machine, once | Browser OAuth; agents cannot complete it. Same constraint as `doppler login` today. |
| **A4** | Confirm you hold **Owner or User Access Administrator** on the subscription | Phase 0 | Required to create role assignments. `Contributor` alone **cannot** grant RBAC — a common and confusing failure. |
| **A5** | Approve **App Registration creation** | Phase 2 | Many tenants restrict this to admins. If yours does, an admin must create it and hand back the client ID. |
| **A6** | Decide **R3**: one vault per env vs prefixes | Phase 0 | Recommendation: per-env. Yours to confirm. |
| ~~A7~~ | ~~Decide R9~~ | — | **Decided: both supported, Doppler default (§0).** No action needed. |
| **A8** | Approve **enabling diagnostic logging** (cost) | Phase 2 | Needed for C20 audit parity. Not free. |
| **A9** | Provide the **rollback decision window** | Phase 5 | How long we keep Doppler live in parallel. Recommend 30 days. |
| **A10** | Rotate every secret **after** migration completes | Phase 5 | Values pass through a migration host. Treat them as exposed — same reasoning as our existing `/rotate` doc. |

---

## 7. Recommendation

**Build the abstraction (Phase 1) regardless of whether you complete the migration.** It is ~2 days, it is independently valuable, and it converts "rip out Doppler" into "add a provider" — which is a reversible decision rather than a one-way door.

**Then decide on Azure with R1's answer in hand.** If Vercel→Azure OIDC federation works, the migration is genuinely worth doing on security grounds alone: it removes the long-lived runtime credential that is currently the single highest-value secret in the system. If it doesn't work, you are trading a purpose-built secrets-as-environment product for a general-purpose vault plus ~600 lines of shim, to gain Azure-ecosystem alignment and lose per-request latency. That trade is defensible for an org standardising on Azure and hard to justify otherwise.

**Do not migrate for cost.** At 21 secrets the difference is noise, and the N+1 pattern plus Log Analytics ingestion can make Key Vault *more* expensive than it looks.

**Because Azure is opt-in (§0), "don't migrate" stays available at every phase.** Phases 1–4 add capability without removing any; the first irreversible-ish step is Phase 5, and even that is scoped to our own deployment with Doppler kept live for the rollback window. If R1 comes back negative or R2 shows unacceptable cold-start latency, stopping after Phase 1 leaves the repo strictly better than it is today — a provider seam, no behaviour change, no cloner affected.

### Smallest useful next step

Phase 0 costs nothing and needs no commitment. Of the nine research items, **R1 (OIDC federation) and R2 (cold-start latency) decide the whole thing** — one makes Azure a security *upgrade*, the other is the main way it could be a regression. Answer those two before spending a day on anything else. R8 is already answered; R3–R7 only matter if R1/R2 land well.

---

## 8. Sources

- [About Azure Key Vault secrets](https://learn.microsoft.com/en-us/azure/key-vault/secrets/about-secrets) — 25 KB limit, attributes, tags, per-vault access control
- [Azure Key Vault service limits](https://learn.microsoft.com/en-us/azure/key-vault/general/service-limits) — 4,000 secret transactions/10s; 300 CREATE/10s; subscription limit 5× vault
- [Key Vault naming rules discussion](https://github.com/Azure/azure-sdk-for-net/issues/39975) — underscores unsupported in secret names
- [PSRule Azure.KeyVault.SecretName](https://azure.github.io/PSRule.Rules.Azure/en/rules/Azure.KeyVault.SecretName/) — `^[a-zA-Z][a-zA-Z0-9-]{0,126}$`
- Local inventory: `scripts/lib/doppler.mjs`, `scripts/setup.mjs`, `scripts/deploy.mjs`, `lib/secrets.ts`, `scripts/vercel-prebuild.mjs`, `scripts/sync-convex-env.mjs`, `.claude/commands/*.md`
