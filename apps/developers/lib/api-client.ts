/**
 * API Client for Developers App
 * httpOnly Cookie-based auth with CSRF protection and refresh mutex.
 */

// ===== CSRF Token Management =====
let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|; )(?:__Secure-)?csrf_token=([^;]*)/);
  if (match) {
    csrfToken = match[1];
    return csrfToken;
  }
  return null;
}

export function setCsrfToken(token: string): void {
  if (!token) return;
  csrfToken = token;
  if (typeof window === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const parts = [
    `csrf_token=${encodeURIComponent(token)}`,
    'Path=/',
    'Max-Age=' + (24 * 60 * 60),
    'SameSite=Lax',
  ];
  if (isSecure) parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function clearCsrfToken(): void {
  csrfToken = null;
  if (typeof window === 'undefined') return;
  document.cookie = 'csrf_token=; Path=/; Max-Age=0; SameSite=Lax';
}

// ===== Refresh Mutex =====
const REFRESH_STATE_KEY = '__developers_refresh_state__';

interface RefreshState {
  refreshFailed: boolean;
  isLoggingOut: boolean;
  refreshPromise: Promise<RefreshResult> | null;
  lastRefreshTime: number;
  expiresInSeconds: number | null;
}

function getGlobalRefreshState(): RefreshState {
  if (typeof window === 'undefined') {
    return { refreshFailed: false, isLoggingOut: false, refreshPromise: null, lastRefreshTime: Date.now(), expiresInSeconds: null };
  }
  if (!(window as any)[REFRESH_STATE_KEY]) {
    (window as any)[REFRESH_STATE_KEY] = {
      refreshFailed: false, isLoggingOut: false, refreshPromise: null, lastRefreshTime: Date.now(), expiresInSeconds: null,
    } as RefreshState;
  }
  return (window as any)[REFRESH_STATE_KEY];
}

const REFRESH_FAILED_KEY = 'developers_refresh_failed';
const REFRESH_FAILED_TTL_MS = 5_000;

function isRefreshBlockedByPreviousFailure(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = sessionStorage.getItem(REFRESH_FAILED_KEY);
    if (!stored) return false;
    if (Date.now() - parseInt(stored, 10) < REFRESH_FAILED_TTL_MS) return true;
    sessionStorage.removeItem(REFRESH_FAILED_KEY);
  } catch { /* ignore */ }
  return false;
}

function markRefreshFailed(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(REFRESH_FAILED_KEY, Date.now().toString()); } catch { /* ignore */ }
}

function clearRefreshFailedMark(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(REFRESH_FAILED_KEY); } catch { /* ignore */ }
}

export interface RefreshResult {
  success: boolean;
  csrfToken?: string;
  expiresIn?: number;
  user?: any;
}

export function updateLastRefreshTime(): void {
  getGlobalRefreshState().lastRefreshTime = Date.now();
}

export function setLoggingOut(value: boolean): void {
  const state = getGlobalRefreshState();
  state.isLoggingOut = value;
  if (value) {
    state.refreshFailed = true;
    state.refreshPromise = null;
    clearSilentRefresh();
  }
}

export function resetRefreshState(): void {
  const state = getGlobalRefreshState();
  state.refreshFailed = false;
  state.isLoggingOut = false;
  state.refreshPromise = null;
  clearSilentRefresh();
  clearRefreshFailedMark();
}

// ===== Silent Refresh =====
let silentRefreshTimerId: ReturnType<typeof setTimeout> | null = null;

export function scheduleSilentRefresh(expiresInSeconds: number): void {
  if (typeof window === 'undefined') return;
  clearSilentRefresh();
  const ms = Math.max(120_000, Math.floor(expiresInSeconds * 0.5) * 1000);
  silentRefreshTimerId = setTimeout(async () => {
    silentRefreshTimerId = null;
    await refreshOnce();
  }, ms);
}

function clearSilentRefresh(): void {
  if (silentRefreshTimerId) {
    clearTimeout(silentRefreshTimerId);
    silentRefreshTimerId = null;
  }
}

function handleAuthFailure(reason: 'expired' | 'invalid' = 'expired'): void {
  const state = getGlobalRefreshState();
  clearCsrfToken();
  clearSilentRefresh();
  state.refreshFailed = true;
  state.refreshPromise = null;
  markRefreshFailed();

  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;

    const isProtected = pathname === '/app' || pathname.startsWith('/app/');
    const authPages = ['/login', '/callback', '/check-email', '/complete-profile', '/verify'];
    const isAuthPage = authPages.some(p => pathname.startsWith(p));
    if (isProtected && !isAuthPage) {
      window.location.href = `/login?session=${reason}`;
    }
  }
}

export async function refreshOnce(): Promise<RefreshResult> {
  const state = getGlobalRefreshState();
  if (state.isLoggingOut) return { success: false };
  if (state.refreshFailed) return { success: false };
  if (isRefreshBlockedByPreviousFailure()) {
    state.refreshFailed = true;
    handleAuthFailure('expired');
    return { success: false };
  }
  if (state.refreshPromise) return state.refreshPromise;

  state.refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        handleAuthFailure('expired');
        return { success: false };
      }
      const data = await response.json();
      if (data.success && data.csrf_token) {
        setCsrfToken(data.csrf_token);
        updateLastRefreshTime();
        if (typeof data.expires_in === 'number') {
          scheduleSilentRefresh(data.expires_in);
        }
        return { success: true, csrfToken: data.csrf_token, expiresIn: data.expires_in, user: data.user || null };
      }
      handleAuthFailure('invalid');
      return { success: false };
    } catch {
      handleAuthFailure('expired');
      return { success: false };
    } finally {
      getGlobalRefreshState().refreshPromise = null;
    }
  })();

  return state.refreshPromise;
}

// ===== API Error =====
export class ApiException extends Error {
  constructor(public statusCode: number, message: string, public details?: string[]) {
    super(message);
    this.name = 'ApiException';
  }
  get isRateLimited(): boolean { return this.statusCode === 429; }
}

// ===== URL Builder =====
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullPath = path.startsWith('/auth/') ? `/api${path}` : `/api/v1${path}`;
  if (!params || Object.keys(params).length === 0) return fullPath;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${fullPath}?${qs}` : fullPath;
}

// ===== Main Client =====
interface RequestConfig extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

async function refreshAccessToken(): Promise<boolean> {
  const result = await refreshOnce();
  return result.success;
}

async function apiClient<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const { body, params, headers: customHeaders, method = 'GET', ...rest } = config;
  const url = buildUrl(endpoint, params);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const csrf = getCsrfToken();
  if (csrf && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    headers['X-CSRF-Token'] = csrf;
  }

  let response = await fetch(url, {
    ...rest, method, headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newCsrf = getCsrfToken();
      if (newCsrf && method !== 'GET') headers['X-CSRF-Token'] = newCsrf;
      response = await fetch(url, {
        ...rest, method, headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    }
  }

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = Array.isArray(responseData.message)
      ? responseData.message.join(', ')
      : responseData.message || 'An error occurred';
    throw new ApiException(response.status, errorMessage, Array.isArray(responseData.message) ? responseData.message : undefined);
  }

  return { data: responseData as T, status: response.status };
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<T>(endpoint, { method: 'GET', params }),
  post: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};

export default api;
