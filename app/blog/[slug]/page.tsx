import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Tag } from 'lucide-react'
import {
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
  formatDate,
  generatePostJsonLd,
} from '@/lib/blog'
import { compileMDXContent, extractTableOfContents } from '@/lib/mdx'
import { TableOfContents } from '../components/table-of-contents'
import { RelatedPosts } from '../components/related-posts'
import { ShareButtons } from '../components/share-buttons'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

  return {
    title: `${post.title} | Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.lastModified || post.date,
      authors: [post.author],
      tags: post.tags,
      images: post.image
        ? [
            {
              url: `${siteUrl}${post.image}`,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [`${siteUrl}${post.image}`] : undefined,
    },
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const { content } = await compileMDXContent(post.content)
  const toc = extractTableOfContents(post.content)
  const relatedPosts = getRelatedPosts(slug, 3)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
  const jsonLd = generatePostJsonLd(post, siteUrl)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back to blog link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {/* Category */}
          <Link
            href={`/blog/category/${encodeURIComponent(post.category.toLowerCase())}`}
            className="inline-block text-sm font-medium text-primary mb-4 hover:underline"
          >
            {post.category}
          </Link>

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight mb-4 lg:text-5xl">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground mb-6">
            {post.description}
          </p>

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{post.readingTime.text}</span>
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                  className="text-sm px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Two-column layout for content + TOC */}
        <div className="lg:grid lg:grid-cols-[1fr_250px] lg:gap-8">
          {/* Main Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {content}
          </div>

          {/* Sidebar with TOC */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <TableOfContents items={toc} />
                <div className="mt-8">
                  <ShareButtons
                    url={`${siteUrl}/blog/${slug}`}
                    title={post.title}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Mobile share buttons */}
        <div className="lg:hidden mt-8 pt-8 border-t">
          <ShareButtons
            url={`${siteUrl}/blog/${slug}`}
            title={post.title}
          />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <RelatedPosts posts={relatedPosts} />
          </section>
        )}

        {/* Author bio section for E-E-A-T signals */}
        <section className="mt-16 pt-8 border-t">
          <div className="flex items-start gap-4">
            {post.authorImage && (
              <img
                src={post.authorImage}
                alt={post.author}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h3 className="font-semibold">Written by {post.author}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Published on {formatDate(post.date)}
                {post.lastModified && post.lastModified !== post.date && (
                  <> · Updated on {formatDate(post.lastModified)}</>
                )}
              </p>
            </div>
          </div>
        </section>
      </article>
    </>
  )
}
