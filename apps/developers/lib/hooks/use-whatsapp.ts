'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWabaAccounts,
  connectWaba,
  disconnectWaba,
  refreshWaba,
  getEmbeddedSignupConfig,
  getPhoneNumbers,
  getPhoneNumber,
  registerPhoneNumber,
  updatePhoneProfile,
  sendTestMessage,
  getTemplates,
  createTemplate,
  deleteTemplate,
  syncTemplates,
} from '@/lib/api/whatsapp';
import type { TemplateCategory } from '@/lib/api/whatsapp';
import { useAuth } from '@/providers/auth-provider';

const KEYS = {
  accounts: (appId: string) => ['whatsapp', 'accounts', appId] as const,
  signupConfig: ['whatsapp', 'signup-config'] as const,
  phones: (appId: string) => ['whatsapp', 'phone-numbers', appId] as const,
  phone: (appId: string, id: string) => ['whatsapp', 'phone-numbers', appId, id] as const,
  templates: (appId: string) => ['whatsapp', 'templates', appId] as const,
};

/* ── WABA Accounts ── */

export function useWabaAccounts(appId: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.accounts(appId),
    queryFn: () => getWabaAccounts(appId),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId,
  });
}

export function useEmbeddedSignupConfig() {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.signupConfig,
    queryFn: getEmbeddedSignupConfig,
    staleTime: 300_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useConnectWaba(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, wabaId }: { code: string; wabaId?: string }) => connectWaba(appId, code, wabaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.accounts(appId) });
      qc.invalidateQueries({ queryKey: KEYS.phones(appId) });
      qc.invalidateQueries({ queryKey: ['developer', 'usage-summary', appId] });
    },
  });
}

export function useDisconnectWaba(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disconnectWaba(appId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.accounts(appId) });
      qc.invalidateQueries({ queryKey: KEYS.phones(appId) });
      qc.invalidateQueries({ queryKey: ['developer', 'usage-summary', appId] });
    },
  });
}

export function useRefreshWaba(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshWaba(appId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.accounts(appId) });
    },
  });
}

/* ── Phone Numbers ── */

export function usePhoneNumbers(appId: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.phones(appId),
    queryFn: () => getPhoneNumbers(appId),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId,
  });
}

export function usePhoneNumber(appId: string, id: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.phone(appId, id),
    queryFn: () => getPhoneNumber(appId, id),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId && !!id,
  });
}

export function useUpdatePhoneProfile(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, profile }: { id: string; profile: Parameters<typeof updatePhoneProfile>[2] }) =>
      updatePhoneProfile(appId, id, profile),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.phones(appId) });
      qc.invalidateQueries({ queryKey: KEYS.phone(appId, vars.id) });
    },
  });
}

export function useRegisterPhoneNumber(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => registerPhoneNumber(appId, id, pin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.phones(appId) });
    },
  });
}

export function useSendTestMessage(appId: string) {
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => sendTestMessage(appId, id, to),
  });
}

/* ── Templates ── */

export function useTemplates(appId: string, accountId?: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...KEYS.templates(appId), accountId ?? 'all'] as const,
    queryFn: () => getTemplates(appId, accountId || undefined),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId,
  });
}

export function useCreateTemplate(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; language: string; category: TemplateCategory; components: any[]; accountId?: string }) =>
      createTemplate({ appId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates(appId) });
    },
  });
}

export function useDeleteTemplate(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteTemplate(appId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates(appId) });
    },
  });
}

export function useSyncTemplates(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId?: string) => syncTemplates(appId, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates(appId) });
    },
  });
}
