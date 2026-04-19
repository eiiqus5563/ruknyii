import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

const PROTECTED_PATHS = ['/app'];
const AUTH_PAGES = ['/login', '/callback', '/auth/callback', '/check-email', '/complete-profile', '/verify-identity', '/auth/verify', '/auth/verify-2fa'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Set locale cookie if not present
  const existingLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (!existingLocale || !locales.includes(existingLocale)) {
    const acceptLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
    const preferred = acceptLang && locales.includes(acceptLang) ? acceptLang : defaultLocale;
    response.cookies.set('NEXT_LOCALE', preferred, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }

  // Check auth session
  const hasAccessToken = request.cookies.has('access_token') || request.cookies.has('__Secure-access_token');
  const hasRefreshToken = request.cookies.has('refresh_token') || request.cookies.has('__Secure-refresh_token');
  const hasSession = hasAccessToken || hasRefreshToken;

  // Protected routes → redirect to login
  const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/login?session=expired', request.url));
  }

  // Auth pages → redirect to dashboard if authenticated
  const isAuthPage = AUTH_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isAuthPage && hasSession) {
    const sessionParam = request.nextUrl.searchParams.get('session');
    if (sessionParam === 'expired' || sessionParam === 'invalid') {
      const resp = NextResponse.next();
      for (const name of ['access_token', 'refresh_token', 'csrf_token', '__Secure-access_token', '__Secure-refresh_token', '__Secure-csrf_token']) {
        resp.cookies.delete(name);
      }
      return resp;
    }
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
