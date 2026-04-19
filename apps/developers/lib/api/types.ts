/* ------------------------------------------------------------------ */
/*  Notification types                                                 */
/* ------------------------------------------------------------------ */

export type BackendNotificationType =
  // Developer platform
  | 'DEV_API_KEY_CREATED'
  | 'DEV_API_KEY_REVOKED'
  | 'DEV_API_KEY_EXPIRED'
  | 'DEV_WALLET_LOW_BALANCE'
  | 'DEV_WALLET_TOPPED_UP'
  | 'DEV_MESSAGES_FAILED'
  | 'DEV_WEBHOOK_FAILING'
  | 'DEV_SUBSCRIPTION_CHANGED'
  | 'DEV_USAGE_WARNING'
  | 'DEV_PHONE_VERIFIED'
  // Security
  | 'SECURITY_ALERT'
  | 'NEW_LOGIN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'PASSWORD_CHANGED'
  | 'SESSION_EXPIRED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  // General
  | 'SYSTEM'
  | 'MESSAGE';

/** Only developer-relevant types to show in the panel */
export const DEVELOPER_NOTIFICATION_TYPES: BackendNotificationType[] = [
  'DEV_API_KEY_CREATED',
  'DEV_API_KEY_REVOKED',
  'DEV_API_KEY_EXPIRED',
  'DEV_WALLET_LOW_BALANCE',
  'DEV_WALLET_TOPPED_UP',
  'DEV_MESSAGES_FAILED',
  'DEV_WEBHOOK_FAILING',
  'DEV_SUBSCRIPTION_CHANGED',
  'DEV_USAGE_WARNING',
  'DEV_PHONE_VERIFIED',
  'SECURITY_ALERT',
  'NEW_LOGIN',
  'SUSPICIOUS_ACTIVITY',
  'PASSWORD_CHANGED',
  'SESSION_EXPIRED',
  'TWO_FACTOR_ENABLED',
  'TWO_FACTOR_DISABLED',
];

export interface BackendNotification {
  id: string;
  userId: string;
  type: BackendNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  eventId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: BackendNotification[];
  total: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

/* ------------------------------------------------------------------ */
/*  Message log (for smart notifications)                              */
/* ------------------------------------------------------------------ */

export interface MessageLog {
  id: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
}

export interface MessageLogsResponse {
  data: MessageLog[];
  total: number;
}
