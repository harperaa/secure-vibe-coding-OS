# background-job module — post-copy steps

Perform these AFTER `node scripts/modules.mjs install background-job` succeeds.
On a fresh template, `--apply-edits` performs all of this automatically (driven by
`module.json` → `edits`). These instructions exist for repos where the target files
may have been customized and the anchor comments are gone — apply them with Edit,
adapting to the user's code.

The backend (`convex/jobs.ts` and the `jobs` table in `convex/schema.ts`) is part
of the always-installed security backend, so nothing needs deploying beyond the
usual `npx convex dev`.

## What the copy did

- Added `app/dashboard/jobs/page.tsx`.

## 1. Add the "Background jobs" item to the dashboard sidebar

File: `app/dashboard/app-sidebar.tsx`:

- Add `IconClockPlay` to the `@tabler/icons-react` import block.
- Add to the `navMain` array (at the `// modules:nav` anchor if present):

```ts
{
  title: "Background jobs",
  url: "/dashboard/jobs",
  icon: IconClockPlay,
},
```

## 2. Verify

- `npm run typecheck` passes
- `/dashboard` sidebar shows "Background jobs"; `/dashboard/jobs` renders
- Click **Start flaky demo**: the row goes queued → running → queued (with the
  simulated error shown) twice, then running → done on the third attempt, with
  no page refresh
