import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔒 Auth API Route Handler — Proxy for authentication endpoints
 *
 * Why a Route Handler instead of next.config.ts rewrites?
 * - Rewrites in standalone mode may silently drop Set-Cookie headers
 * - This handler explicitly forwards ALL Set-Cookie headers from the API
 * - Ensures cookies (access_token, refresh_token, csrf) reach the browser
 *   with the correct Domain=.rukny.io attribute for cross-subdomain sharing
 */

const API_BACKEND_URL =
  process.env.API_BACKEND_URL || process.env.API_URL || 'http://localhost:3001';

/** 🔒 Simple sliding-window rate limiter per IP (in-memory, per-instance). */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

// Clean up stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-proto',
  'x-request-id',
  'x-csrf-token',
];

/** Only allow proxying to known auth sub-paths to prevent SSRF via path traversal. */
const ALLOWED_AUTH_PREFIXES = [
  'me', 'refresh', 'logout', 'logout-all',
  'sessions', 'activity', 'ws-token',
  'google', 'linkedin', 'oauth',
  'quicksign', 'lockout', '2fa',
  'update-profile',
];

async function proxyToApi(request: NextRequest, pathSegments: string[]) {
  // 🔒 Rate limit by client IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (isRateLimited(clientIp)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '60',
      },
    });
  }

  const path = pathSegments.join('/');

  // 🔒 Validate the path to prevent SSRF — only forward to known auth endpoints
  const firstSegment = pathSegments[0]?.toLowerCase();
  if (!firstSegment || !ALLOWED_AUTH_PREFIXES.includes(firstSegment)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid auth path' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(`/api/v1/auth/${path}`, API_BACKEND_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build headers
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  // Forward body for non-GET/HEAD
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const apiRes = await fetch(url.toString(), init);

  // --- Build client response ---
  const resHeaders = new Headers();

  // Forward content-type
  const ct = apiRes.headers.get('content-type');
  if (ct) resHeaders.set('content-type', ct);

  // 🔒 Forward ALL Set-Cookie headers (critical for auth cookies)
  const setCookies = apiRes.headers.getSetCookie();
  for (const cookie of setCookies) {
    resHeaders.append('set-cookie', cookie);
  }

  // Forward redirect location
  if (apiRes.status >= 300 && apiRes.status < 400) {
    const location = apiRes.headers.get('location');
    if (location) resHeaders.set('location', location);
    return new NextResponse(null, { status: apiRes.status, headers: resHeaders });
  }

  const body = await apiRes.arrayBuffer();
  return new NextResponse(body, { status: apiRes.status, headers: resHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToApi(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToApi(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToApi(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToApi(request, path);
}
