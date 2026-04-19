'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsageSummary } from '@/lib/api/developer';
import { getRecentLogs } from '@/lib/api/notifications';
import { useAuth } from '@/providers/auth-provider';

export function useUsageSummary(appId?: string | null) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['developer', 'usage-summary', appId ?? 'global'],
    queryFn: () => getUsageSummary(appId ?? undefined),
    staleTime: 60_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useRecentLogs() {
  // Endpoint /developer/messages does not exist yet on the backend — disabled to avoid 404s
  return useQuery({
    queryKey: ['developer', 'recent-logs'],
    queryFn: () => Promise.resolve({ data: [], total: 0 } as import('@/lib/api/types').MessageLogsResponse),
    enabled: false,
  });
}
