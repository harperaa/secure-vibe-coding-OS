import { Suspense } from 'react'
import { Metadata } from 'next'
import { getAllPostsMeta, getAllCategories, getAllTags, generateBlogListJsonLd } from '@/lib/blog'
import { BlogCard } from './components/blog-card'
import { BlogSearch } from './components/blog-search'
import { CategoryFilter } from './components/category-filter'

export const metadata: Metadata = {
  title: 'Blog | Secure Vibe Coding',
  description: 'Articles on secure development, vibe coding, AI-assisted programming, and building production-ready applications with modern security practices.',
  openGraph: {
    title: 'Blog | Secure Vibe Coding',
    description: 'Articles on secure development, vibe coding, AI-assisted programming, and building production-ready applications.',
    type: 'website',
    url: '/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Secure Vibe Coding',
    description: 'Articles on secure development, vibe coding, and AI-assisted programming.',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
}

export default function BlogPage() {
  const posts = getAllPostsMeta()
  const categories = getAllCategories()
  const tags = getAllTags()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

  const jsonLd = generateBlogListJsonLd(posts, siteUrl)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header Section */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Insights on secure development, vibe coding best practices, and building
            production-ready applications with AI assistance.
          </p>
        </header>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <Suspense fallback={<div className="h-10 max-w-md mx-auto bg-muted animate-pulse rounded-md" />}>
            <BlogSearch />
          </Suspense>
          {categories.length > 0 && (
            <CategoryFilter categories={categories} tags={tags} />
          )}
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No blog posts yet. Check back soon!
            </p>
          </div>
        )}

        {/* SEO-friendly category links */}
        {categories.length > 0 && (
          <nav className="mt-16 pt-8 border-t" aria-label="Blog categories">
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category}>
                  <a
                    href={`/blog/category/${encodeURIComponent(category.toLowerCase())}`}
                    className="inline-block px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
                  >
                    {category}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* SEO-friendly tag links */}
        {tags.length > 0 && (
          <nav className="mt-8" aria-label="Blog tags">
            <h2 className="text-xl font-semibold mb-4">Tags</h2>
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag}>
                  <a
                    href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                    className="inline-block px-3 py-1 rounded-full border text-sm hover:bg-accent transition-colors"
                  >
                    #{tag}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </>
  )
}
