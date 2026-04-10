'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Bell,
  ShoppingBag,
  Package,
  FileText,
  Calendar,
  User,
  Store,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Notification,
  type NotificationCategory,
  filterByCategory,
  CATEGORY_LABELS,
} from '@/lib/hooks/use-notifications';

const typeIcons = {
  order: { icon: ShoppingBag, color: 'text-zinc-600 dark:text-zinc-300' },
  product: { icon: Package, color: 'text-zinc-600 dark:text-zinc-300' },
  form: { icon: FileText, color: 'text-zinc-600 dark:text-zinc-300' },
  event: { icon: Calendar, color: 'text-zinc-600 dark:text-zinc-300' },
  user: { icon: User, color: 'text-zinc-600 dark:text-zinc-300' },
  store: { icon: Store, color: 'text-zinc-600 dark:text-zinc-300' },
  message: { icon: MessageSquare, color: 'text-zinc-600 dark:text-zinc-300' },
  review: { icon: Star, color: 'text-zinc-600 dark:text-zinc-300' },
  alert: { icon: AlertCircle, color: 'text-zinc-600 dark:text-zinc-300' },
  success: { icon: CheckCircle2, color: 'text-zinc-600 dark:text-zinc-300' },
};

function getIconConfig(type: string) {
  if (type.startsWith('ORDER')) return typeIcons.order;
  if (type.startsWith('PRODUCT')) return typeIcons.product;
  if (type.startsWith('FORM')) return typeIcons.form;
  if (type.startsWith('EVENT') || type.startsWith('ORGANIZER')) return typeIcons.event;
  if (type.startsWith('USER')) return typeIcons.user;
  if (type.startsWith('STORE')) return typeIcons.store;
  if (type.startsWith('MESSAGE')) return typeIcons.message;
  if (type.startsWith('REVIEW')) return typeIcons.review;
  if (type.startsWith('ALERT') || type === 'SECURITY_ALERT') return typeIcons.alert;
  if (type === 'SUCCESS') return typeIcons.success;
  return { icon: Bell, color: 'text-muted-foreground' };
}

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

const CATEGORIES: NotificationCategory[] = ['all', 'orders', 'events', 'forms', 'system'];

interface NotificationDialogPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationDialogPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationDialogPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const filtered = filterByCategory(notifications, activeCategory);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-4xl text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
          aria-label="الإشعارات"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background/60" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-bold">الإشعارات</DialogTitle>
        </DialogHeader>
        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-6 pb-3 overflow-x-auto no-scrollbar">
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
        {/* Actions */}
        <div className="flex items-center justify-end gap-1 px-6 pb-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title="تحديد الكل كمقروء"
            >
              <CheckCircle2 className="size-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title="حذف الكل"
            >
              <AlertCircle className="size-3.5" />
              <span>حذف الكل</span>
            </button>
          )}
        </div>
        {/* Notification List */}
        <div className="max-h-[420px] overflow-y-auto px-2 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Bell className="size-8 animate-pulse text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="size-8 mb-2 opacity-30" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            filtered.map((notification) => {
              const iconConfig = getIconConfig(notification.type);
              const IconComponent = iconConfig.icon;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors cursor-pointer mb-2 min-h-[68px]',
                    !notification.isRead ? 'bg-zinc-950/[0.03] dark:bg-zinc-50/[0.04]' : 'bg-card hover:bg-muted/40',
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    !notification.isRead ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-muted/60',
                  )}>
                    <IconComponent className={cn(
                      'w-5 h-5',
                      !notification.isRead ? 'text-zinc-900 dark:text-zinc-100' : iconConfig.color,
                    )} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-foreground truncate">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {notification.message && (
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {notification.message}
                        </p>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        title="تحديد كمقروء"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(notification.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="حذف"
                    >
                      <AlertCircle className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <DialogClose asChild>
          <button className="mx-auto mt-2 mb-4 px-4 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:bg-muted/80">إغلاق</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
