'use client';

/**
 * 📊 Order Status Distribution
 * توزيع حالات الطلبات — أشرطة أفقية بسيطة
 *
 * Design tokens (shared):
 *   Card:     rounded-2xl, p-4 sm:p-5, border border-border/60
 *   Header:   icon w-8 h-8 rounded-xl, title text-sm font-bold
 *   Body:     text-xs / text-[11px]
 *   Bar:      h-2 rounded-full
 */

import { motion } from 'framer-motion';
import { TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatusItem {
  status: string;
  count: number;
  amount: number;
}

interface OrderStatusDistributionProps {
  orders: { status: string; total: number }[];
  formatCurrency: (amount: number) => string;
}

/* ------------------------------------------------------------------ */
/*  Status map                                                         */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, { label: string; color: string; bar: string }> = {
  PENDING:    { label: 'معلق',        color: 'text-warning',     bar: 'bg-warning' },
  PROCESSING: { label: 'قيد التجهيز', color: 'text-info',        bar: 'bg-info' },
  SHIPPED:    { label: 'تم الشحن',    color: 'text-accent',      bar: 'bg-accent' },
  COMPLETED:  { label: 'تم التوصيل',  color: 'text-success',     bar: 'bg-success' },
  CANCELLED:  { label: 'ملغي',        color: 'text-destructive', bar: 'bg-destructive' },
};

function statusInfo(status: string) {
  return STATUS_MAP[status.toUpperCase()] ?? STATUS_MAP.PENDING;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OrderStatusDistribution({ orders, formatCurrency }: OrderStatusDistributionProps) {
  // Aggregate by status
  const grouped = orders.reduce<Record<string, StatusItem>>((acc, o) => {
    const key = o.status.toUpperCase();
    if (!acc[key]) acc[key] = { status: key, count: 0, amount: 0 };
    acc[key].count += 1;
    acc[key].amount += Number(o.total) || 0;
    return acc;
  }, {});

  const items = Object.values(grouped).sort((a, b) => b.count - a.count);
  const total = orders.length;
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  /* ── Empty ── */
  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
      >
        <SectionHeader />
        <div className="flex flex-col items-center justify-center py-8 sm:py-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground/30" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">لا توجد بيانات حالياً</p>
        </div>
      </motion.div>
    );
  }

  /* ── With data ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
    >
      <SectionHeader
        trailing={
          <Link
            href="/app/store/orders"
            className="text-[11px] sm:text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            عرض الكل
          </Link>
        }
      />

      {/* Status bars */}
      <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-5">
        {items.map((item, i) => {
          const info = statusInfo(item.status);
          const pct = Math.round((item.count / total) * 100);
          const barW = (item.count / maxCount) * 100;

          return (
            <motion.div
              key={item.status}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className={cn('text-[11px] sm:text-xs font-medium truncate', info.color)}>
                    {info.label}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tabular-nums shrink-0">
                  {formatCurrency(item.amount)}
                </span>
              </div>

              {/* Bar */}
              <div className="h-1.5 sm:h-2 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barW}%` }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', info.bar)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ trailing }: { trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-foreground">توزيع حالات الطلبات</h3>
      </div>
      {trailing}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

export function OrderStatusDistributionSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-3.5 sm:h-4 w-28 sm:w-36 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-3 w-12 sm:w-14 bg-muted/30 rounded animate-pulse" />
      </div>
      <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-5">
        {[80, 50, 35, 20].map((w, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-3 w-16 sm:w-20 bg-muted/30 rounded animate-pulse" />
              <div className="h-3 w-20 sm:w-24 bg-muted/30 rounded animate-pulse" />
            </div>
            <div className="h-1.5 sm:h-2 rounded-full bg-muted/20">
              <div
                className="h-full rounded-full bg-muted/40 animate-pulse"
                style={{ width: `${w}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}