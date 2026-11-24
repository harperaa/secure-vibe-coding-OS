import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorImage?: string
  image?: string
  tags: string[]
  category: string
  content: string
  readingTime: {
    text: string
    minutes: number
    time: number
    words: number
  }
  lastModified?: string
}

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorImage?: string
  image?: string
  tags: string[]
  category: string
  readingTime: {
    text: string
    minutes: number
    time: number
    words: number
  }
}

function ensureBlogDir() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true })
  }
}

export function getPostSlugs(): string[] {
  ensureBlogDir()

  try {
    const files = fs.readdirSync(BLOG_DIR)
    return files
      .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
      .map(file => file.replace(/\.mdx?$/, ''))
  } catch {
    return []
  }
}

export function getPostBySlug(slug: string): BlogPost | null {
  ensureBlogDir()

  // The slug comes from the URL, and Next.js decodes %2F in route params, so
  // `/blog/..%2F..%2FREADME` would otherwise read a file outside BLOG_DIR.
  if (path.basename(slug) !== slug || slug.includes('\\')) {
    return null
  }

  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`)
  const mdPath = path.join(BLOG_DIR, `${slug}.md`)

  let filePath = ''
  if (fs.existsSync(mdxPath)) {
    filePath = mdxPath
  } else if (fs.existsSync(mdPath)) {
    filePath = mdPath
  } else {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const stats = readingTime(content)

  return {
    slug,
    title: data.title || 'Untitled',
    description: data.description || '',
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    author: data.author || 'Anonymous',
    authorImage: data.authorImage,
    image: data.image,
    tags: data.tags || [],
    category: data.category || 'Uncategorized',
    content,
    readingTime: stats,
    lastModified: data.lastModified ? new Date(data.lastModified).toISOString() : undefined,
  }
}

export function getAllPosts(): BlogPost[] {
  const slugs = getPostSlugs()
  const posts = slugs
    .map(slug => getPostBySlug(slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

export function getAllPostsMeta(): BlogPostMeta[] {
  return getAllPosts().map(({ content, ...meta }) => meta)
}

export function getPostsByCategory(category: string): BlogPostMeta[] {
  return getAllPostsMeta().filter(
    post => post.category.toLowerCase() === category.toLowerCase()
  )
}

export function getPostsByTag(tag: string): BlogPostMeta[] {
  return getAllPostsMeta().filter(
    post => post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  )
}

export function getAllCategories(): string[] {
  const posts = getAllPostsMeta()
  const categories = [...new Set(posts.map(post => post.category))]
  return categories.sort()
}

export function getAllTags(): string[] {
  const posts = getAllPostsMeta()
  const tags = [...new Set(posts.flatMap(post => post.tags))]
  return tags.sort()
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPostMeta[] {
  const currentPost = getPostBySlug(currentSlug)
  if (!currentPost) return []

  const allPosts = getAllPostsMeta().filter(post => post.slug !== currentSlug)

  // Score posts by relevance (matching tags and category)
  const scoredPosts = allPosts.map(post => {
    let score = 0

    // Same category = 2 points
    if (post.category === currentPost.category) {
      score += 2
    }

    // Each matching tag = 1 point
    const matchingTags = post.tags.filter(tag =>
      currentPost.tags.includes(tag)
    )
    score += matchingTags.length

    return { post, score }
  })

  return scoredPosts
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post)
}

export function searchPosts(query: string): BlogPostMeta[] {
  const lowerQuery = query.toLowerCase()

  return getAllPostsMeta().filter(post => {
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.description.toLowerCase().includes(lowerQuery) ||
      post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      post.category.toLowerCase().includes(lowerQuery)
    )
  })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Generate JSON-LD structured data for a blog post
export function generatePostJsonLd(post: BlogPost, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.description,
    image: post.image ? `${siteUrl}${post.image}` : undefined,
    author: {
      '@type': 'Person',
      name: post.author,
      image: post.authorImage ? `${siteUrl}${post.authorImage}` : undefined,
    },
    datePublished: post.date,
    dateModified: post.lastModified || post.date,
    publisher: {
      '@type': 'Organization',
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'Secure Vibe Coding',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
    keywords: post.tags.join(', '),
    articleSection: post.category,
    wordCount: post.readingTime.words,
  }
}

// Generate JSON-LD for blog listing page
export function generateBlogListJsonLd(posts: BlogPostMeta[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${process.env.NEXT_PUBLIC_SITE_NAME || 'Secure Vibe Coding'} Blog`,
    description: 'Articles on secure development, vibe coding, and building production-ready applications',
    url: `${siteUrl}/blog`,
    blogPost: posts.slice(0, 10).map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      url: `${siteUrl}/blog/${post.slug}`,
    })),
  }
}

// Serialize JSON-LD for an inline <script> tag. JSON.stringify does not escape
// "<", so a title containing "</script>" would close the tag and inject markup.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Generate the RSS feed. Every interpolated value is XML-escaped: frontmatter
// such as `category: Q&A` or a title containing "]]>" would otherwise break
// the document or inject elements into it.
export function generateRssFeed(posts: BlogPost[], siteUrl: string, siteName: string): string {
  const site = escapeXml(siteUrl)
  const name = escapeXml(siteName)

  const rssItems = posts
    .slice(0, 20) // Limit to 20 most recent posts
    .map((post) => {
      const postUrl = `${site}/blog/${escapeXml(post.slug)}`

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${escapeXml(post.author)}</author>
      <category>${escapeXml(post.category)}</category>
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${name} Blog</title>
    <link>${site}/blog</link>
    <description>Articles on secure development, vibe coding, AI-assisted programming, and building production-ready applications.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${site}/logo.png</url>
      <title>${name} Blog</title>
      <link>${site}/blog</link>
    </image>
    ${rssItems}
  </channel>
</rss>`
}
