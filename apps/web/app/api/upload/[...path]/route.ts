import { NextRequest, NextResponse } from 'next/server';

/**
 * 📤 Upload Proxy Route Handler
 *
 * Why a Route Handler instead of next.config.ts rewrites?
 * - Rewrites may silently drop or corrupt multipart/form-data body streams
 *   in standalone mode, causing Multer to receive files with 0-byte buffers.
 * - This handler reads the full body as arrayBuffer and forwards it intact
 *   to the backend, preserving binary data and the multipart boundary.
 *
 * Usage: POST /api/upload/products/{id}/images
 *    →  POST http://api:3001/api/v1/products/{id}/images
 */

const API_BACKEND_URL =
  process.env.API_BACKEND_URL || process.env.API_URL || 'http://localhost:3001';

const FORWARD_HEADERS = [
  'content-type',
  'cookie',
  'authorization',
  'accept',
  'origin',
  'referer',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-proto',
  'x-request-id',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const apiPath = path.join('/');
  const url = new URL(`/api/v1/${apiPath}`, API_BACKEND_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build headers — must include content-type with multipart boundary
  const headers = new Headers();
  for (const key of FORWARD_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  // Read body as arrayBuffer to preserve binary content
  const body = await request.arrayBuffer();

  const apiRes = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body,
  });

  // Forward response
  const resHeaders = new Headers();
  const ct = apiRes.headers.get('content-type');
  if (ct) resHeaders.set('content-type', ct);

  const resBody = await apiRes.arrayBuffer();
  return new NextResponse(resBody, {
    status: apiRes.status,
    headers: resHeaders,
  });
}
