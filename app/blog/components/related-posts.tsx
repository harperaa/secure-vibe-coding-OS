import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlogPostMeta, formatDate } from '@/lib/blog'

interface RelatedPostsProps {
  posts: BlogPostMeta[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <article
          key={post.slug}
          className="group p-4 rounded-lg border hover:bg-accent/50 transition-colors"
        >
          <Link href={`/blog/${post.slug}`} className="block">
            {/* Category */}
            <span className="text-xs font-medium text-primary">
              {post.category}
            </span>

            {/* Title */}
            <h3 className="font-semibold mt-1 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {post.description}
            </p>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="inline-flex items-center gap-1 text-primary">
                Read more
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </article>
      ))}
    </div>
  )
}
