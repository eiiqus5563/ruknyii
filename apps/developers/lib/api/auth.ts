import { z } from 'zod';
import api, { setCsrfToken, clearCsrfToken, refreshOnce } from '../api-client';

// ============ Schemas ============

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'PREMIUM', 'BASIC', 'GUEST']).optional().default('BASIC'),
  emailVerified: z.boolean().optional().default(false),
  profileCompleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  csrf_token: z.string().optional(),
  user: UserSchema.optional(),
  expires_in: z.number().optional(),
  needsProfileCompletion: z.boolean().optional(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const QuickSignResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  type: z.enum(['LOGIN', 'SIGNUP']),
  expiresIn: z.number(),
});

export type QuickSignResponse = z.infer<typeof QuickSignResponseSchema>;

// ============ QuickSign ============

export async function requestQuickSign(email: string): Promise<QuickSignResponse> {
  const { data } = await api.post<QuickSignResponse>('/auth/quicksign/request', { email });
  return QuickSignResponseSchema.parse(data);
}

export async function verifyQuickSign(token: string): Promise<AuthResponse> {
  const { data } = await api.get<AuthResponse>(`/auth/quicksign/verify/${token}`);
  return AuthResponseSchema.parse(data);
}

// ============ Profile ============

export interface CompleteProfileInput {
  name: string;
  username: string;
}

export async function completeProfile(input: CompleteProfileInput): Promise<{ success: boolean; user: User }> {
  const { data } = await api.post<{ success: boolean; user: User }>('/auth/quicksign/complete-profile', input);
  return z.object({ success: z.boolean(), user: UserSchema }).parse(data);
}

export async function updateOAuthProfile(input: CompleteProfileInput): Promise<{ success: boolean; user: User; message: string }> {
  const { data } = await api.post<{ success: boolean; user: User; message: string }>('/auth/update-profile', input);
  return z.object({ success: z.boolean(), user: UserSchema, message: z.string() }).parse(data);
}

export async function checkUsername(username: string): Promise<{ available: boolean; suggestions?: string[] }> {
  const safeUsername = encodeURIComponent(username.trim());
  const { data } = await api.get<{ available: boolean; suggestions?: string[] }>(`/auth/quicksign/check-username/${safeUsername}`);
  return z.object({ available: z.boolean(), suggestions: z.array(z.string()).optional() }).parse(data);
}

// ============ Core Auth ============

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return UserSchema.parse(data);
}

export async function refreshToken(): Promise<AuthResponse> {
  const result = await refreshOnce();
  if (!result.success) throw new Error('Token refresh failed');
  return {
    success: true,
    csrf_token: result.csrfToken,
    expires_in: result.expiresIn,
    user: result.user || undefined,
  };
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout'); } finally { clearCsrfToken(); }
}

// ============ OAuth ============

import { API_BACKEND_URL } from '../config';

export function getGoogleAuthUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${API_BACKEND_URL}/api/v1/auth/google?redirect_origin=${encodeURIComponent(origin)}`;
}

export function getLinkedInAuthUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${API_BACKEND_URL}/api/v1/auth/linkedin?redirect_origin=${encodeURIComponent(origin)}`;
}

const OAUTH_EXCHANGE_KEY = '__developers_oauth_exchange__';

interface OAuthExchangeState {
  codes: Map<string, Promise<AuthResponse>>;
  usedCodes: Set<string>;
}

function getOAuthExchangeState(): OAuthExchangeState {
  if (typeof window === 'undefined') {
    return { codes: new Map(), usedCodes: new Set() };
  }
  if (!(window as any)[OAUTH_EXCHANGE_KEY]) {
    (window as any)[OAUTH_EXCHANGE_KEY] = {
      codes: new Map<string, Promise<AuthResponse>>(),
      usedCodes: new Set<string>(),
    };
  }
  return (window as any)[OAUTH_EXCHANGE_KEY];
}

export async function exchangeOAuthCode(code: string): Promise<AuthResponse> {
  const state = getOAuthExchangeState();
  if (state.usedCodes.has(code)) throw new Error('This authorization code has already been used');
  const existing = state.codes.get(code);
  if (existing) return existing;

  const promise = (async (): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/oauth/exchange', { code });
      const validated = AuthResponseSchema.parse(data);
      state.usedCodes.add(code);
      if (validated.csrf_token) setCsrfToken(validated.csrf_token);
      return validated;
    } finally {
      state.codes.delete(code);
    }
  })();

  state.codes.set(code, promise);
  return promise;
}

// ============ 2FA ============

export async function check2FASession(sessionId: string): Promise<{ valid: boolean; method?: string }> {
  const { data } = await api.get<{ valid: boolean; method?: string }>(`/auth/2fa/check-session/${sessionId}`);
  return data;
}

export async function verify2FALogin(token: string, pendingSessionId: string, rememberDevice?: boolean): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/2fa/verify-login', { token, pendingSessionId, rememberDevice });
  const validated = AuthResponseSchema.parse(data);
  if (validated.csrf_token) setCsrfToken(validated.csrf_token);
  return validated;
}

export async function get2FAStatus(): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
  const { data } = await api.get<{ enabled: boolean; backupCodesRemaining: number }>('/auth/2fa/status');
  return data;
}
