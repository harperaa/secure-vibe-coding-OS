import Link from 'next/link'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { BlogPostMeta, formatDate } from '@/lib/blog'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

interface BlogCardProps {
  post: BlogPostMeta
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      {/* Featured Image */}
      {post.image && (
        <Link href={`/blog/${post.slug}`}>
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      <CardHeader className="pb-2">
        {/* Category */}
        <Link
          href={`/blog/category/${encodeURIComponent(post.category.toLowerCase())}`}
          className="text-xs font-medium text-primary hover:underline w-fit"
        >
          {post.category}
        </Link>

        {/* Title */}
        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-xl font-semibold leading-tight hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>
      </CardHeader>

      <CardContent className="flex-grow">
        {/* Description */}
        <p className="text-muted-foreground text-sm line-clamp-3">
          {post.description}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                {tag}
              </Link>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{post.readingTime.text}</span>
          </div>
        </div>

        {/* Read more link */}
        <Link
          href={`/blog/${post.slug}`}
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Read
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  )
}
