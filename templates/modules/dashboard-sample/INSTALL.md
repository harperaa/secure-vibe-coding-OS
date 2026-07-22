# dashboard-sample module — post-copy steps

Perform these AFTER `node scripts/modules.mjs install dashboard-sample` succeeds.

## What the copy did

- Replaced `app/dashboard/page.tsx` with the demo dashboard (this file is listed
  in `overwrites` — replacing the minimal welcome page is expected).
- Added `section-cards.tsx`, `chart-area-interactive.tsx`, `data-table.tsx`, and
  `data.json` to `app/dashboard/`.

## Post-copy steps

None — this module has no nav or content edits (`module.json` → `edits` is empty).
The Dashboard sidebar link already points at `/dashboard`.

## Verify

- `npm run typecheck` passes
- `/dashboard` renders KPI cards, the interactive chart, and the data table
