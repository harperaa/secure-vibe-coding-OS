import { NextResponse, type NextRequest } from 'next/server'
import { ensureSecretsLoaded } from './lib/secrets'

// Vercel ships middleware as its own Function bundle separate from the app's server.
// Next.js's instrumentation.ts only registers for the app instance, so the Doppler
// runtime fetch never populates process.env for this Function. We close that gap by
// awaiting ensureSecretsLoaded() before doing anything Clerk-related.
//
// Critical detail: Clerk's clerkMiddleware() reads CLERK_SECRET_KEY at *module-load*
// time, not at request time. If we just imported it at the top, it would capture
// process.env BEFORE our fetch runs and throw "Missing secretKey" forever — the
// diagnostic logs confirmed this. To avoid that, the Clerk SDK is dynamically
// imported AFTER ensureSecretsLoaded() resolves. The handler is cached so the
// dynamic import + factory call only run once per Function instance.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedHandler: ((req: NextRequest, event: any) => Promise<Response>) | null = null

 
async function getHandler() {
  if (cachedHandler) return cachedHandler
  await ensureSecretsLoaded()

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

  cachedHandler = clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect()

    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')

    const clerkDomain = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
      ? new URL(process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL).origin
      : ''
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ''
    const convexDomain = convexUrl ? new URL(convexUrl).origin : ''
    const convexWss = convexUrl ? convexUrl.replace('https://', 'wss://') : ''

    response.headers.set(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkDomain} https://js.stripe.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self' ${clerkDomain} ${convexDomain} ${convexWss} https://api.stripe.com https://clerk-telemetry.com https://challenges.cloudflare.com; frame-src 'self' ${clerkDomain} https://js.stripe.com https://hooks.stripe.com; img-src 'self' data: https:; worker-src blob:;`
    )

    if (isProtectedRoute(req)) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }

    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    return response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
  return cachedHandler!
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function middleware(req: NextRequest, event: any) {
  const handler = await getHandler()
  return handler(req, event)
}

export const config = {
  // No runtime override → Next.js middleware default (edge). lib/secrets.ts uses only
  // fetch() and process.env, both edge-compatible. The lazy-import pattern above means
  // Clerk reads CLERK_SECRET_KEY only after ensureSecretsLoaded() resolves, so the
  // module-load order isn't a problem on edge either.
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
