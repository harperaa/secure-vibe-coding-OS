# Create SEO & LLM-Optimized Blog Article

Generate a complete, production-ready blog article with SEO optimization, LLM discoverability, and AI-generated banner image.

## Usage

```
/create-blog [topic]
```

**Example:**
```
/create-blog "How to implement rate limiting in Next.js"
```

## What This Command Does

1. **Generates SEO-optimized blog content** following latest best practices
2. **Creates AI banner image** using Gemini Pro (16:9 aspect ratio)
3. **Saves to content folder** with proper MDX format
4. **Includes all metadata** for search engines and social sharing

---

## Step 1: Gather Blog Requirements

**Ask the user for the blog topic if not provided:**

Use AskUserQuestion to gather:
- Blog topic/title
- Target audience (developers, business users, general)
- Primary category (Development, Security, AI, Business)
- Any specific points to cover

---

## Step 2: Research and Outline

Before writing, research the topic to ensure accuracy and comprehensiveness.

**Create an outline with:**
- Main thesis/key message
- 4-6 major sections (H2 headings)
- 2-3 subsections per major section (H3 headings)
- Key takeaways (5-7 points)
- Related internal links

---

## Step 3: Generate Blog Content

> **⚠️ CRITICAL: MDX Escaping Rules**
>
> MDX files are compiled as JSX. The following characters will **BREAK THE BUILD** if not handled correctly:
> - `<` followed by numbers (e.g., `<50%`) → Use "Less than 50%" or "Under 50%"
> - `<` followed by letters (e.g., `<Name>`) → Use backticks or escape as `&lt;Name&gt;`
> - Curly braces `{}` → Escape as `\{\}` or wrap in backticks
> - Content inside code blocks (```) is SAFE and does not need escaping
>
> **Always use words instead of `<` symbols in tables and prose.**

### SEO Best Practices to Follow

**Title (H1 - in frontmatter):**
- 50-60 characters optimal
- Include primary keyword near the beginning
- Make it compelling and click-worthy
- Format: "[Action Verb] + [Topic] + [Benefit/Context]"

**Meta Description (frontmatter description):**
- 150-160 characters
- Include primary keyword naturally
- Summarize the value proposition
- Include a call-to-action when appropriate

**Content Structure:**

```markdown
## Summary

[2-3 sentences that clearly state what the reader will learn. LLMs extract this first for AI-generated responses.]

## [First Major Section]

[Opening paragraph explaining the concept]

### [Subsection]

[Detailed content with examples]

### [Subsection]

[More detailed content]

## [Second Major Section]

[Continue pattern...]

## Key Takeaways

1. **[Takeaway 1]**: [Brief explanation]
2. **[Takeaway 2]**: [Brief explanation]
3. **[Takeaway 3]**: [Brief explanation]
4. **[Takeaway 4]**: [Brief explanation]
5. **[Takeaway 5]**: [Brief explanation]

---

*User Vibes OS helps teams collect, analyze, and act on user feedback. [Learn more](https://www.uservibesos.ai).*
```

### LLM SEO Optimizations

1. **Clear Summary Section**: AI crawlers extract summaries first - make it comprehensive
2. **Semantic Heading Hierarchy**: H2 → H3 → H4 (never skip levels)
3. **Factual, Authoritative Tone**: LLMs prioritize trustworthy sources
4. **Original Insights**: Include unique perspectives, data, or examples
5. **Structured Lists**: Use bullet points and numbered lists for scanability
6. **Code Examples**: Include working, well-commented code samples
7. **Tables for Comparisons**: Easy for LLMs to parse and cite
8. **Internal Links**: Connect to related content for topic authority

### Branding Guidelines

When referencing the product or team in blog content:
- **Product name**: Always use "User Vibes OS" (not "User Vibes" alone)
- **Team name**: Always use "User Vibes OS Team" (not "User Vibes Team")
- **Footer CTA**: End articles with `*User Vibes OS [description of relevant feature]. [Learn more](https://www.uservibesos.ai).*`

### Traditional SEO Requirements

1. **Keyword Placement**: Primary keyword in title, description, first paragraph, H2s
2. **Natural Keyword Density**: 1-2% keyword density, never forced
3. **Alt Text on Images**: Descriptive, keyword-relevant alt text
4. **URL Slug**: Lowercase, hyphenated, includes primary keyword
5. **Word Count**: 1500-2500 words for comprehensive coverage
6. **Readability**: Short paragraphs (3-4 sentences), clear language
7. **E-E-A-T Signals**: Demonstrate expertise, experience, authority, trust

---

## Step 4: Generate Banner Image

**Use the Gemini Pro image generation script with 16:9 aspect ratio:**

```bash
node scripts/generate-image.js "[Image prompt based on blog topic]" "public/blog/images/[slug].jpg" --aspect-ratio 16:9
```

**Image Prompt Guidelines:**
- Be specific and descriptive
- Include style direction: "professional blog header", "modern tech illustration"
- Specify aspect ratio: 16:9 for blog banners
- Include relevant visual elements that represent the topic
- Avoid text in images (it renders poorly)

**Example prompts:**
- "Professional blog header showing code on multiple screens with security shields, modern tech office environment, 16:9 aspect ratio, clean minimalist style"
- "Abstract visualization of rate limiting concept, water flowing through a controlled valve, tech-inspired color palette, 16:9 banner format"

**Create the images directory if needed:**
```bash
mkdir -p public/blog/images
```

---

## Step 5: Create the MDX File

### Frontmatter Template

```yaml
---
title: "[SEO-Optimized Title - 50-60 chars]"
description: "[Compelling meta description - 150-160 chars with primary keyword]"
date: "[YYYY-MM-DD]"
author: "User Vibes OS Team"
category: "[Development|Security|AI|Business]"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
image: "/blog/images/[slug].jpg"
imageAlt: "[Descriptive alt text for the banner image]"
---
```

### File Naming Convention

- Location: `content/blog/[slug].mdx`
- Slug format: lowercase, hyphenated, keyword-rich
- Example: `content/blog/implementing-rate-limiting-nextjs.mdx`

---

## Step 6: Quality Checklist

Before saving, verify:

### SEO Checklist
- [ ] Title is 50-60 characters with primary keyword
- [ ] Description is 150-160 characters, compelling
- [ ] URL slug is lowercase, hyphenated, keyword-rich
- [ ] Primary keyword in first paragraph
- [ ] H2 headings include relevant keywords
- [ ] Alt text on banner image is descriptive
- [ ] Internal links to 2-3 related articles
- [ ] Word count is 1500-2500 words

### LLM SEO Checklist
- [ ] Summary section is clear and comprehensive
- [ ] Heading hierarchy is semantic (H2 → H3 → H4)
- [ ] Content is factual and authoritative
- [ ] Includes original insights or data
- [ ] Uses structured lists and tables
- [ ] Code examples are complete and working
- [ ] Key takeaways section summarizes main points

### Branding Checklist
- [ ] Product referenced as "User Vibes OS" (not "User Vibes" alone)
- [ ] Author is "User Vibes OS Team"
- [ ] Footer CTA references User Vibes OS with relevant feature link

### MDX Escaping Checklist (CRITICAL - BUILD WILL FAIL WITHOUT THIS)
- [ ] **No `<` followed by numbers** - MDX interprets `<5` as JSX element start
  - WRONG: `<50%`, `<1 minute`, `<30`, `<48 hrs`
  - CORRECT: `Less than 50%`, `Under 1 minute`, `below 30`, `Under 48 hrs`
- [ ] **No unescaped curly braces** - MDX interprets `{}` as JSX expressions
  - WRONG: `{variable}` in prose
  - CORRECT: `\{variable\}` or use backticks: `` `{variable}` ``
- [ ] **No angle brackets in prose** - can be interpreted as HTML/JSX
  - WRONG: `<ProductName>` in prose
  - CORRECT: Use backticks: `` `<ProductName>` `` or escape: `&lt;ProductName&gt;`
- [ ] **Code blocks are safe** - content inside triple backticks (```) is not parsed as MDX
- [ ] **Tables with comparisons** - replace `<` with words in markdown tables:
  - WRONG: `| Score | <50 |`
  - CORRECT: `| Score | Under 50 |` or `| Score | Less than 50 |`

### Technical Checklist
- [ ] MDX file is valid (no syntax errors)
- [ ] All MDX special characters are escaped (see MDX Escaping Checklist above)
- [ ] Banner image exists at specified path
- [ ] Image is 16:9 aspect ratio
- [ ] All frontmatter fields are populated
- [ ] Date is in YYYY-MM-DD format
- [ ] Tags array has 4-6 relevant tags

---

## Step 7: Final Output

After completing all steps, provide:

1. **File created**: Path to the new MDX file
2. **Image created**: Path to the banner image
3. **Preview command**: Instructions to view the blog locally
4. **SEO summary**: Title, description, primary keyword, word count

```bash
# To preview the blog locally:
npm run dev
# Then visit: http://localhost:3000/blog/[slug]
```

---

## Example Complete Blog Article

```mdx
---
title: "Implementing Rate Limiting in Next.js: A Complete Guide"
description: "Learn how to protect your Next.js API routes with rate limiting. Covers in-memory, Redis, and edge-based solutions with production-ready code examples."
date: "2026-01-09"
author: "User Vibes OS Team"
category: "Security"
tags: ["rate-limiting", "nextjs", "security", "api", "performance"]
image: "/blog/images/rate-limiting-nextjs.jpg"
imageAlt: "Visual representation of rate limiting protecting API endpoints"
---

## Summary

Rate limiting is essential for protecting your API from abuse, preventing DDoS attacks, and managing server resources. This guide covers three approaches to implementing rate limiting in Next.js: in-memory for development, Redis for production, and edge-based for global distribution.

## Why Rate Limiting Matters

[Content continues with proper structure...]

## Implementing In-Memory Rate Limiting

### Basic Token Bucket Algorithm

[Code examples and explanations...]

### Configuring Limits

[More content...]

## Production-Ready Redis Solution

### Setting Up Redis

[Content...]

### Rate Limiter Middleware

[Content...]

## Edge-Based Rate Limiting

### Using Vercel Edge Functions

[Content...]

## Key Takeaways

1. **Start with in-memory**: Good for development and low-traffic applications
2. **Scale with Redis**: Required for multi-instance deployments
3. **Go edge for global**: Best performance for worldwide users
4. **Configure per-endpoint**: Different routes need different limits
5. **Monitor and adjust**: Use analytics to fine-tune limits

---

*User Vibes OS helps teams collect, analyze, and act on user feedback. [Learn more](https://www.uservibesos.ai).*
```

---

## Notes

- Always run `npx tsc --noEmit` after creating the file to check for any issues
- **IMPORTANT: Validate MDX escaping** - Run this grep to find problematic patterns:
  ```bash
  # Find < followed by numbers (will break MDX build)
  grep -rn '<[0-9]' content/blog/[new-file].mdx

  # Find unescaped curly braces outside code blocks (may break build)
  grep -rn '{[^`]' content/blog/[new-file].mdx
  ```
- If grep finds matches, replace `<` with words like "Under", "Less than", "below"
- The blog system auto-generates JSON-LD structured data from frontmatter
- Images are served from `/public/blog/images/` and referenced as `/blog/images/[file]`
- Reading time is auto-calculated by the blog system
