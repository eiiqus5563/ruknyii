'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Search, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { NotificationPanel } from '@/components/(app)/notifications/notification-panel';

/* ------------------------------------------------------------------ */
/*  Breadcrumb helper                                                  */
/* ------------------------------------------------------------------ */

const labelMap: Record<string, string> = {
  app: 'لوحة التحكم',
  links: 'روابطي',
  customize: 'تخصيص',
  store: 'المتجر',
  products: 'المنتجات',
  orders: 'الطلبات',
  categories: 'التصنيفات',
  new: 'جديد',
  forms: 'النماذج',
  responses: 'الردود',
  create: 'إنشاء',
  events: 'الأحداث',
  tasks: 'المهام',
  settings: 'الإعدادات',
  account: 'الحساب والأمان',
  appearance: 'المظهر',
  integrations: 'التكاملات',
  profile: 'الملف الشخصي',
  notifications: 'الإشعارات',
  analytics: 'الإحصائيات',
  delivery: 'التوصيل',
  automation: 'الأتمتة',
  marketing: 'التسويق',
  ai: 'الذكاء الاصطناعي',
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((seg, i) => ({
    label: labelMap[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));
}

/** Returns parent info for back-link pill */
function getParentInfo(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const parentSegments = segments.slice(0, -1);
  if (parentSegments.length === 0) return null;
  const parentSlug = parentSegments[parentSegments.length - 1];
  return { label: labelMap[parentSlug] ?? parentSlug, href: '/' + parentSegments.join('/') };
}

/* ------------------------------------------------------------------ */
/*  DashboardNav                                                       */
/* ------------------------------------------------------------------ */

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isResponsesPage = /\/app\/forms\/[^/]+\/responses/.test(pathname);

  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(!!user && !isResponsesPage);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  // Hide nav on form responses pages (they have their own header)
  if (isResponsesPage) return null;

  const breadcrumbs = buildBreadcrumbs(pathname);
  const parent = getParentInfo(pathname);

  return (
    <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
      <div className="flex items-center justify-center md:justify-between gap-2 lg:gap-4 px-3 pt-2.5 lg:pt-4 pb-1.5 sm:px-6 pointer-events-auto">

        {/* ═══════ Right Side (RTL): Breadcrumbs ═══════ */}
        <nav
          className={cn(
            'hidden md:flex items-center gap-1.5 rounded-4xl border border-border/30 px-3 lg:px-4 py-2 lg:py-2.5 backdrop-blur-xl dark:border-white/10 transition-opacity duration-200',
            isSearchOpen && 'opacity-0 pointer-events-none',
          )}
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="text-muted-foreground/30 select-none" aria-hidden>/</span>
              )}
              {crumb.isLast ? (
                <span className="truncate font-semibold text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search overlay */}
        {isSearchOpen && (
          <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center gap-3 rounded-t-2xl bg-card px-4 sm:px-6">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث عن أي شيء..."
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/50 outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* ═══════ Left Side (RTL): Glass actions bar ═══════ */}
        <div
          className={cn(
            'flex items-center gap-1 sm:gap-1.5 rounded-4xl border border-border/30 px-1.5 sm:px-2 py-1 sm:py-1.5 backdrop-blur-xl dark:border-white/10 transition-opacity duration-200',
            isSearchOpen && 'opacity-0 pointer-events-none',
          )}
        >

          {/* Notifications */}
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={notificationsLoading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
            onClearAll={clearAll}
          />

          {/* Divider */}
          <div className="h-5 w-px bg-border/20" aria-hidden />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="قائمة المستخدم"
              >
                <Avatar>
                  {user?.avatar ? (
                    <AvatarImage src={user.avatar} alt={user?.name || ''} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'R'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="px-3 py-2 justify-items-end">
                <p className="text-sm font-medium text-foreground">
                  {user?.name ?? 'المستخدم'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? user?.username ?? ''}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/profile" className="cursor-pointer justify-end-safe">
                  الملف الشخصي
                  <User className="size-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings" className="cursor-pointer justify-end-safe">
                  الإعدادات
                  <Settings className="size-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer justify-end-safe"
                onClick={() => {
                  void logout();
                }}
              >
                تسجيل الخروج
                <LogOut className="size-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Back link — shown when on a sub-page */}
          {parent && (
            <TooltipProvider>
              <div className="h-5 w-px bg-border/20" aria-hidden />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-muted-foreground" asChild>
                    <Link href={parent.href}>
                      <span>العودة لـ{parent.label}</span>
                      <ArrowLeft className="size-3" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{parent.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </header>
  );
}
