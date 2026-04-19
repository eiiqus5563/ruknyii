'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { allocateAppWallet, getAppWallet, getWallet } from '@/lib/api/developer';
import { useAuth } from '@/providers/auth-provider';

export function useMasterWallet() {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['developer', 'wallet', 'master'],
    queryFn: getWallet,
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useAppWallet(appId: string) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['developer', 'wallet', 'app', appId],
    queryFn: () => getAppWallet(appId),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated && !!appId,
  });
}

export function useAllocateAppWallet(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => allocateAppWallet(appId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'wallet', 'master'] });
      queryClient.invalidateQueries({ queryKey: ['developer', 'wallet', 'app', appId] });
      queryClient.invalidateQueries({ queryKey: ['developer', 'usage-summary', appId] });
    },
  });
}