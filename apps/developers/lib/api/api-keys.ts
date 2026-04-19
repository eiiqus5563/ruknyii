import api from '../api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ApiKeyEnvironment = 'live' | 'test';

export const ALL_SCOPES = [
  'whatsapp:send',
  'whatsapp:read',
  'templates:read',
  'templates:write',
  'contacts:read',
  'contacts:write',
  'webhooks:manage',
  'media:upload',
] as const;

export type ApiKeyScope = (typeof ALL_SCOPES)[number];

export interface ApiKey {
  id: string;
  slug: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  scopes: string[];
  environment: string;
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  expiresAt: string | null;
  ipAllowlist: string[];
  requestCount: number;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  developerAppId: string;
  scopes?: string[];
  environment?: ApiKeyEnvironment;
  ipAllowlist?: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: string[];
  ipAllowlist?: string[];
}

export interface CreatedApiKeyResponse extends ApiKey {
  key: string; // Full key — shown once only
}

/* ------------------------------------------------------------------ */
/*  API calls                                                          */
/* ------------------------------------------------------------------ */

export async function getApiKeys(developerAppId?: string): Promise<ApiKey[]> {
  const params = developerAppId ? { developerAppId } : {};
  const { data } = await api.get<ApiKey[]>('/developer/api-keys', params);
  return Array.isArray(data) ? data : [];
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKeyResponse> {
  const { data } = await api.post<CreatedApiKeyResponse>('/developer/api-keys', input);
  return data;
}

export async function updateApiKey(keySlug: string, input: UpdateApiKeyInput): Promise<ApiKey> {
  const { data } = await api.patch<ApiKey>(`/developer/api-keys/${keySlug}`, input);
  return data;
}

export async function revokeApiKey(keySlug: string): Promise<void> {
  await api.delete(`/developer/api-keys/${keySlug}`);
}

export async function revealApiKey(keySlug: string, token: string): Promise<{ key: string }> {
  const { data } = await api.post<{ key: string }>(`/developer/api-keys/${keySlug}/reveal`, { token });
  return data;
}
