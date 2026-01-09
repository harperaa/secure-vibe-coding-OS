import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPostsByTag, getAllTags } from '@/lib/blog'
import { BlogCard } from '../../components/blog-card'

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateStaticParams() {
  const tags = getAllTags()
  return tags.map((tag) => ({
    tag: tag.toLowerCase(),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  return {
    title: `#${decodedTag} Articles | Blog`,
    description: `Browse all articles tagged with #${decodedTag}. Expert insights and tutorials for developers.`,
    openGraph: {
      title: `#${decodedTag} Articles | Blog`,
      description: `Browse all articles tagged with #${decodedTag}.`,
      type: 'website',
    },
  }
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  const posts = getPostsByTag(decodedTag)

  if (posts.length === 0) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          #{decodedTag}
        </h1>
        <p className="text-lg text-muted-foreground">
          {posts.length} article{posts.length !== 1 ? 's' : ''} with this tag
        </p>
      </header>

      {/* Posts Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Browse other tags */}
      <nav className="mt-16 pt-8 border-t" aria-label="Other tags">
        <h2 className="text-xl font-semibold mb-4">Other Tags</h2>
        <ul className="flex flex-wrap gap-2">
          {getAllTags()
            .filter((t) => t.toLowerCase() !== decodedTag.toLowerCase())
            .slice(0, 20)
            .map((t) => (
              <li key={t}>
                <Link
                  href={`/blog/tag/${encodeURIComponent(t.toLowerCase())}`}
                  className="inline-block px-3 py-1 rounded-full border text-sm hover:bg-accent transition-colors"
                >
                  #{t}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  )
}
