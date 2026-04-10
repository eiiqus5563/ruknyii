'use client';

/**
 * 📦 Recent Orders Component
 * قائمة آخر الطلبات — تصميم متناسق ونظيف
 *
 * Design tokens used:
 *   Card:     rounded-2xl, p-5, border border-border/60
 *   Row:      rounded-xl, px-3 py-2.5, gap-3
 *   Avatar:   w-9 h-9, rounded-xl, text-xs
 *   Title:    text-sm font-semibold
 *   Body:     text-xs text-muted-foreground
 *   Small:    text-[11px]
 *   Icon:     w-4 h-4 (header), w-3 h-3 (inline)
 */

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShoppingBag,
  ArrowUpLeft,
  Loader2,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderItem { productName: string }

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface RecentOrdersProps {
  orders: Order[];
  formatCurrency: (amount: number) => string;
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  PENDING:    { label: "معلق",          icon: Clock,        color: "text-warning",     bg: "bg-warning/10" },
  PROCESSING: { label: "قيد التجهيز",  icon: Loader2,      color: "text-info",        bg: "bg-info/10" },
  SHIPPED:    { label: "تم الشحن",      icon: Truck,        color: "text-accent",      bg: "bg-accent/10" },
  COMPLETED:  { label: "مكتمل",         icon: CheckCircle2, color: "text-success",     bg: "bg-success/10" },
  CANCELLED:  { label: "ملغي",          icon: XCircle,      color: "text-destructive", bg: "bg-destructive/10" },
};

function getStatusConfig(status: string) {
  return statusConfig[status.toUpperCase()] || statusConfig.PENDING;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} ي`;
}

function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary/12 text-primary",
  "bg-accent/12 text-accent",
  "bg-success/12 text-success",
  "bg-info/12 text-info",
  "bg-warning/12 text-warning",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RecentOrders({ orders, formatCurrency }: RecentOrdersProps) {
  /* ── Empty state ── */
  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
      >
        <SectionHeader />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
            <ShoppingBag className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">لا توجد طلبات بعد</p>
          <p className="text-xs text-muted-foreground/60 mt-1">ستظهر الطلبات الجديدة هنا</p>
        </div>
      </motion.div>
    );
  }

  /* ── With data ── */
  const totalValue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

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
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
          >
            عرض الكل
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Summary line */}
      <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 mr-9 sm:mr-10">
        {orders.length} طلب · إجمالي {formatCurrency(totalValue)}
      </p>

      {/* Order rows */}
      <div className="space-y-2 sm:space-y-2.5">
        {orders.map((order, i) => (
          <OrderRow
            key={order.id}
            order={order}
            index={i}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ trailing }: { trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-foreground">أحدث الطلبات</h3>
      </div>
      {trailing}
    </div>
  );
}

function OrderRow({
  order,
  index,
  formatCurrency,
}: {
  order: Order;
  index: number;
  formatCurrency: (n: number) => string;
}) {
  const cfg = getStatusConfig(order.status);
  const StatusIcon = cfg.icon;
  const isFirst = index === 0;

  /* Shorten order number for mobile: "MNKA71R2-P7J1" → "MNKA71R2" */
  const shortOrderNum = order.orderNumber.length > 8
    ? order.orderNumber.slice(0, 8)
    : order.orderNumber;

  return (
    <Link href={`/app/store/orders?order=${order.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "flex items-center m-1 gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border transition-all duration-200",
          isFirst
            ? "bg-primary/5 border-primary/10 hover:border-primary/20"
            : "bg-transparent border-transparent hover:bg-muted/25 hover:border-border/40"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-bold",
            avatarColor(order.customerName)
          )}
        >
          {getInitials(order.customerName)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
            {/* Short order# on mobile, full on desktop */}
            <span className="text-xs sm:text-sm font-semibold text-foreground leading-none truncate">
              <span className="sm:hidden">#{shortOrderNum}</span>
              <span className="hidden sm:inline">#{order.orderNumber}</span>
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 sm:gap-1 h-[18px] sm:h-5 px-1 sm:px-1.5 rounded-md text-[10px] sm:text-[11px] font-medium leading-none shrink-0",
                cfg.bg, cfg.color
              )}
            >
              <StatusIcon
                className={cn(
                  "w-2.5 h-2.5 sm:w-3 sm:h-3",
                  order.status.toUpperCase() === "PROCESSING" && "animate-spin"
                )}
              />
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate leading-none">
            {order.customerName}
            <span className="mx-1 opacity-40">·</span>
            {order.items.length} {order.items.length === 1 ? "منتج" : "منتجات"}
          </p>
        </div>

        {/* Price & time */}
        <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
          <span className="text-[11px] sm:text-sm font-bold text-foreground tabular-nums leading-none">
            {formatCurrency(order.total)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground/60 leading-none">
            {formatTimeAgo(order.createdAt)}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

export function RecentOrdersSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-4 w-24 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-6 w-16 bg-muted/30 rounded-lg animate-pulse" />
      </div>
      <div className="h-3 w-32 bg-muted/25 rounded animate-pulse mb-4 mr-10" />

      {/* Rows */}
      <div className="space-y-1.5 sm:space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/30 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-muted/30 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/20 rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-3.5 w-16 bg-muted/30 rounded animate-pulse" />
              <div className="h-3 w-10 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
