# homepage-content module — post-copy steps

Perform these AFTER `node scripts/modules.mjs install homepage-content` succeeds.
On a fresh template, `--apply-edits` performs all of this automatically (driven by
`module.json` → `edits`). These instructions exist for repos where the target files
may have been customized and the anchor comments are gone — apply them with Edit,
adapting to the user's code.

## What the copy did

- Replaced `app/(landing)/page.tsx` with the full marketing homepage (this file is
  listed in `overwrites` — replacing the minimal placeholder is expected).
- Added the marketing sections to `app/(landing)/` (hero, security promo, features,
  testimonials, FAQs, CTA, footer) and the animation components
  (`components/magicui/`, `components/motion-primitives/`, `components/react-bits/`
  pixel-card + text-cursor, `components/kokonutui/`).
- Added `public/hero-section-main-app-dark.png` and `public/security-dashboard.png`.

## 1. Add nav links to the header

File: `app/(landing)/header.tsx` — add to the `menuItems` array (at the
`// modules:nav` anchor if present):

```ts
{ name: 'Features', href: '/#features' },
{ name: 'About', href: '/#about' },
```

If the user replaced the header entirely, find their primary nav and add equivalent
links. Do not duplicate existing entries.

## 2. If the blog module is installed: add the footer to the blog layout

Check: does `app/blog` exist? If yes, in `app/blog/layout.tsx`:

```ts
import FooterSection from '@/app/(landing)/footer'
```

and render `<FooterSection />` after `</main>` (at the `{/* modules:footer */}`
anchor if present). Skip if already there.

## 3. If the pricing module is installed: restore the pricing section

Check: does `app/dashboard/payment-gated` exist? If yes, the overwrite of
`page.tsx` removed the pricing section — re-add it. In `app/(landing)/page.tsx`:

```tsx
import CustomClerkPricing from "@/components/custom-clerk-pricing";
```

and insert before the `{/* modules:sections */}` anchor (or between the security
and testimonials sections):

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

## 4. Verify

- `npm run typecheck` passes
- `/` renders the full marketing homepage; `/#features` and `/#about` nav links work
