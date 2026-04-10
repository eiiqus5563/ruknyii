'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Edit2,
  Crown,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import type {
  DashboardStats,
  DashboardProduct,
  StoreInfo,
} from '@/lib/hooks/useStoreDashboard';
import type { Order } from '@/components/(app)/store';
import { ORDER_STATUS_CONFIG } from '@/components/(app)/store';

// ============================================================
//  STORE HEADER
// ============================================================

interface StoreHeaderProps {
  store: StoreInfo | null;
}

export const StoreHeader = memo(function StoreHeader({ store }: StoreHeaderProps) {
  if (!store) return null;

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
      {store.logo ? (
        <img
          src={store.logo}
          alt={store.name}
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="text-base sm:text-xl font-bold text-foreground truncate">{store.name}</h1>
          <span
            className={cn(
              'px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0',
              store.isActive
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {store.isActive ? 'نشط' : 'غير نشط'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">لوحة تحكم المتجر</p>
      </div>
    </div>
  );
});

// ============================================================
//  STATS CARDS (4 main + today bar)
// ============================================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  return (num ?? 0).toLocaleString('en-US');
};

interface DashboardStatsProps {
  stats: DashboardStats;
}

const STAT_CARDS: Array<{
  key: string;
  title: string;
  field: keyof DashboardStats;
  icon: typeof DollarSign;
  isCurrency?: boolean;
  highlight?: boolean;
  alert?: boolean;
}> = [
  { key: 'revenue', title: 'إجمالي الإيرادات', field: 'totalRevenue', isCurrency: true, icon: DollarSign, highlight: true },
  { key: 'orders', title: 'إجمالي الطلبات', field: 'totalOrders', icon: ShoppingCart },
  { key: 'pending', title: 'طلبات معلقة', field: 'pendingOrders', icon: Clock, alert: true },
  { key: 'delivered', title: 'تم التوصيل', field: 'deliveredOrders', icon: CheckCircle2 },
];

export const DashboardStatsCards = memo(function DashboardStatsCards({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-2.5">
      {/* Main 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {STAT_CARDS.map((card) => {
          const value = stats[card.field];
          const isAlert = card.alert && value > 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'rounded-2xl p-3.5 sm:p-5 border transition-colors',
                card.highlight
                  ? 'bg-primary/5 border-primary/10'
                  : isAlert
                    ? 'bg-amber-500/5 border-amber-500/15'
                    : 'bg-card border-border/60 hover:border-primary/20',
              )}
            >
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 leading-none">{card.title}</p>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-1 leading-none">
                {card.isCurrency ? formatCurrency(value) : formatNumber(value)}
              </h3>
              <div className="flex items-center gap-1.5">
                {isAlert ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-500 leading-none">تحتاج متابعة</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-500 leading-none">
                      {card.isCurrency ? (stats.todayRevenue > 0 ? `+${formatCurrency(stats.todayRevenue)} اليوم` : 'جيد') : 'جيد'}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-3.5 sm:p-5 bg-card border border-border/40 animate-pulse">
            <div className="h-3 w-16 bg-muted/40 rounded mb-2" />
            <div className="h-7 w-20 bg-muted/40 rounded mb-1" />
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 bg-muted/30 rounded" />
              <div className="h-3 w-10 bg-muted/30 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-card border border-border/40 px-4 py-3 animate-pulse h-10" />
    </div>
  );
}

// ============================================================
//  TOP PRODUCTS
// ============================================================

interface TopProductsProps {
  products: DashboardProduct[];
  onView?: (product: DashboardProduct) => void;
}

export const TopProducts = memo(function TopProducts({ products, onView }: TopProductsProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-2.5">
          <Crown className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product, index) => {
        const image = product.images?.[0];
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onView?.(product)}
            className="flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-2.5 hover:bg-muted/40 transition-colors cursor-pointer group"
          >
            {/* Rank */}
            <div
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0',
                index === 0 && 'bg-amber-100 text-amber-600 dark:bg-amber-500/20',
                index === 1 && 'bg-muted text-muted-foreground',
                index === 2 && 'bg-orange-100 text-orange-600 dark:bg-orange-500/20',
                index > 2 && 'bg-muted text-muted-foreground',
              )}
            >
              {index + 1}
            </div>

            {/* Image */}
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {product.orderCount ?? 0} طلب
              </p>
            </div>

            {/* Revenue */}
            <div className="text-left shrink-0">
              <p className="text-xs font-semibold text-foreground tabular-nums">
                {formatCurrency(product.price)}
              </p>
            </div>

            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
          </motion.div>
        );
      })}
    </div>
  );
});

export function TopProductsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 animate-pulse">
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-muted rounded-lg" />
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted/60 rounded w-1/3" />
          </div>
          <div className="h-3 w-14 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  REVENUE CHART
// ============================================================

interface RevenueChartProps {
  data: { date: string; revenue: number; orders: number }[];
}

export const RevenueChart = memo(function RevenueChart({ data }: RevenueChartProps) {
  const hasData = data.some((d) => d.revenue > 0 || d.orders > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-2.5">
          <TrendingUp className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6B9E6A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6B9E6A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: '12px',
              direction: 'rtl',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            labelFormatter={(v) => new Date(v).toLocaleDateString('en-GB')}
            formatter={(value: unknown, name: unknown) => [
              String(name === 'revenue' ? formatCurrency(Number(value) || 0) : (value ?? 0)),
              name === 'revenue' ? 'الإيرادات' : 'الطلبات',
            ]}
          />
          <Area type="monotone" dataKey="revenue" stroke="#6B9E6A" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          الإيرادات (آخر 14 يوم)
        </span>
      </div>
    </div>
  );
});

export function RevenueChartSkeleton() {
  return <div className="h-[230px] rounded-2xl bg-muted/20 animate-pulse" />;
}

// ============================================================
//  STOCK ALERTS
// ============================================================

interface StockAlertsProps {
  products: DashboardProduct[];
  onEdit?: (product: DashboardProduct) => void;
}

export const StockAlerts = memo(function StockAlerts({ products, onEdit }: StockAlertsProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-2.5">
          <Package className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">المخزون جيد</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {products.map((product, index) => {
        const isOutOfStock = product.stock === 0;
        const image = product.images?.[0];

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-2.5 hover:bg-muted/40 transition-colors group"
          >
            {/* Image */}
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{product.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <AlertTriangle
                  className={cn(
                    'w-3 h-3',
                    isOutOfStock ? 'text-rose-500' : 'text-amber-500',
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isOutOfStock ? 'text-rose-500' : 'text-amber-500',
                  )}
                >
                  {isOutOfStock ? 'نفذ المخزون' : `متبقي ${product.stock} فقط`}
                </span>
              </div>
            </div>

            {/* Badge */}
            <span
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0',
                isOutOfStock
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
              )}
            >
              {product.stock}
            </span>

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(product);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

export function StockAlertsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 animate-pulse">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-2/3" />
            <div className="h-2.5 bg-muted/60 rounded w-1/3" />
          </div>
          <div className="h-5 w-7 bg-muted rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  RECENT ORDERS
// ============================================================

interface RecentOrdersProps {
  orders: Order[];
  onView?: (order: Order) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} د`;
  if (diffHours < 24) return `منذ ${diffHours} س`;
  if (diffDays < 30) return `منذ ${diffDays} ي`;
  return new Date(dateString).toLocaleDateString('en-US');
}

export const RecentOrders = memo(function RecentOrders({ orders, onView }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-2.5">
          <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">لا توجد طلبات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order, index) => {
        const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
        const StatusIcon = config.icon;
        const customerName = order.customer?.name || order.users?.profile?.name || order.users?.name || (order.phoneNumber ? `زائر (${order.phoneNumber})` : 'زائر');

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onView?.(order)}
            className="flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-2.5 hover:bg-muted/40 transition-colors cursor-pointer group"
          >
            {/* Status Icon */}
            <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
              <StatusIcon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', config.color)} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">{customerName}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">#{order.orderNumber}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', config.bg, config.textColor)}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatTimeAgo(order.createdAt)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="text-left shrink-0">
              <p className="text-xs font-semibold text-foreground tabular-nums">
                {formatCurrency(order.total, order.currency)}
              </p>
            </div>

            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
          </motion.div>
        );
      })}
    </div>
  );
});

export function RecentOrdersSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 animate-pulse">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-2/3" />
            <div className="h-2.5 bg-muted/60 rounded w-1/3" />
          </div>
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  ORDERS STATUS CHART (Horizontal bars)
// ============================================================

interface OrdersStatusChartProps {
  ordersByStatus: Record<string, number>;
  totalOrders: number;
}

export const OrdersStatusChart = memo(function OrdersStatusChart({
  ordersByStatus,
  totalOrders,
}: OrdersStatusChartProps) {
  if (totalOrders === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
          <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground/30" />
        </div>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">لا توجد طلبات لعرض التقرير</p>
      </div>
    );
  }

  const entries = Object.entries(ordersByStatus).sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      {entries.map(([status, count], i) => {
        const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
        const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
        const barW = (count / maxCount) * 100;
        const StatusIcon = config.icon;

        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            {/* Label row */}
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <StatusIcon className={cn('w-3.5 h-3.5', config.color)} />
                <span className={cn('text-[11px] sm:text-xs font-medium', config.color)}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tabular-nums">{count}</span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground/60 tabular-nums">({percentage}%)</span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-1.5 sm:h-2 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barW}%` }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  status === 'PENDING' && 'bg-amber-500',
                  status === 'CONFIRMED' && 'bg-blue-500',
                  status === 'PROCESSING' && 'bg-indigo-500',
                  status === 'SHIPPED' && 'bg-violet-500',
                  status === 'OUT_FOR_DELIVERY' && 'bg-cyan-500',
                  status === 'DELIVERED' && 'bg-emerald-500',
                  status === 'CANCELLED' && 'bg-rose-500',
                  status === 'REFUNDED' && 'bg-muted-foreground',
                )}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

export function OrdersStatusChartSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {[80, 50, 35, 20].map((w, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="h-3 w-16 sm:w-20 bg-muted/30 rounded animate-pulse" />
            <div className="h-3 w-10 sm:w-14 bg-muted/30 rounded animate-pulse" />
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
  );
}

// ============================================================
//  LATEST PRODUCTS
// ============================================================

interface LatestProductsProps {
  products: DashboardProduct[];
  onView?: (product: DashboardProduct) => void;
}

export const LatestProducts = memo(function LatestProducts({ products, onView }: LatestProductsProps) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {products.map((product, index) => {
        const image = product.images?.[0];
        const maxStock = 100;
        const stockPct = Math.min(Math.round((product.stock / maxStock) * 100), 100);
        const isLow = product.stock <= 5;
        const isOutOfStock = product.stock === 0;

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={() => onView?.(product)}
            className="rounded-xl bg-muted/20 dark:bg-muted/10 p-2 sm:p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            {/* Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm',
                  product.isActive
                    ? 'bg-emerald-100/90 text-emerald-600'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {product.isActive ? 'نشط' : 'مخفي'}
              </span>
            </div>

            {/* Info */}
            <p className="text-xs font-semibold text-foreground truncate mb-0.5">{product.name}</p>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {product.salePrice ? formatCurrency(product.salePrice) : formatCurrency(product.price)}
              </p>
              {product.orderCount != null && product.orderCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{product.orderCount} طلب</span>
              )}
            </div>

            {/* Stock bar */}
            <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isOutOfStock ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${isOutOfStock ? 100 : stockPct}%`, opacity: isOutOfStock ? 0.5 : 1 }}
              />
            </div>
            <p className={cn(
              'text-[9px] mt-0.5 tabular-nums',
              isOutOfStock ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {isOutOfStock ? 'نفذ' : `${product.stock} متبقي`}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
});

export function LatestProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/20 p-2 sm:p-3 animate-pulse">
          <div className="aspect-square bg-muted rounded-xl mb-2 sm:mb-2.5" />
          <div className="h-3 bg-muted rounded w-3/4 mb-1" />
          <div className="h-2.5 bg-muted/60 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  SECTION WRAPPER
// ============================================================

interface DashboardSectionProps {
  title: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({ title, icon: Icon, action, children, className }: DashboardSectionProps) {
  return (
    <div className={cn('rounded-2xl bg-card border border-border/60 p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {action.label}
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
