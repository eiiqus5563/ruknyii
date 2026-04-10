import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiClient } from './api-client';
import { verifySession } from './session';
import type { AuthUser } from './definitions';

/**
 * Data Access Layer (DAL)
 *
 * Centralised data-fetching functions that run on the server.
 * Each function first verifies the session (via cookie), then
 * calls the backend through the BFF apiClient.
 *
 * Using React `cache()` ensures each function runs at most once
 * per request, even if multiple Server Components call it.
 */

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Check whether the incoming request carries a refresh_token cookie.
 */
async function hasRefreshToken(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!(
    cookieStore.get('__Secure-refresh_token')?.value ||
    cookieStore.get('refresh_token')?.value
  );
}

/**
 * Attempt a server-side token refresh.
 * On success the apiClient will forward the backend's Set-Cookie headers
 * (new access_token + refresh_token) into the Next.js cookie store so
 * subsequent apiClient calls in the same request will use them.
 */
async function tryServerSideRefresh(): Promise<boolean> {
  const { status } = await apiClient('/auth/refresh', { method: 'POST' });
  return status === 200;
}

// ─── Auth ─────────────────────────────────────────────────────

/**
 * Get the currently authenticated user.
 * Redirects to /login if no valid session.
 *
 * When the access_token has expired but a refresh_token still exists,
 * we attempt a server-side refresh first instead of redirecting
 * immediately.  This prevents the redirect loop where:
 *   proxy lets the request through (refresh_token present) →
 *   dal.ts redirects to /login (access_token missing) →
 *   AuthProvider refreshes client-side → redirects back to /app → loop.
 */
export const getUser = cache(async (): Promise<AuthUser> => {
  const hasSession = await verifySession();

  if (!hasSession) {
    // access_token is missing – check for refresh_token before giving up
    const canRefresh = await hasRefreshToken();
    if (!canRefresh) {
      redirect('/login?session=expired');
    }

    // Try server-side refresh so the cookie store gets the new access_token
    const refreshed = await tryServerSideRefresh();
    if (!refreshed) {
      redirect('/login?session=expired');
    }
  }

  const { data, error, status } = await apiClient<AuthUser>('/auth/me');

  if (status === 401 || error || !data) {
    redirect('/login?session=expired');
  }

  return data;
});

/**
 * Get the current user without redirecting.
 * Returns `null` if not authenticated.
 */
export const getUserOptional = cache(async (): Promise<AuthUser | null> => {
  const hasSession = await verifySession();

  if (!hasSession) {
    // Try server-side refresh if refresh_token exists
    const canRefresh = await hasRefreshToken();
    if (!canRefresh) return null;

    const refreshed = await tryServerSideRefresh();
    if (!refreshed) return null;
  }

  const { data } = await apiClient<AuthUser>('/auth/me');
  return data;
});

/**
 * Ensure the user has completed their profile.
 * Redirects to /complete-profile if not.
 */
export const requireCompleteProfile = cache(async (): Promise<AuthUser> => {
  const user = await getUser();

  if (!user.profileCompleted) {
    redirect('/complete-profile');
  }

  return user;
});
