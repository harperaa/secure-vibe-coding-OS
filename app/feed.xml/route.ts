import { getAllPosts } from '../../lib/blog'

// Site name, authors, categories and tags are plain text: "R&D" or "<Dev>" must
// not break the XML. CDATA sections cannot contain "]]>", so split it.
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(text: string): string {
  return `<![CDATA[${String(text).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Secure Vibe Coding'
  const posts = getAllPosts()

  const rssItems = posts
    .slice(0, 20) // Limit to 20 most recent posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`

      return `
    <item>
      <title>${cdata(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <description>${cdata(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${escapeXml(post.author)}</author>
      <category>${escapeXml(post.category)}</category>
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>`
    })
    .join('')

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)} Blog</title>
    <link>${escapeXml(siteUrl)}/blog</link>
    <description>Articles on secure development, vibe coding, AI-assisted programming, and building production-ready applications.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(siteUrl)}/logo.png</url>
      <title>${escapeXml(siteName)} Blog</title>
      <link>${escapeXml(siteUrl)}/blog</link>
    </image>
    ${rssItems}
  </channel>
</rss>`

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
