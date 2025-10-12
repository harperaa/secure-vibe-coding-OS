import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard routes
  if (isProtectedRoute(req)) await auth.protect()

  // Add security headers to all responses
  const response = NextResponse.next()

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')

  // Content Security Policy - dynamically add Clerk and Convex domains
  const clerkDomain = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
    ? new URL(process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL).origin
    : ''

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ''
  const convexDomain = convexUrl ? new URL(convexUrl).origin : ''
  const convexWss = convexUrl ? convexUrl.replace('https://', 'wss://') : ''

  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkDomain}; style-src 'self' 'unsafe-inline'; connect-src 'self' ${clerkDomain} ${convexDomain} ${convexWss}; img-src 'self' data: https:; worker-src blob:;`
  )

  // Prevent search engines from indexing protected routes
  if (isProtectedRoute(req)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}