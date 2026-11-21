import { NextResponse, type NextRequest } from 'next/server';

/**
 * ASKR EV Production Subdomain & Security Middleware
 *
 * Enforces strict separation between the Public Showroom (www.askrevdrive.com)
 * and the Protected Admin Portal (admin.askrevdrive.com).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') || '').toLowerCase();

  const isAdminDomain =
    host.startsWith('admin.') ||
    process.env.NEXT_PUBLIC_ADMIN_MODE === 'true';

  const isShowroomDomain =
    host.startsWith('www.') ||
    host === 'askrevdrive.com' ||
    process.env.SHOWROOM_ONLY === 'true';

  // 1. DEDICATED ADMIN SUBDOMAIN (admin.askrevdrive.com)
  if (isAdminDomain) {
    // Redirect root to admin dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Block public marketing showroom routes on admin subdomain
    const isShowroomOnlyPath =
      pathname.startsWith('/scooters') ||
      pathname.startsWith('/bikes') ||
      pathname.startsWith('/cycles') ||
      pathname.startsWith('/jeeps');

    if (isShowroomOnlyPath) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 2. PUBLIC SHOWROOM DOMAIN (www.askrevdrive.com)
  if (isShowroomDomain && !isAdminDomain) {
    const isRestrictedOnPublicShowroom = pathname.startsWith('/admin');

    if (isRestrictedOnPublicShowroom) {
      // Rewrite to 404 so admin endpoints appear completely non-existent to public visitors
      return NextResponse.rewrite(new URL('/_not-found', request.url));
    }
  }

  // 3. SECURITY HEADERS
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

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
