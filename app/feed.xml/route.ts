import { getAllPosts, generateRssFeed } from '../../lib/blog'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Secure Vibe Coding'
  const rssFeed = generateRssFeed(getAllPosts(), siteUrl, siteName)

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
