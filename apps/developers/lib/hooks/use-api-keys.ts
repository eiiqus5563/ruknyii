'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  revealApiKey,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
} from '@/lib/api/api-keys';
import { get2FAStatus } from '@/lib/api/auth';
import { useAuth } from '@/providers/auth-provider';

const KEYS = {
  list: (appId?: string) => ['developer', 'api-keys', appId ?? 'all'] as const,
};

export function useApiKeys(developerAppId?: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.list(developerAppId),
    queryFn: () => getApiKeys(developerAppId),
    staleTime: 30_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useApiKey(slug: string, developerAppId?: string) {
  const { data: keys, ...rest } = useApiKeys(developerAppId);
  const key = keys?.find((k) => k.slug === slug) ?? null;
  return { data: key, ...rest };
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) => createApiKey(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list(variables.developerAppId) });
      qc.invalidateQueries({ queryKey: ['developer', 'usage-summary'] });
    },
  });
}

export function useUpdateApiKey(developerAppId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keySlug, input }: { keySlug: string; input: UpdateApiKeyInput }) =>
      updateApiKey(keySlug, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(developerAppId) });
    },
  });
}

export function useRevokeApiKey(developerAppId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keySlug: string) => revokeApiKey(keySlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(developerAppId) });
      qc.invalidateQueries({ queryKey: ['developer', 'usage-summary'] });
    },
  });
}

export function use2FAStatus() {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['auth', '2fa-status'],
    queryFn: get2FAStatus,
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useRevealApiKey() {
  return useMutation({
    mutationFn: ({ keySlug, token }: { keySlug: string; token: string }) =>
      revealApiKey(keySlug, token),
  });
}
