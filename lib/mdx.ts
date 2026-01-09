import { compileMDX } from 'next-mdx-remote/rsc'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkGfm from 'remark-gfm'

// Custom MDX components
const components = {
  // Add custom components here as needed
  // Example: Callout, CodeBlock, etc.
}

export interface TableOfContentsItem {
  id: string
  title: string
  level: number
}

export async function compileMDXContent(source: string) {
  const { content, frontmatter } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          rehypeHighlight,
        ],
      },
    },
    components,
  })

  return { content, frontmatter }
}

// Extract table of contents from markdown content
export function extractTableOfContents(content: string): TableOfContentsItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const toc: TableOfContentsItem[] = []
  const idCounts: Record<string, number> = {}
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2].trim()
    // Create slug from title (same as rehype-slug)
    let id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Handle duplicate IDs by appending a counter (matches rehype-slug behavior)
    if (idCounts[id] !== undefined) {
      idCounts[id]++
      id = `${id}-${idCounts[id]}`
    } else {
      idCounts[id] = 0
    }

    toc.push({ id, title, level })
  }

  return toc
}

// Generate a summary from content (first paragraph or explicit summary)
export function extractSummary(content: string, maxLength = 160): string {
  // Look for explicit summary section - using split instead of regex with 's' flag
  const lines = content.split('\n')
  let inSummary = false
  let summaryLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('## Summary')) {
      inSummary = true
      continue
    }
    if (inSummary) {
      if (line.startsWith('## ') || line.startsWith('---')) {
        break
      }
      if (line.trim()) {
        summaryLines.push(line)
      }
    }
  }

  if (summaryLines.length > 0) {
    return summaryLines.join(' ').trim().slice(0, maxLength)
  }

  // Fall back to first paragraph (non-heading)
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      return line.trim().slice(0, maxLength)
    }
  }

  return ''
}
