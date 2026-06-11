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
