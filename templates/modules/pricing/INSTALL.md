# pricing module — post-copy steps

Perform these AFTER `node scripts/modules.mjs install pricing` succeeds.
On a fresh template, `--apply-edits` performs all of this automatically (driven by
`module.json` → `edits`). These instructions exist for repos where the target files
may have been customized and the anchor comments are gone — apply them with Edit,
adapting to the user's code.

Note: Clerk Billing being disabled is fine — `CustomClerkPricing` degrades
gracefully and shows a "coming soon" placeholder until billing is enabled in the
Clerk dashboard.

## What the copy did

- Added `app/dashboard/payment-gated/page.tsx` and
  `components/custom-clerk-pricing.tsx`.

## 1. Add the pricing section to the homepage

File: `app/(landing)/page.tsx` — add the import (at the `// modules:imports`
anchor if present):

```tsx
import CustomClerkPricing from "@/components/custom-clerk-pricing";
```

and insert before the `{/* modules:sections */}` anchor (or wherever a pricing
section fits the user's homepage):

```tsx
<section id="pricing" className="bg-muted/50 py-12 md:py-16">
  <div className="mx-auto max-w-7xl px-6">
    <div className="mb-8 mx-auto max-w-2xl space-y-4 text-center">
      <h1 className="text-center text-4xl font-semibold lg:text-5xl">Pricing that Scales with You (EXAMPLE ONLY)</h1>
      <p>Choose the plan that fits your needs. From startups to enterprise applications. THIS IS JUST AN EXAMPLE PRICING SECTION... the Secure Vibe Coding OS is free...</p>
    </div>
    <CustomClerkPricing />
  </div>
</section>
```

Keep the `id="pricing"` attribute — the header nav link targets it.

## 2. Add the Pricing link to the header nav

File: `app/(landing)/header.tsx` — add to the `menuItems` array (at the
`// modules:nav` anchor if present):

```ts
{ name: 'Pricing', href: '/#pricing' },
```

## 3. Add the "Payment gated" item to the dashboard sidebar

File: `app/dashboard/app-sidebar.tsx`:

- Add `IconSparkles` to the `@tabler/icons-react` import block.
- Add to the `navMain` array (at the `// modules:nav` anchor if present):

```ts
{
  title: "Payment gated",
  url: "/dashboard/payment-gated",
  icon: IconSparkles,
},
```

## 4. Verify

- `npm run typecheck` passes
- `/` shows the pricing section; `/#pricing` nav link scrolls to it
- `/dashboard` sidebar shows "Payment gated"; `/dashboard/payment-gated` renders
