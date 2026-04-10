/**
 * Client-side fetch helpers for settings pages.
 *
 * These use GET requests instead of server actions (POST) to avoid
 * polluting the request log with unnecessary POST calls on every page load.
 *
 * The Next.js rewrite in next.config.ts proxies /api/v1/* to the backend,
 * so cookies are forwarded automatically with credentials: 'include'.
 */

import type {
  ProfileData,
  UserProfile,
  SessionData,
  EmailChangeRequestData,
  StoreData,
  BannerItem,
} from '@/actions/settings';
import type { StorageUsage } from '@/actions/storage';
import type { AnalyticsSettings } from '@/actions/google-analytics';

const API = '/api/v1';

async function get<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API}${path}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { data: null, error: body?.message || `Error ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch {
    return { data: null, error: 'فشل الاتصال بالخادم' };
  }
}

// ─── Profile ──────────────────────────────────────────────────

export function fetchMyProfile() {
  return get<ProfileData>('/profiles/me');
}

export function fetchUserProfile() {
  return get<UserProfile>('/user/profile');
}

export function fetchCheckUsername(username: string) {
  return get<{ available: boolean }>(`/profiles/check/${encodeURIComponent(username)}`);
}

// ─── Account & Security ───────────────────────────────────────

export function fetchSessions() {
  return get<SessionData[]>('/user/sessions');
}

export function fetchEmailChangeRequest() {
  return get<EmailChangeRequestData>('/user/email-change-request');
}

// ─── Store ────────────────────────────────────────────────────

export function fetchMyStore() {
  return get<StoreData>('/stores/my-store');
}

export function fetchBanners() {
  return get<{ keys: string[]; urls: string[] }>('/upload/banners').then(({ data, error }) => {
    if (error || !data) return { data: null as BannerItem[] | null, error };
    const banners: BannerItem[] = (data.keys || []).map((key, i) => ({
      key,
      url: data.urls[i],
    }));
    return { data: banners, error: null };
  });
}

// ─── Integrations ─────────────────────────────────────────────

export function fetchGoogleCalendarStatus() {
  return get<{ success: boolean; linked: boolean }>('/google/calendar/status').then(({ data, error }) => {
    if (error || !data) return { data: null as { linked: boolean } | null, error };
    return { data: { linked: data.linked }, error: null };
  });
}

export function fetchStorageUsage() {
  return get<StorageUsage>('/storage/usage');
}

export function fetchAnalyticsSettings() {
  return get<AnalyticsSettings>('/stores/my-store/analytics');
}
