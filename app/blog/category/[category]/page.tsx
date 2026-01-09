import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPostsByCategory, getAllCategories } from '@/lib/blog'
import { BlogCard } from '../../components/blog-card'

interface PageProps {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  const categories = getAllCategories()
  return categories.map((category) => ({
    category: category.toLowerCase(),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params
  const decodedCategory = decodeURIComponent(category)
  const formattedCategory = decodedCategory.charAt(0).toUpperCase() + decodedCategory.slice(1)

  return {
    title: `${formattedCategory} Articles | Blog`,
    description: `Browse all articles in the ${formattedCategory} category. Expert insights on ${formattedCategory.toLowerCase()} topics for developers.`,
    openGraph: {
      title: `${formattedCategory} Articles | Blog`,
      description: `Browse all articles in the ${formattedCategory} category.`,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params
  const decodedCategory = decodeURIComponent(category)
  const posts = getPostsByCategory(decodedCategory)

  if (posts.length === 0) {
    notFound()
  }

  const formattedCategory = decodedCategory.charAt(0).toUpperCase() + decodedCategory.slice(1)

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
          {formattedCategory}
        </h1>
        <p className="text-lg text-muted-foreground">
          {posts.length} article{posts.length !== 1 ? 's' : ''} in this category
        </p>
      </header>

      {/* Posts Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Browse other categories */}
      <nav className="mt-16 pt-8 border-t" aria-label="Other categories">
        <h2 className="text-xl font-semibold mb-4">Other Categories</h2>
        <ul className="flex flex-wrap gap-2">
          {getAllCategories()
            .filter((c) => c.toLowerCase() !== decodedCategory.toLowerCase())
            .map((cat) => (
              <li key={cat}>
                <Link
                  href={`/blog/category/${encodeURIComponent(cat.toLowerCase())}`}
                  className="inline-block px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
                >
                  {cat}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  )
}
