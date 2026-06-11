# blog module — post-copy steps

Perform these AFTER `node scripts/modules.mjs install blog` succeeds.
On a fresh template, `--apply-edits` performs all of this automatically (driven by
`module.json` → `edits`). These instructions exist for repos where the target files
may have been customized and the anchor comments are gone — apply them with Edit,
adapting to the user's code.

## What the copy did

- Added `app/blog/**` (index, post pages, category/tag routes, components),
  `app/feed.xml/route.ts` (RSS), `lib/blog.ts`, `lib/mdx.ts`, and
  `content/blog/*.mdx` (3 sample posts).

## 1. Add the Blog link to the header nav

File: `app/(landing)/header.tsx` — add to the `menuItems` array (at the
`// modules:nav` anchor if present):

```ts
{ name: 'Blog', href: '/blog' },
```

If the user replaced the header entirely, find their primary nav and add an
equivalent link. Do not duplicate an existing Blog link.

## 2. Restore blog entries in public/llms.txt

Under `## Documentation`:

```
- [Blog](/blog): Articles on secure development, vibe coding, and best practices
```

Under `## Technical Resources`:

```
- [RSS Feed](/feed.xml): Subscribe to latest articles
```

## 3. If the homepage-content module is installed: add the footer to the blog layout

Check: does `app/(landing)/footer.tsx` exist? If yes, in `app/blog/layout.tsx`:

```ts
import FooterSection from '@/app/(landing)/footer'
```

and render `<FooterSection />` after `</main>` (at the `{/* modules:footer */}`
anchor). If the footer does not exist, skip — the layout works without it.

## 4. Verify

- `npm run typecheck` passes
- `node scripts/generate-sitemap.mjs` reports blog posts added
- `/blog` renders the index with 3 sample posts; `/feed.xml` returns RSS
