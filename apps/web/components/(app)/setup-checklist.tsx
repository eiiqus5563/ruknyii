'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMyProfile } from '@/lib/api/profiles';
import { getMyUsage } from '@/lib/api/subscriptions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  check: (ctx: ChecklistContext) => boolean;
}

interface ChecklistContext {
  profileComplete: boolean;
  hasLinks: boolean;
  hasProducts: boolean;
  hasForms: boolean;
  hasCustomization: boolean;
  exploredPlans: boolean;
}

/* ------------------------------------------------------------------ */
/*  Setup items                                                        */
/* ------------------------------------------------------------------ */

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'profile',
    label: 'أكمل ملفك الشخصي',
    href: '/app/settings',
    check: (c) => c.profileComplete,
  },
  {
    id: 'links',
    label: 'أضف أول رابط',
    href: '/app/links',
    check: (c) => c.hasLinks,
  },
  {
    id: 'forms',
    label: 'أنشئ أول نموذج',
    href: '/app/forms/create?new=true',
    check: (c) => c.hasForms,
  },
  {
    id: 'store',
    label: 'أضف منتجاً في المتجر',
    href: '/app/store/products',
    check: (c) => c.hasProducts,
  },
  {
    id: 'customize',
    label: 'خصّص مظهر صفحتك',
    href: '/app/links/customize',
    check: (c) => c.hasCustomization,
  },
  {
    id: 'plans',
    label: 'استكشف الباقات',
    href: '/pricing',
    check: (c) => c.exploredPlans,
  },
];

/* ------------------------------------------------------------------ */
/*  Progress ring SVG                                                  */
/* ------------------------------------------------------------------ */

function ProgressRing({ progress }: { progress: number }) {
  const size = 55;
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const pct = Math.round(progress * 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="setupProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(160, 79, 253)" stopOpacity={1} />
          <stop offset="100%" stopColor="rgb(38, 101, 214)" stopOpacity={0.6} />
        </linearGradient>
      </defs>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(112, 8, 231, 0.25)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#setupProgressGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
      />
      {/* Percentage text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight={600}
        fill="#A04FFD"
      >
        {pct}%
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface SetupChecklistProps {
  className?: string;
  collapsed?: boolean;
}

export function SetupChecklist({ className, collapsed = false }: SetupChecklistProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [exploredPlans, setExploredPlans] = useState(false);

  // Persist dismissal
  useEffect(() => {
    const stored = localStorage.getItem('rukny_setup_dismissed');
    if (stored === 'true') setDismissed(true);
  }, []);

  // Sync "explored plans" from localStorage + detect when user visits /pricing
  useEffect(() => {
    if (localStorage.getItem('rukny_explored_plans') === 'true') {
      setExploredPlans(true);
    }
  }, []);

  useEffect(() => {
    if (pathname === '/pricing') {
      localStorage.setItem('rukny_explored_plans', 'true');
      setExploredPlans(true);
    }
  }, [pathname]);

  // Refetch data when user navigates back (they may have completed a step)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['usage'] });
  }, [pathname, queryClient]);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: getMyUsage,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const context: ChecklistContext = useMemo(() => ({
    profileComplete: !!(profile?.displayName && profile?.bio && profile?.avatar),
    hasLinks: (usage?.usage.links.used ?? 0) > 0,
    hasForms: (usage?.usage.forms.used ?? 0) > 0,
    hasProducts: (usage?.usage.products.used ?? 0) > 0,
    hasCustomization: !!(profile?.cover),
    exploredPlans,
  }), [profile, usage, exploredPlans]);

  const completedCount = CHECKLIST_ITEMS.filter((item) => item.check(context)).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('rukny_setup_dismissed', 'true');
  }, []);

  const handleItemClick = useCallback((href: string) => {
    if (href === '/pricing') {
      localStorage.setItem('rukny_explored_plans', 'true');
      setExploredPlans(true);
    }
  }, []);

  // Hide when dismissed or all complete
  if (dismissed || completedCount === totalCount) return null;
  // Don't show until data is loaded
  if (!profile && !usage) return null;

  // Collapsed mode: show only progress ring
  if (collapsed) {
    return (
      <div className={cn('flex justify-center', className)}>
        <Link href="/app" title="قائمة الإعداد">
          <ProgressRing progress={progress} />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-card border border-border/40 p-3', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <ProgressRing progress={progress} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">قائمة الإعداد</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label="إغلاق"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {completedCount} من {totalCount} مكتملة
          </p>
        </div>
      </div>

      {/* Toggle details */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-[12px] font-medium hover:bg-primary/90 transition-colors active:scale-[0.98]"
      >
        {expanded ? 'إخفاء التفاصيل' : 'أكمل الإعداد'}
        <ChevronLeft
          className={cn(
            'size-3.5 transition-transform duration-200',
            expanded ? '-rotate-90' : '',
          )}
        />
      </button>

      {/* Checklist items */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1">
              {CHECKLIST_ITEMS.map((item) => {
                const done = item.check(context);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => handleItemClick(item.href)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                      done
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground hover:bg-muted/50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        done
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border',
                      )}
                    >
                      {done && <Check className="size-3" />}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
