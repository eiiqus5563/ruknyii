'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketToken } from '@/lib/api/auth';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_STATUS_CHANGED' | 'ORDER_CONFIRMED' | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'NEW_ORDER'
  | 'PAYMENT_RECEIVED' | 'REFUND_REQUESTED'
  | 'PRODUCT_BACK_IN_STOCK' | 'PRICE_DROP' | 'NEW_REVIEW'
  | 'LOW_STOCK' | 'NEW_PRODUCT_REVIEW'
  | 'NEW_REGISTRATION' | 'REGISTRATION_CANCELLED'
  | 'WAITLIST_PROMOTION' | 'WAITLIST_POSITION_UPDATE'
  | 'EVENT_STATUS_CHANGED' | 'EVENT_DETAILS_UPDATED'
  | 'ORGANIZER_ANNOUNCEMENT' | 'EVENT_STARTING_SOON' | 'ORGANIZER_INVITATION'
  | 'SECURITY_ALERT' | 'NEW_LOGIN' | 'SUSPICIOUS_ACTIVITY'
  | 'PASSWORD_CHANGED' | 'SESSION_EXPIRED'
  | 'TWO_FACTOR_ENABLED' | 'TWO_FACTOR_DISABLED'
  | 'FORM_SUBMISSION' | 'FORM_RESPONSE' | 'FORM_SHARED'
  | 'TODO_OVERDUE' | 'TODO_REMINDER' | 'TODO_DAILY_REMINDER' | 'TODO_DUE_SOON'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  eventId?: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationCategory = 'all' | 'orders' | 'events' | 'forms' | 'system';

const CATEGORY_TYPES: Record<Exclude<NotificationCategory, 'all'>, NotificationType[]> = {
  orders: [
    'ORDER_STATUS_CHANGED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED',
    'ORDER_DELIVERED', 'ORDER_CANCELLED', 'NEW_ORDER',
    'PAYMENT_RECEIVED', 'REFUND_REQUESTED',
    'PRODUCT_BACK_IN_STOCK', 'PRICE_DROP', 'LOW_STOCK',
    'NEW_REVIEW', 'NEW_PRODUCT_REVIEW',
  ],
  events: [
    'EVENT_STATUS_CHANGED', 'EVENT_DETAILS_UPDATED',
    'ORGANIZER_ANNOUNCEMENT', 'EVENT_STARTING_SOON', 'ORGANIZER_INVITATION',
    'NEW_REGISTRATION', 'REGISTRATION_CANCELLED',
    'WAITLIST_PROMOTION', 'WAITLIST_POSITION_UPDATE',
  ],
  forms: [
    'FORM_SUBMISSION', 'FORM_RESPONSE', 'FORM_SHARED',
    'TODO_OVERDUE', 'TODO_REMINDER', 'TODO_DAILY_REMINDER', 'TODO_DUE_SOON',
  ],
  system: [
    'SECURITY_ALERT', 'NEW_LOGIN', 'SUSPICIOUS_ACTIVITY',
    'PASSWORD_CHANGED', 'SESSION_EXPIRED',
    'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED',
    'SYSTEM',
  ],
};

export function filterByCategory(
  notifications: Notification[],
  category: NotificationCategory,
): Notification[] {
  if (category === 'all') return notifications;
  const types = CATEGORY_TYPES[category];
  return notifications.filter((n) => types.includes(n.type));
}

// ─── Category labels (Arabic) ────────────────────────────────────────

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  all: 'الكل',
  orders: 'الطلبات',
  events: 'الأحداث',
  forms: 'النماذج',
  system: 'النظام',
};

// ─── Hook ────────────────────────────────────────────────────────────

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Fetch initial notifications via REST
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<{
        notifications: Notification[];
        total: number;
        unreadCount: number;
      }>('/notifications', { limit: 50 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      const { token, expiresIn } = await getWebSocketToken();

      // Determine WS URL from API external URL or fallback
      const apiExternal = process.env.NEXT_PUBLIC_API_EXTERNAL_URL || 'http://localhost:3001/api/v1';
      const wsUrl = apiExternal.replace(/\/api\/v\d+\/?$/, '');

      const socket = io(`${wsUrl}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually for token refresh
      });

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        // Reconnect after a delay
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 3000);
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 5000);
      });

      socket.on('new-notification', (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        // Toast for incoming notification
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      });

      socket.on('unread-count', (data: { count: number }) => {
        setUnreadCount(data.count);
      });

      socketRef.current = socket;

      // Schedule token refresh before expiry (refresh 30s before)
      const refreshMs = Math.max((expiresIn - 30) * 1000, 60_000);
      tokenRefreshTimerRef.current = setTimeout(() => {
        socket.disconnect();
        connect();
      }, refreshMs);
    } catch {
      // Retry after delay
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 10_000);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      // silent
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchNotifications();
    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearTimeout(reconnectTimerRef.current);
      clearTimeout(tokenRefreshTimerRef.current);
    };
  }, [enabled, fetchNotifications, connect]);

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
