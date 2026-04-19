'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/lib/api/notifications';
import { useAuth } from '@/providers/auth-provider';

const KEYS = {
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications(params?: { limit?: number }) {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...KEYS.notifications, params],
    queryFn: () => getNotifications(params),
    refetchInterval: 30_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useUnreadNotificationCount() {
  const { isLoading, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: 15_000,
    enabled: !isLoading && isAuthenticated,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}

export function useDeleteAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}
