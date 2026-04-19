'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from '@/providers/locale-provider';
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconXCircle,
  IconInfo,
  IconActivity,
  IconTrash,
  IconX,
  IconCheckCheck,
  IconBellOff,
} from '@/components/icons';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '@/lib/hooks/use-notifications';
import { useUsageSummary, useRecentLogs } from '@/lib/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@heroui/react';
import type { BackendNotification, BackendNotificationType } from '@/lib/api/types';
import { DEVELOPER_NOTIFICATION_TYPES } from '@/lib/api/types';

type UiNotificationType = 'success' | 'error' | 'warning' | 'info' | 'update';

interface UiNotification {
  id: string;
  uiType: UiNotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  backendId: string | null;
}

const TYPE_CONFIG: Record<UiNotificationType, { icon: React.ElementType; color: string; bg: string; dot: string }> = {
  success: { icon: IconCheckCircle, color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
  error:   { icon: IconXCircle, color: 'text-danger', bg: 'bg-danger/10', dot: 'bg-danger' },
  warning: { icon: IconAlertTriangle, color: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning' },
  info:    { icon: IconInfo, color: 'text-accent', bg: 'bg-accent/10', dot: 'bg-accent' },
  update:  { icon: IconActivity, color: 'text-accent', bg: 'bg-accent/10', dot: 'bg-accent' },
};

function mapNotificationType(type: BackendNotificationType): UiNotificationType {
  switch (type) {
    case 'DEV_API_KEY_CREATED':
    case 'DEV_WALLET_TOPPED_UP':
    case 'DEV_PHONE_VERIFIED':
      return 'success';
    case 'DEV_API_KEY_EXPIRED':
    case 'DEV_MESSAGES_FAILED':
    case 'SECURITY_ALERT':
    case 'SUSPICIOUS_ACTIVITY':
    case 'SESSION_EXPIRED':
      return 'error';
    case 'DEV_API_KEY_REVOKED':
    case 'DEV_WALLET_LOW_BALANCE':
    case 'DEV_WEBHOOK_FAILING':
    case 'DEV_USAGE_WARNING':
      return 'warning';
    case 'DEV_SUBSCRIPTION_CHANGED':
    case 'NEW_LOGIN':
    case 'PASSWORD_CHANGED':
    case 'TWO_FACTOR_ENABLED':
    case 'TWO_FACTOR_DISABLED':
      return 'update';
    default:
      return 'info';
  }
}

function formatRelativeTime(dateStr: string, locale: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const isAr = locale === 'ar';
  if (minutes < 1) return isAr ? 'الآن' : 'Now';
  if (minutes < 60) return isAr ? `منذ ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isAr ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return isAr ? 'أمس' : 'Yesterday';
  if (days < 7) return isAr ? `منذ ${days} أيام` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US');
}

const DEV_TYPES_SET = new Set<string>(DEVELOPER_NOTIFICATION_TYPES);

function backendToUi(n: BackendNotification, locale: string): UiNotification | null {
  if (!DEV_TYPES_SET.has(n.type)) return null;
  return {
    id: n.id,
    uiType: mapNotificationType(n.type),
    title: n.title,
    message: n.message,
    time: formatRelativeTime(n.createdAt, locale),
    isRead: n.isRead,
    backendId: n.id,
  };
}

function buildSmartNotifications(
  usage: ReturnType<typeof useUsageSummary>['data'],
  logs: ReturnType<typeof useRecentLogs>['data'],
  s: Record<string, string>,
): UiNotification[] {
  const notifs: UiNotification[] = [];

  if (usage) {
    if (usage.wallet.balance < 500 && usage.wallet.balance >= 0) {
      notifs.push({
        id: 'smart-wallet-low',
        uiType: 'warning',
        title: s.smartWalletLow,
        message: s.smartWalletLowMsg.replace('{balance}', usage.wallet.balance.toLocaleString()),
        time: s.now,
        isRead: false,
        backendId: null,
      });
    }

    if (usage.subscription.apiKeysUsed === 0) {
      notifs.push({
        id: 'smart-no-api-keys',
        uiType: 'info',
        title: s.smartNoApiKeys,
        message: s.smartNoApiKeysMsg,
        time: '',
        isRead: false,
        backendId: null,
      });
    }

    const usagePercent = usage.subscription.messagesLimit > 0
      ? (usage.subscription.messagesUsed / usage.subscription.messagesLimit) * 100
      : 0;
    if (usagePercent >= 90) {
      notifs.push({
        id: 'smart-usage-critical',
        uiType: 'error',
        title: s.smartUsageCritical,
        message: s.smartUsageCriticalMsg.replace('{percent}', Math.round(usagePercent).toString()),
        time: s.now,
        isRead: false,
        backendId: null,
      });
    } else if (usagePercent >= 70) {
      notifs.push({
        id: 'smart-usage-warning',
        uiType: 'warning',
        title: s.smartUsageWarning,
        message: s.smartUsageWarningMsg.replace('{percent}', Math.round(usagePercent).toString()),
        time: s.now,
        isRead: false,
        backendId: null,
      });
    }
  }

  if (logs?.data) {
    const failedCount = logs.data.filter((m) => m.status === 'FAILED').length;
    if (failedCount > 0) {
      notifs.push({
        id: 'smart-recent-failures',
        uiType: 'error',
        title: s.smartRecentFailures.replace('{count}', failedCount.toString()),
        message: s.smartRecentFailuresMsg,
        time: s.recently,
        isRead: false,
        backendId: null,
      });
    }

    const deliveredCount = logs.data.filter((m) => m.status === 'DELIVERED' || m.status === 'READ').length;
    if (deliveredCount > 0 && failedCount === 0) {
      notifs.push({
        id: 'smart-all-delivered',
        uiType: 'success',
        title: s.smartAllDelivered,
        message: s.smartAllDeliveredMsg.replace('{count}', deliveredCount.toString()),
        time: s.recently,
        isRead: true,
        backendId: null,
      });
    }
  }

  return notifs;
}

type Filter = 'all' | UiNotificationType;

/* ── Notification list content (shared between desktop & mobile) ── */

function NotificationContent({ onClose }: { onClose?: () => void }) {
  const { t, locale } = useLocale();
  const params = useParams();
  const appId = params.appId as string | undefined;
  const s = t.dashboard.notifications as Record<string, string>;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: s.filterAll },
    { key: 'error', label: s.filterErrors },
    { key: 'warning', label: s.filterWarnings },
    { key: 'success', label: s.filterSuccess },
    { key: 'update', label: s.filterUpdates },
  ];

  const { data: notifsData, isLoading: notifsLoading } = useNotifications({ limit: 50 });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllRead();
  const deleteMutation = useDeleteNotification();
  const deleteAllMutation = useDeleteAllNotifications();

  const { data: usage, isLoading: usageLoading } = useUsageSummary(appId);
  const { data: logs, isLoading: logsLoading } = useRecentLogs();

  const [filter, setFilter] = useState<Filter>('all');

  const allNotifications = useMemo(() => {
    const backendNotifs = (notifsData?.notifications ?? [])
      .map((n) => backendToUi(n, locale))
      .filter((n): n is UiNotification => n !== null);

    const smartNotifs = buildSmartNotifications(usage, logs, s);
    const backendIds = new Set(backendNotifs.map((n) => n.id));
    const uniqueSmart = smartNotifs.filter((n) => !backendIds.has(n.id));

    return [...uniqueSmart, ...backendNotifs];
  }, [notifsData, usage, logs, locale, s]);

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const isLoading = notifsLoading || usageLoading || logsLoading;

  const filtered = useMemo(() => {
    if (filter === 'all') return allNotifications;
    return allNotifications.filter((n) => n.uiType === filter);
  }, [allNotifications, filter]);

  const handleMarkRead = useCallback((notif: UiNotification) => {
    if (notif.backendId) markReadMutation.mutate(notif.backendId);
  }, [markReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDismiss = useCallback((notif: UiNotification) => {
    if (notif.backendId) deleteMutation.mutate(notif.backendId);
  }, [deleteMutation]);

  const handleDeleteAll = useCallback(() => {
    deleteAllMutation.mutate();
  }, [deleteAllMutation]);

  return (
    <div className="flex flex-col h-full mt-2">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-[14px] font-bold text-foreground">{s.title}</h2>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="gap-1 text-[11px] text-accent"
                >
                  <IconCheckCheck className="w-3.5 h-3.5" />
                  {s.readAll}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom">{s.readAll}</Tooltip.Content>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  className="xl:hidden"
                >
                  <IconX className="w-4 h-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom">{s.close ?? 'Close'}</Tooltip.Content>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ═══ Filter tabs ═══ */}
      <div className="flex items-center gap-1 px-4 pb-3 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <Button
              key={f.key}
              variant={isActive ? 'default' : 'secondary'}
              size="xs"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full whitespace-nowrap',
                isActive
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-default text-muted hover:bg-default/80 hover:text-foreground',
              )}
            >
              {f.label}
            </Button>
          );
        })}
      </div>

      {/* ═══ Notification list ═══ */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <div className="px-4 space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6 py-16">
            <div className="w-12 h-12 rounded-2xl bg-default flex items-center justify-center">
              <IconBellOff className="w-5 h-5 text-muted/30" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground/60">{s.noNotifications}</p>
              <p className="text-[11px] text-muted mt-0.5">{s.noNotificationsDesc}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 space-y-0.5">
            {filtered.map((notif) => {
              const config = TYPE_CONFIG[notif.uiType];
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif)}
                  className="group relative rounded-xl px-3 py-3 transition-colors duration-150 cursor-pointer hover:bg-default/60"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', config.bg)}>
                      <Icon className={cn('w-[18px] h-[18px]', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          'text-[13px] text-foreground leading-tight',
                          !notif.isRead ? 'font-bold' : 'font-medium',
                        )}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', config.dot)} />
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed mt-0.5 line-clamp-2">{notif.message}</p>
                      {notif.time && (
                        <span className="text-[10px] text-muted/70 mt-1.5 block tabular-nums">{notif.time}</span>
                      )}
                    </div>
                    {notif.backendId && (
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => { e.stopPropagation(); handleDismiss(notif); }}
                            className="opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 shrink-0 mt-0.5"
                          >
                            <IconX className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content placement="left">{s.dismiss ?? 'Dismiss'}</Tooltip.Content>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Footer ═══ */}
      {allNotifications.length > 0 && allNotifications.some((n) => n.backendId) && (
        <div className="px-4 py-3 shrink-0">
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                variant="ghost"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending}
                className="w-full gap-1.5 text-[11px] text-muted hover:text-danger hover:bg-danger/10"
              >
                <IconTrash className="w-3 h-3" />
                {s.deleteAll}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="top">{s.deleteAll}</Tooltip.Content>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

/* ── Desktop panel (collapsible) ── */

export function ActivityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    } else {
      const t = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <aside
      className={cn(
        'hidden xl:flex flex-col h-full bg-background shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        open ? 'w-[300px] opacity-100' : 'w-0 opacity-0',
      )}
    >
      {shouldRender && <NotificationContent onClose={onClose} />}
    </aside>
  );
}

/* ── Mobile sheet with drag-to-dismiss ── */

export function MobileActivitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startY: 0, currentY: 0, isDragging: false });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Reset drag offset when closing
  useEffect(() => {
    if (!open) {
      // small delay to let exit animation play before resetting
      const t = setTimeout(() => setDragOffset(0), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow drag from the handle area (top 60px)
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touchY = e.touches[0].clientY - rect.top;
    if (touchY > 60) return;

    dragState.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY, isDragging: true };
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.isDragging) return;
    dragState.current.currentY = e.touches[0].clientY;
    const delta = Math.max(0, dragState.current.currentY - dragState.current.startY);
    setDragOffset(delta);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current.isDragging) return;
    const delta = dragState.current.currentY - dragState.current.startY;
    dragState.current.isDragging = false;
    setIsDragging(false);

    if (delta > 120) {
      // Swipe far enough → close
      setDragOffset(0);
      onClose();
    } else {
      // Snap back
      setDragOffset(0);
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm xl:hidden transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={open && dragOffset > 0 ? { opacity: Math.max(0, 1 - dragOffset / 300) * 0.4 } : undefined}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-surface rounded-t-3xl shadow-2xl border-t border-border xl:hidden',
          isDragging ? '' : 'transition-transform duration-300 ease-out',
          !open && !isDragging && 'translate-y-full',
        )}
        style={{
          transform: open
            ? `translateY(${dragOffset}px)`
            : undefined,
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className={cn(
            'w-10 h-1 rounded-full transition-all duration-200',
            isDragging ? 'bg-muted w-14' : 'bg-border',
          )} />
        </div>
        <NotificationContent onClose={onClose} />
      </div>
    </>
  );
}

/* ── Hook: unread count for layout header ── */

export function useUnreadCount() {
  const { data: notifsData } = useUnreadNotificationCount();
  const { data: usage } = useUsageSummary();
  const { data: logs } = useRecentLogs();
  const { t } = useLocale();
  const s = t.dashboard.notifications as Record<string, string>;

  return useMemo(() => {
    const backendUnread = notifsData?.unreadCount ?? 0;
    const smartNotifs = buildSmartNotifications(usage, logs, s);
    const smartUnread = smartNotifs.filter((n) => !n.isRead).length;
    return backendUnread + smartUnread;
  }, [notifsData, usage, logs, s]);
}
