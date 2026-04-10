'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Package,
  Calendar,
  FileText,
  Shield,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Notification,
  type NotificationCategory,
  filterByCategory,
  CATEGORY_LABELS,
} from '@/lib/hooks/use-notifications';

// ─── Icon mapping ────────────────────────────────────────────────────

function getNotificationIcon(type: Notification['type']) {
  if (type.startsWith('ORDER_') || type === 'NEW_ORDER' || type.startsWith('PAYMENT') || type.startsWith('REFUND') || type.startsWith('PRODUCT_') || type === 'PRICE_DROP' || type === 'LOW_STOCK' || type.startsWith('NEW_PRODUCT') || type.startsWith('NEW_REVIEW'))
    return <Package className="size-4 text-zinc-600 dark:text-zinc-300 shrink-0" />;
  if (type.startsWith('EVENT_') || type.startsWith('ORGANIZER_') || type.startsWith('NEW_REGISTRATION') || type === 'REGISTRATION_CANCELLED' || type.startsWith('WAITLIST_'))
    return <Calendar className="size-4 text-zinc-600 dark:text-zinc-300 shrink-0" />;
  if (type.startsWith('FORM_') || type.startsWith('TODO_'))
    return <FileText className="size-4 text-zinc-600 dark:text-zinc-300 shrink-0" />;
  return <Shield className="size-4 text-zinc-600 dark:text-zinc-300 shrink-0" />;
}

// ─── Time ago ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ي`;
  return new Date(dateStr).toLocaleDateString('en-US');
}

// ─── Category tabs ───────────────────────────────────────────────────

const CATEGORIES: NotificationCategory[] = ['all', 'orders', 'events', 'forms', 'system'];

// ─── Component ───────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [hasMore, setHasMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filterByCategory(notifications, activeCategory);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 10);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [filtered, checkScroll]);

  return (
    <>
    <style>{`[data-notif-list]::-webkit-scrollbar{display:none}`}</style>
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-2xl text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
          aria-label="الإشعارات"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background/60" />
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            'z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] rounded-2xl border border-border/40 bg-background shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h3 className="text-base font-semibold">الإشعارات</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  title="تحديد الكل كمقروء"
                >
                  <CheckCheck className="size-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  title="حذف الكل"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs (Pill style) */}
          <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                  activeCategory === cat
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="relative m-2 rounded-2xl border-t border-border/30">
          <div ref={listRef} onScroll={checkScroll} data-notif-list className="max-h-[380px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="size-8 mb-2 opacity-30" />
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group flex items-start gap-3 m-2 rounded-2xl px-4 py-3 transition-colors hover:bg-muted/40 border-b border-border/20 last:border-b-0',
                    !notification.isRead && 'bg-zinc-950/[0.03] dark:bg-zinc-50/[0.04]',
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm leading-snug',
                        !notification.isRead ? 'font-medium text-foreground' : 'text-foreground/80',
                      )}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        title="تحديد كمقروء"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(notification.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* More indicator */}
          {hasMore && filtered.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center pb-2 pt-8 rounded-b-2xl bg-gradient-to-t from-background via-background/80 to-transparent">
              <span className="pointer-events-auto flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ChevronDown className="size-3 animate-bounce" />
                المزيد من الإشعارات
              </span>
            </div>
          )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
    </>
  );
}
