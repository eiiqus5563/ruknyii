'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  ShoppingBag,
  Loader2,
  Eye,
  Ban,
  RotateCcw,
  PackageCheck,
  MapPin,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';

// ─── Types ────────────────────────────────────────────────────────
export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  image?: string | null;
  variantId?: string;
  variantAttributes?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  currency: string;
  customerNote?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  estimatedDelivery?: string;
  order_items?: OrderItem[];
  items?: OrderItem[];
  users?: { profile?: { name?: string }; name?: string };
  customer?: { id?: string; email?: string; name?: string; avatar?: string };
  address?: { city?: string; district?: string; street?: string; country?: string };
  addresses?: { city?: string; district?: string; street?: string; country?: string };
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

// ─── Config ───────────────────────────────────────────────────────

export const ORDER_STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  textColor: string;
  dot: string;
}> = {
  PENDING: { label: 'معلق', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'مؤكد', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  PROCESSING: { label: 'قيد التجهيز', icon: Loader2, color: 'text-indigo-500', bg: 'bg-indigo-500/10', textColor: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
  SHIPPED: { label: 'تم الشحن', icon: Truck, color: 'text-violet-500', bg: 'bg-violet-500/10', textColor: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
  OUT_FOR_DELIVERY: { label: 'في الطريق', icon: Package, color: 'text-cyan-500', bg: 'bg-cyan-500/10', textColor: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
  DELIVERED: { label: 'تم التوصيل', icon: PackageCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'ملغي', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', textColor: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  REFUNDED: { label: 'مسترجع', icon: RotateCcw, color: 'text-muted-foreground', bg: 'bg-muted', textColor: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

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
  return new Date(dateString).toLocaleDateString('ar-IQ');
}

// ─── Status Badge ─────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium',
      config.bg,
      config.textColor,
    )}>
      <span className={cn('h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  onView?: (order: Order) => void;
  onUpdateStatus?: (order: Order) => void;
  onCancel?: (order: Order) => void;
}

function OrderCardComponent({
  order,
  onView,
  onUpdateStatus,
  onCancel,
}: OrderCardProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const items = order.order_items || order.items || [];
  const customerName = order.customer?.name || order.users?.profile?.name || order.users?.name || (order.phoneNumber ? `زائر (${order.phoneNumber})` : 'زائر');
  const itemsCount = items.length;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
  const isFinal = ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="bg-muted/30 dark:bg-muted/20 border rounded-2xl group cursor-pointer hover:bg-muted/40 dark:hover:bg-muted/30 transition-all duration-200 overflow-hidden"
      onClick={() => onView?.(order)}
    >
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Row 1: Status Icon + Order # + Time | Status Badge + Menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              config.bg,
            )}>
              <StatusIcon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-foreground truncate block">
                #{order.orderNumber}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {formatTimeAgo(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <OrderStatusBadge status={order.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    'opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100',
                    'transition-all duration-200',
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="min-w-[140px] rounded-xl p-1"
                onClick={(e) => e.stopPropagation()}
              >
                {onView && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(order); }}>
                    <Eye className="w-3.5 h-3.5" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                )}
                {onUpdateStatus && !isFinal && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(order); }}>
                    <Truck className="w-3.5 h-3.5" />
                    تحديث الحالة
                  </DropdownMenuItem>
                )}
                {onCancel && canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => { e.stopPropagation(); setCancelOpen(true); }}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      إلغاء الطلب
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Customer + Total */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{customerName}</p>
              {order.phoneNumber && (
                <p className="text-[10px] text-muted-foreground/70 truncate" dir="ltr">{order.phoneNumber}</p>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">
            {formatCurrency(order.total, order.currency)}
          </span>
        </div>

        {/* Row 3: Items */}
        {items.length > 0 && (
          <div className="space-y-1.5">
            {items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-card px-2.5 py-2">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted/40 shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{item.productName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <>
                        <span className="w-px h-2.5 bg-border/30" />
                        {Object.entries(item.variantAttributes).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-medium text-primary/80">
                            {v}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length > 2 && (
              <p className="text-[10px] text-muted-foreground/60 px-1">
                +{items.length - 2} منتجات أخرى
              </p>
            )}
          </div>
        )}

        {/* Row 4: Footer */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-border/15 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" />
            {itemsCount} منتج
          </span>
          <span className="w-px h-3 bg-border/30" />
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {(order.address?.city || order.addresses?.city) ? (
              <>
                {order.address?.city || order.addresses?.city}
                {(order.address?.district || order.addresses?.district) && (
                  <span className="text-muted-foreground/50"> - {order.address?.district || order.addresses?.district}</span>
                )}
              </>
            ) : 'غير محدد'}
          </span>
          {order.discount > 0 && (
            <>
              <span className="w-px h-3 bg-border/30" />
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                خصم {formatCurrency(order.discount, order.currency)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {onCancel && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent
            showCloseButton={false}
            onClick={(e) => e.stopPropagation()}
            className="text-center"
          >
            <DialogHeader className="items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle>إلغاء الطلب</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من إلغاء الطلب #{order.orderNumber}؟
                <br />
                لا يمكن التراجع عن هذا الإجراء
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:justify-center">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">تراجع</Button>
              </DialogClose>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelOpen(false);
                  onCancel(order);
                }}
              >
                إلغاء الطلب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────

export function OrderCardSkeleton() {
  return (
    <div className="bg-muted/30 dark:bg-muted/20 rounded-2xl animate-pulse overflow-hidden">
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-muted/60" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-muted/60 rounded" />
              <div className="h-2.5 w-14 bg-muted/40 rounded" />
            </div>
          </div>
          <div className="h-5 w-14 bg-muted/40 rounded-full" />
        </div>
        {/* Customer */}
        <div className="rounded-xl bg-card px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted/60" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted/60 rounded" />
              <div className="h-2 w-16 bg-muted/40 rounded" />
            </div>
            <div className="h-4 w-16 bg-muted/60 rounded" />
          </div>
        </div>
        {/* Items */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-card px-2.5 py-2">
            <div className="w-9 h-9 rounded-lg bg-muted/50" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted/50 rounded w-3/4" />
              <div className="h-2 bg-muted/30 rounded w-1/3" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-card px-2.5 py-2">
            <div className="w-9 h-9 rounded-lg bg-muted/50" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted/50 rounded w-2/3" />
              <div className="h-2 bg-muted/30 rounded w-1/4" />
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-border/15">
          <div className="h-3 w-14 bg-muted/40 rounded" />
          <div className="w-px h-3 bg-muted/30" />
          <div className="h-3 w-20 bg-muted/40 rounded" />
        </div>
      </div>
    </div>
  );
}

export function OrdersGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

export const OrderCard = memo(OrderCardComponent);
