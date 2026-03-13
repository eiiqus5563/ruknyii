'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Link2,
  ShoppingBag,
  FileText,
  CalendarDays,
  BarChart3,
  Plus,
  Package,
  CalendarPlus,
  ListPlus,
  LinkIcon,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dock, DockIcon } from '@/components/ui/dock';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface DockNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const navItems: DockNavItem[] = [
  { href: '/app', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/app/links', label: 'روابطي', icon: Link2 },
  { href: '/app/store', label: 'المتجر', icon: ShoppingBag },
  { href: '/app/forms', label: 'النماذج', icon: FileText },
];

const quickActions: QuickAction[] = [
  { href: '/app/store/products/create', label: 'منتج جديد', description: 'إضافة منتج إلى متجرك', icon: Package, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  { href: '/app/forms/create?new=true', label: 'نموذج جديد', description: 'إنشاء نموذج استبيان أو تسجيل', icon: FileText, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { href: '/app/events/create', label: 'حدث جديد', description: 'إنشاء فعالية أو لقاء', icon: CalendarPlus, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
  { href: '/app/tasks/create', label: 'مهمة جديدة', description: 'إضافة مهمة لقائمة مهامك', icon: ListPlus, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { href: '/app/links', label: 'إضافة رابط', description: 'إضافة رابط لصفحتك', icon: LinkIcon, iconBg: 'bg-pink-500/10', iconColor: 'text-pink-500' },
  { href: '/app/analytics', label: 'عرض التحليلات', description: 'اطلع على تحليلات متجرك وروابطك', icon: BarChart3, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500' },
  { href: '/app/events', label: 'إضافة فعالية', description: 'إنشاء فعالية جديدة', icon: CalendarDays, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-500' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MobileDock() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => setIsOpen((v) => !v), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  // Hide dock on full-screen form pages (create, preview, edit)
  const hiddenPaths = ['/app/forms/create', '/app/forms/preview', '/forms/create', '/forms/preview'];
  const isFormEditRoute = /\/app\/forms\/[^/]+\/edit/.test(pathname) || /\/forms\/[^/]+\/edit/.test(pathname);
  if (hiddenPaths.some(p => pathname.startsWith(p)) || isFormEditRoute) {
    return null;
  }

  const isActive = (href: string) => {
    const path = href.split('?')[0];
    if (path === '/app') return pathname === '/app';
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Quick Actions Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
              onClick={closeMenu}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="fixed inset-x-4 z-50 max-h-[60vh] lg:hidden"
              style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
              dir="rtl"
            >
              <div className="overflow-y-auto rounded-2xl bg-background border border-border/40 shadow-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="p-2 space-y-0.5">
                  {quickActions.map((action, i) => (
                    <motion.div
                      key={action.href + action.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.15 }}
                    >
                      <Link
                        href={action.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-muted/50 hover:bg-muted/30"
                      >
                        <div className={cn('flex size-9 items-center justify-center rounded-full shrink-0', action.iconBg)}>
                          <action.icon className={cn('size-[18px]', action.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground">{action.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{action.description}</p>
                        </div>
                        <ChevronLeft className="size-3.5 text-muted-foreground/30 shrink-0" />
                      </Link>
                    </motion.div>
                  ))}

                  {/* Divider */}
                  <div className="mx-3 h-px bg-border/40" />

                  {/* Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: quickActions.length * 0.025, duration: 0.15 }}
                  >
                    <Link
                      href="/app/settings"
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-muted/50 hover:bg-muted/30"
                    >
                      <div className="flex size-9 items-center justify-center rounded-full shrink-0 bg-muted">
                        <Settings className="size-[18px] text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">الإعدادات</p>
                        <p className="text-[11px] text-muted-foreground">إدارة حسابك وتفضيلاتك</p>
                      </div>
                      <ChevronLeft className="size-3.5 text-muted-foreground/30 shrink-0" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dock */}
      <div
        className="fixed left-0 right-0 z-50 flex justify-center lg:hidden"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <Dock
          direction="middle"
          magnification={52}
          distance={92}
          className="mx-auto mt-0 h-[60px] gap-1.5 rounded-2xl border-border/60 bg-background/85 px-2.5 shadow-xl shadow-black/10 backdrop-blur-xl"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <DockIcon key={item.href} size={42} className={cn(
                'transition-colors',
                active
                  ? 'bg-primary/12 ring-1 ring-primary/20'
                  : 'hover:bg-muted/60'
              )}>
                <Link
                  href={item.href}
                  className="flex size-full flex-col items-center justify-center"
                  aria-label={item.label}
                >
                  <item.icon
                    className={cn(
                      'size-5',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                </Link>
              </DockIcon>
            );
          })}

          {/* + Button */}
          <DockIcon size={42} className="bg-primary shadow-sm hover:bg-primary/90 transition-colors">
            <button
              type="button"
              onClick={toggleMenu}
              className="flex size-full items-center justify-center"
              aria-label={isOpen ? 'إغلاق القائمة' : 'إنشاء سريع'}
            >
              <motion.div
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="size-[22px] text-primary-foreground" strokeWidth={2.5} />
              </motion.div>
            </button>
          </DockIcon>
        </Dock>
      </div>
    </>
  );
}