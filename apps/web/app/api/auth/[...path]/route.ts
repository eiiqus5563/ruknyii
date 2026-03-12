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
];

async function proxyToApi(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
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
