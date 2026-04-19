import { NextRequest, NextResponse } from 'next/server';

const API_BACKEND_URL =
  process.env.API_BACKEND_URL || process.env.API_URL || 'http://localhost:3001';

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

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

const FORWARD_HEADERS = [
  'content-type', 'accept', 'cookie', 'origin', 'referer',
  'user-agent', 'x-forwarded-for', 'x-real-ip', 'x-forwarded-proto',
  'x-request-id', 'x-csrf-token',
];

const ALLOWED_PREFIXES = [
  'me', 'refresh', 'logout', 'logout-all',
  'sessions', 'activity', 'ws-token',
  'google', 'linkedin', 'oauth',
  'quicksign', 'lockout', '2fa',
  'update-profile',
];

async function proxyToApi(request: NextRequest, pathSegments: string[]) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(clientIp)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '60' },
    });
  }

  const path = pathSegments.join('/');
  const firstSegment = pathSegments[0]?.toLowerCase();
  if (!firstSegment || !ALLOWED_PREFIXES.includes(firstSegment)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid auth path' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(`/api/v1/auth/${path}`, API_BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const headers = new Headers();
  for (const key of FORWARD_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const apiRes = await fetch(url.toString(), init);

  const resHeaders = new Headers();
  const ct = apiRes.headers.get('content-type');
  if (ct) resHeaders.set('content-type', ct);

  const setCookies = apiRes.headers.getSetCookie();
  for (const cookie of setCookies) {
    resHeaders.append('set-cookie', cookie);
  }

  if (apiRes.status >= 300 && apiRes.status < 400) {
    const location = apiRes.headers.get('location');
    if (location) resHeaders.set('location', location);
    return new NextResponse(null, { status: apiRes.status, headers: resHeaders });
  }

  const body = await apiRes.arrayBuffer();
  return new NextResponse(body, { status: apiRes.status, headers: resHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToApi(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToApi(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToApi(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToApi(request, (await params).path);
}
