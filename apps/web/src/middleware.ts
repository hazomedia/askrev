import { NextResponse, type NextRequest } from 'next/server';

/**
 * ASKR EV Public Showroom Security Middleware
 *
 * Enforces strict route-level access control for the public showroom launch.
 * Private administrative, financial, member, simulator, and auth routes are
 * blocked at the server/edge level, ensuring zero public exposure of non-public systems.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In Showroom Launch Mode (active by default or via env flags),
  // block all internal administrative, member dashboard, and auth endpoints.
  const isShowroomMode =
    process.env.SHOWROOM_ONLY === 'true' ||
    process.env.NEXT_PUBLIC_SHOWROOM_MODE === 'true' ||
    process.env.NODE_ENV === 'production';

  const isRestrictedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/simulator') ||
    pathname.startsWith('/api');

  if (isShowroomMode && isRestrictedPath) {
    // Rewrite to custom 404 page so restricted paths appear entirely non-existent
    return NextResponse.rewrite(new URL('/_not-found', request.url));
  }

  // Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - images, icons, and assets
     */
    '/((?!_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
