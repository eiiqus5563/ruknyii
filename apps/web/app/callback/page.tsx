import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Redirect /callback → /auth/callback
 * The API redirects OAuth to /callback, but the web app's actual handler is at /auth/callback.
 */
export default async function CallbackRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    }
  }

  const query = params.toString();
  redirect(`/auth/callback${query ? `?${query}` : ''}`);
}
