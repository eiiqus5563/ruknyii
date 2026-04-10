import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PAGES = ['/login', '/register', '/callback', '/complete-profile', '/check-email', '/verify', '/verify-identity', '/auth/verify-2fa'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token') || request.cookies.has('__Secure-access_token');
  const hasRefreshToken = request.cookies.has('refresh_token') || request.cookies.has('__Secure-refresh_token');
  const hasSession = hasAccessToken || hasRefreshToken;

  // Protected routes: redirect to login if no session
  const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('session', 'expired');
    return NextResponse.redirect(loginUrl);
  }

  // Auth pages: redirect to dashboard if already has session
  const isAuthPage = AUTH_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isAuthPage && hasSession) {
    // If auth system flagged the session as expired/invalid, clear stale cookies
    // instead of redirecting back to dashboard (prevents infinite loop)
    const sessionParam = request.nextUrl.searchParams.get('session');
    if (sessionParam === 'expired' || sessionParam === 'invalid') {
      const response = NextResponse.next();
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      response.cookies.delete('csrf_token');
      response.cookies.delete('__Secure-access_token');
      response.cookies.delete('__Secure-refresh_token');
      response.cookies.delete('__Secure-csrf_token');
      return response;
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/callback', '/complete-profile', '/check-email', '/verify', '/verify-identity', '/auth/verify-2fa'],
};
