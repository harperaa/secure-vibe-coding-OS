---
name: LLM SEO Optimized Blog Engine
description: Building a blog optimized for both traditional SEO and AI crawlers like ChatGPT, Claude, and Perplexity. Covers llms.txt implementation, static site generation for AI crawler compatibility, sitemap automation, robots.txt configuration for GPTBot/ClaudeBot, MDX blog setup in Next.js 15 App Router, JSON-LD structured data, and RSS feed generation. Use this when building blogs, content sites, or any public-facing pages that need to be discoverable by LLMs and AI search engines.
triggers:
  - "SEO optimization"
  - "LLM SEO"
  - "blog engine"
  - "ChatGPT crawler"
  - "AI crawler optimization"
  - "llms.txt"
  - "GPTBot"
  - "ClaudeBot"
  - "sitemap generation"
  - "MDX blog Next.js"
  - "static site generation blog"
  - "robots.txt AI crawlers"
  - "JSON-LD blog"
  - "RSS feed Next.js"
---

# LLM SEO Optimized Blog Engine

## Goal

Build a full-featured blog engine that maximizes discoverability by both traditional search engines AND AI crawlers (ChatGPT, Claude, Perplexity). The blog should use static site generation, support MDX content, and include all LLM SEO optimizations.

## Context

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with Typography plugin
- **Content**: MDX files stored in `/content/blog/`
- **Key insight**: AI crawlers do NOT execute JavaScript - they only see server-rendered HTML

## What Worked ✅

### Approach

1. **Static Site Generation (SSG)** for all blog content - ensures AI crawlers see full content
2. **llms.txt** at site root - guides AI crawlers to important content
3. **Explicit robots.txt rules** for each AI crawler user agent
4. **JSON-LD structured data** using TechArticle schema
5. **Automated sitemap generation** via Node.js script with prebuild hook

### Exact Parameters

**Blog Directory Structure:**
```
/content/blog/           # MDX source files
/app/blog/               # Next.js routes
  ├── page.tsx           # Blog index (SSG)
  ├── [slug]/page.tsx    # Individual posts (SSG)
  ├── category/[category]/page.tsx
  ├── tag/[tag]/page.tsx
  └── components/        # Blog-specific components
/public/
  ├── llms.txt           # LLM content guide
  ├── sitemap.xml        # Generated sitemap
  └── robots.txt         # AI crawler rules
```

**MDX Frontmatter Schema:**
```yaml
---
title: "Post Title"
description: "150-160 char description for SEO"
date: "2026-01-08"
author: "Author Name"
category: "Category"
tags: ["tag1", "tag2"]
image: "/blog/images/post-image.png"
---
```

**Key Dependencies:**
```json
{
  "next-mdx-remote": "^5.0.0",
  "gray-matter": "^4.0.3",
  "reading-time": "^1.5.0",
  "rehype-highlight": "^7.0.2",
  "rehype-slug": "^6.0.0",
  "rehype-autolink-headings": "^7.1.0",
  "remark-gfm": "^4.0.1",
  "@tailwindcss/typography": "^0.5.19"
}
```

**Tailwind v4 Typography Plugin:**
```css
/* In globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

**robots.txt for AI Crawlers:**
```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
```

**llms.txt Format (Markdown-based):**
```markdown
# Site Name

> Brief description of site purpose and value proposition.

## Documentation
- [Link Title](/path): Description of content

## Blog
- [Blog Home](/blog): All articles

## Optional
- [Less Important](/path): Secondary content
```

### Why It Worked

1. **SSG ensures AI crawlers see content**: GPTBot, ClaudeBot, etc. don't execute JavaScript - they only parse HTML. Using `generateStaticParams()` pre-renders all content at build time.

2. **llms.txt provides structured guidance**: Following the llmstxt.org spec gives AI systems a curated map of important content, helping them prioritize what to index.

3. **Explicit crawler rules build trust**: Listing each AI crawler user agent explicitly in robots.txt signals intentional support for AI indexing.

4. **JSON-LD provides semantic context**: TechArticle schema helps AI systems understand content type, authorship, and relationships.

## Failed Attempts ❌

| Attempt | What We Tried | Why It Failed | Lesson Learned |
|---------|---------------|---------------|----------------|
| 1 | Dynamic sitemap via `app/sitemap.ts` | Works but user wanted static file + automation | Static generation with Node.js script provides more control and prebuild hook |
| 2 | Using regex with 's' flag in TypeScript | TS error: "flag only available when targeting es2018+" | Rewrite using string splitting instead of regex with 's' flag |
| 3 | Named export for FooterSection | Component used default export | Always check actual export type before importing |
| 4 | Installing tsx for scripts | User preferred Node.js directly | Use `.mjs` extension for ES modules with Node.js |

## Lessons Learned 📚

### Key Insights

1. **AI crawlers are JavaScript-blind**: ChatGPT, Claude, and most AI crawlers fetch HTML but don't execute JavaScript. Any client-rendered content is invisible to them. Always use SSR/SSG for discoverable content.

2. **llms.txt is emerging but not yet adopted**: Major AI companies haven't officially committed to respecting llms.txt, but implementing it is low-cost and future-proofs your site.

3. **Bing indexing is critical for ChatGPT**: ChatGPT uses Bing's index for real-time information. If you're not in Bing, you won't appear in ChatGPT responses.

4. **Summary sections are extracted first**: LLMs look for clear summaries at the top of content. Adding a "## Summary" section with 2-3 sentences dramatically improves citation quality.

5. **Tailwind v4 uses CSS-based config**: No more `tailwind.config.js` - plugins are added via `@plugin` directive in CSS.

### Best Practices

- **Always server-render important content** - Use SSG for blogs, docs, and any public content
- **Add JSON-LD to every page** - TechArticle for blogs, FAQPage for FAQs, etc.
- **Use clear heading hierarchy** - H1 → H2 → H3, never skip levels
- **Include explicit summaries** - Start articles with a "## Summary" section
- **Automate sitemap generation** - Use prebuild hooks to ensure sitemap is always current
- **Set NEXT_PUBLIC_SITE_URL** - Required for proper meta tags and sitemap URLs

### Pitfalls to Avoid

- ⚠️ **Don't rely on client-side rendering for SEO content** - AI crawlers won't see it
- ⚠️ **Don't use vague descriptions** - LLMs interpret meaning, not keywords
- ⚠️ **Don't forget Bing Webmaster Tools** - Critical for ChatGPT visibility
- ⚠️ **Don't use TypeScript-only features in Node scripts** - Use `.mjs` for pure Node.js execution
- ⚠️ **Don't assume default exports** - Always verify export type when importing components

## Final Working Solution

### Complete Blog Utility (`lib/blog.ts`)

Key functions:
- `getAllPosts()` - Get all posts sorted by date
- `getPostBySlug(slug)` - Get single post with content
- `getRelatedPosts(slug, limit)` - Find related posts by tags/category
- `generatePostJsonLd(post, siteUrl)` - Generate structured data

### Sitemap Generation Script (`scripts/generate-sitemap.mjs`)

```bash
# Run manually
npm run generate:sitemap

# Automatic via prebuild
npm run build  # Triggers prebuild hook
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate:sitemap": "node scripts/generate-sitemap.mjs",
    "prebuild": "node scripts/generate-sitemap.mjs"
  }
}
```

### Verification

```bash
# Check sitemap was generated
cat public/sitemap.xml | head -20

# Check robots.txt
cat public/robots.txt

# Check llms.txt
cat public/llms.txt

# Verify TypeScript compiles
npx tsc --noEmit
```

**Expected output for sitemap generation:**
```
🗺️  Generating sitemap.xml...

✅ Added 2 static pages
✅ Added 3 blog posts
✅ Added 3 category pages
✅ Added 13 tag pages

📄 Sitemap written to: public/sitemap.xml
📊 Total URLs: 21
```

## Related Skills

- `security-headers` - CSP and security headers for blog pages
- `input-validation` - If adding blog comments or forms
- `rate-limiting` - If adding API endpoints for blog features

## When to Use This Skill

**Use this when:**
- Building a blog or content site
- Creating documentation pages
- Building any public-facing pages that should appear in AI responses
- Optimizing existing content for LLM discoverability
- Setting up MDX-based content in Next.js

**Don't use this when:**
- Building purely private/authenticated content
- Creating SPAs where SEO doesn't matter
- Content that shouldn't be indexed by AI

## Quick Reference

```bash
# Create new blog post
touch content/blog/my-new-post.mdx

# Generate sitemap
npm run generate:sitemap

# Check TypeScript
npx tsc --noEmit

# Verify blog renders
npm run dev
# Visit http://localhost:3000/blog
```

**Frontmatter template:**
```yaml
---
title: ""
description: ""
date: "2026-01-08"
author: ""
category: ""
tags: []
image: ""
---

## Summary

[2-3 sentence summary]

## Content

[Your content here]
```

## Future Improvements

- [ ] Add blog post preview/draft mode
- [ ] Implement full-text search with Fuse.js or similar
- [ ] Add pagination for blog index
- [ ] Create OG image generation for blog posts
- [ ] Add view count tracking
- [ ] Implement comments system

---

**Created**: 2026-01-08
**Session Duration**: ~45 minutes
**Success Rate**: 4/4 major features completed (blog, sitemap, llms.txt, dark mode toggle)
