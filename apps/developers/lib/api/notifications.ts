import api from '../api-client';
import type {
  NotificationsResponse,
  UnreadCountResponse,
  MessageLogsResponse,
} from './types';

/* ── Notifications ── */

export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>('/notifications', params as Record<string, string | number | boolean>);
  return data;
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await api.get<UnreadCountResponse>('/notifications/unread-count');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${encodeURIComponent(id)}`);
}

export async function deleteAllNotifications(): Promise<void> {
  await api.delete('/notifications');
}

/* ── Message Logs ── */

export async function getRecentLogs(limit = 20): Promise<MessageLogsResponse> {
  const { data } = await api.get<MessageLogsResponse>('/developer/messages', { limit });
  return data;
}
