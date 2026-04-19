'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApps, getApp, createApp, updateApp, deleteApp, sendAppOtp, verifyAppOtp } from '@/lib/api/apps';
import type { CreateAppInput, UpdateAppInput } from '@/lib/api/apps';
import { useAuth } from '@/providers/auth-provider';

export function useApps() {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['developer', 'apps'],
    queryFn: getApps,
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useApp(appId: string | null) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['developer', 'apps', appId],
    queryFn: () => getApp(appId!),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId,
  });
}

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppInput) => createApp(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'apps'] });
    },
  });
}

export function useUpdateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, input }: { appId: string; input: UpdateAppInput }) =>
      updateApp(appId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'apps'] });
    },
  });
}

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => deleteApp(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'apps'] });
    },
  });
}

export function useSendAppOtp() {
  return useMutation({
    mutationFn: (phoneNumber: string) => sendAppOtp(phoneNumber),
  });
}

export function useVerifyAppOtp() {
  return useMutation({
    mutationFn: ({ phoneNumber, code }: { phoneNumber: string; code: string }) =>
      verifyAppOtp(phoneNumber, code),
  });
}
