'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  Loader2,
  Truck,
  Package,
  PackageCheck,
  XCircle,
  RotateCcw,
  User,
  MapPin,
  Phone,
  ShoppingBag,
  Ban,
  Calendar,
  Printer,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import type { Order } from './OrderCard';
import { ORDER_STATUS_CONFIG } from './OrderCard';

// ─── Status Progress ─────────────────────────────────────────────

const STATUS_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

const STATUS_FLOW_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  PENDING: { label: 'معلق', icon: Clock },
  CONFIRMED: { label: 'مؤكد', icon: CheckCircle2 },
  PROCESSING: { label: 'تجهيز', icon: Loader2 },
  SHIPPED: { label: 'شحن', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'الطريق', icon: Package },
  DELIVERED: { label: 'تم', icon: PackageCheck },
};

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Section Header ──────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/8">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <span className="text-[11px] font-bold text-foreground/80 tracking-wide">{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onPrintInvoice?: (order: Order) => void;
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
  onCancel,
  onPrintInvoice,
}: OrderDetailsDialogProps) {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  // Collect all product images from order items
  const items = useMemo(() => order?.order_items || order?.items || [], [order]);
  const selectedItem = items[selectedItemIndex] || null;
  const selectedImage = selectedItem ? (selectedItem as any).image : null;

  if (!order) return null;

  const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
  const customerName = order.customer?.name || order.users?.profile?.name || order.users?.name || (order.phoneNumber ? `زائر (${order.phoneNumber})` : 'زائر');
  const address = order.address || order.addresses;
  const isFinal = ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isRefunded = order.status === 'REFUNDED';
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
  const showActions = !isFinal || (canCancel && onCancel);

  const currentStepIndex = isCancelled || isRefunded
    ? -1
    : STATUS_FLOW.indexOf(order.status as any);

  const handleCopyPhone = () => {
    if (order.phoneNumber) {
      navigator.clipboard.writeText(order.phoneNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setCancelConfirm(false); setSelectedItemIndex(0); setImageIndex(0); }}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="max-w-[calc(100%-1rem)] sm:max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0"
      >
        <DialogTitle className="sr-only">طلب #{order.orderNumber}</DialogTitle>

        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 z-50 w-8 h-8 rounded-full bg-background/90 dark:bg-background/60 backdrop-blur-sm text-muted-foreground flex items-center justify-center hover:bg-background dark:hover:bg-background/80 transition-colors shadow-sm text-sm font-medium"
        >
          ✕
        </button>

        <div className="flex flex-col sm:flex-row max-h-[85vh] overflow-hidden">

          {/* ─── Image Section (desktop: right side) ─── */}
          <div className="hidden sm:flex sm:w-[38%] shrink-0 p-3 items-start">
            <div className="relative w-full aspect-square bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl">
              {selectedImage ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={`${selectedItemIndex}-${imageIndex}`}
                      src={selectedImage}
                      alt={selectedItem?.productName || ''}
                      className="w-full h-full object-contain"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </AnimatePresence>

                  {/* Product navigation arrows */}
                  {items.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIndex((i) => (i - 1 + items.length) % items.length)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIndex((i) => (i + 1) % items.length)}
                        className="absolute top-1/2 left-2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Product name overlay */}
                  <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10">
                    <p className="text-white font-bold text-sm line-clamp-2">{selectedItem?.productName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-white/90 text-xs font-semibold tabular-nums">
                        {formatCurrency((selectedItem?.price || 0) * (selectedItem?.quantity || 1), order.currency)}
                      </span>
                      <span className="text-white/50 text-[10px]">×{selectedItem?.quantity}</span>
                    </div>
                  </div>

                  {/* Image counter */}
                  {items.length > 1 && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
                      {selectedItemIndex + 1}/{items.length}
                    </span>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                  <Package className="w-16 h-16 text-muted-foreground/15" />
                </div>
              )}

              {/* Status badge overlay */}
              <div className="absolute top-2.5 right-2.5">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md bg-black/40 text-white',
                )}>
                  {(() => { const Icon = config.icon; return <Icon className="w-3 h-3" />; })()}
                  {config.label}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Info Section ─── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

              {/* Mobile image (shown only on mobile) */}
              <div className="sm:hidden p-3 pb-0">
                <div className="relative w-full aspect-[4/3] bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl">
                  {selectedImage ? (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={`m-${selectedItemIndex}`}
                          src={selectedImage}
                          alt={selectedItem?.productName || ''}
                          className="w-full h-full object-contain"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      </AnimatePresence>
                      {items.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedItemIndex((i) => (i - 1 + items.length) % items.length)}
                            className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedItemIndex((i) => (i + 1) % items.length)}
                            className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
                            {selectedItemIndex + 1}/{items.length}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/15" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">

                {/* ─── Header: Order # + Status + Print ─── */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    config.bg,
                  )}>
                    {(() => { const Icon = config.icon; return <Icon className={cn('h-5 w-5', config.color)} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-foreground tracking-tight">
                        #{order.orderNumber}
                      </h2>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold',
                        config.bg,
                        config.textColor,
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  {onPrintInvoice && (
                    <button
                      type="button"
                      onClick={() => onPrintInvoice(order)}
                      className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="طباعة الفاتورة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* ─── Progress Timeline ─── */}
                {!isCancelled && !isRefunded && (
                  <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-3.5">
                    <div className="relative mb-2.5">
                      <div className="h-1 rounded-full bg-muted/50" />
                      <div
                        className="absolute top-0 right-0 h-1 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.max(((currentStepIndex) / (STATUS_FLOW.length - 1)) * 100, 3)}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      {STATUS_FLOW.map((step, i) => {
                        const stepConfig = STATUS_FLOW_CONFIG[step];
                        const StepIcon = stepConfig.icon;
                        const isCompleted = i <= currentStepIndex;
                        const isCurrent = i === currentStepIndex;
                        return (
                          <div key={step} className="flex flex-col items-center gap-1" style={{ width: `${100 / STATUS_FLOW.length}%` }}>
                            <div className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full transition-all',
                              isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground/40',
                              isCurrent && 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background',
                            )}>
                              <StepIcon className="h-3 w-3" />
                            </div>
                            <span className={cn(
                              'text-[8px] font-semibold leading-none',
                              isCompleted ? 'text-foreground' : 'text-muted-foreground/35',
                            )}>
                              {stepConfig.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Cancelled / Refunded ─── */}
                {(isCancelled || isRefunded) && (
                  <div className={cn(
                    'rounded-2xl p-3.5 flex items-center gap-3',
                    isCancelled ? 'bg-rose-500/8' : 'bg-muted/30',
                  )}>
                    {isCancelled
                      ? <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                      : <RotateCcw className="h-5 w-5 text-muted-foreground shrink-0" />
                    }
                    <div>
                      <p className={cn(
                        'text-sm font-semibold',
                        isCancelled ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                      )}>
                        {isCancelled ? 'تم إلغاء الطلب' : 'تم استرجاع الطلب'}
                      </p>
                      {order.cancelledAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(order.cancelledAt)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── Order Items ─── */}
                <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-4">
                  <SectionHeader icon={ShoppingBag} label={`المنتجات (${items.length})`} />
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map((item, i) => {
                        const variantAttrs = (item as any).variantAttributes as Record<string, string> | undefined;
                        const hasImage = !!(item as any).image;
                        const isSelected = selectedItemIndex === i;
                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-3 p-2.5 rounded-xl bg-card cursor-pointer transition-all',
                              isSelected ? 'ring-2 ring-primary/30 shadow-sm' : 'hover:bg-card/80',
                            )}
                            onClick={() => setSelectedItemIndex(i)}
                          >
                            <div className={cn(
                              'w-12 h-12 rounded-lg overflow-hidden bg-muted/40 shrink-0 border-2 transition-colors',
                              isSelected ? 'border-primary/40' : 'border-transparent',
                            )}>
                              {hasImage ? (
                                <img src={(item as any).image} alt={item.productName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground line-clamp-1">
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="inline-flex items-center text-[10px] font-semibold bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-md">
                                  الكمية: {item.quantity}
                                </span>
                                {variantAttrs && Object.entries(variantAttrs).map(([k, v]) => (
                                  <span key={k} className="inline-flex items-center text-[10px] font-medium bg-primary/8 text-primary px-1.5 py-0.5 rounded-md">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <span className="text-[13px] font-bold text-foreground tabular-nums block">
                                {formatCurrency(item.price * item.quantity, order.currency)}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                  {formatCurrency(item.price, order.currency)} / قطعة
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">لا توجد منتجات</p>
                  )}
                </div>

                {/* ─── Price Summary ─── */}
                <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-4">
                  <SectionHeader icon={Receipt} label="ملخص الطلب" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground">المجموع الفرعي</span>
                      <span className="text-foreground tabular-nums font-medium">{formatCurrency(order.subtotal, order.currency)}</span>
                    </div>
                    {Number(order.shippingFee) > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">التوصيل</span>
                        <span className="text-foreground tabular-nums font-medium">{formatCurrency(order.shippingFee, order.currency)}</span>
                      </div>
                    )}
                    {Number(order.discount) > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">الخصم</span>
                        <span className="text-emerald-500 tabular-nums font-semibold">-{formatCurrency(order.discount, order.currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-border/20 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-bold text-foreground">الإجمالي</span>
                        <span className="text-[17px] font-black text-foreground tabular-nums">{formatCurrency(order.total, order.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Customer + Address ─── */}
                <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-4">
                  <SectionHeader icon={User} label="العميل والتوصيل" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground/70">الاسم</span>
                      <span className="text-[13px] font-semibold text-foreground">{customerName}</span>
                    </div>
                    {order.phoneNumber && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">الهاتف</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-foreground" dir="ltr">{order.phoneNumber}</span>
                          <button
                            type="button"
                            onClick={handleCopyPhone}
                            className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                            title="نسخ"
                          >
                            {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {address?.city && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">المحافظة</span>
                        <span className="text-[13px] font-semibold text-foreground">{address.city}</span>
                      </div>
                    )}
                    {address?.district && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">الحي / المنطقة</span>
                        <span className="text-[13px] font-semibold text-foreground">{address.district}</span>
                      </div>
                    )}
                    {address?.street && (
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">الشارع</span>
                        <span className="text-[13px] font-semibold text-foreground">{address.street}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Customer Note ─── */}
                {order.customerNote && (
                  <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-4">
                    <SectionHeader icon={MessageSquare} label="ملاحظة العميل" />
                    <p className="text-[13px] text-foreground leading-relaxed">{order.customerNote}</p>
                  </div>
                )}

                {/* ─── Dates ─── */}
                <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-4">
                  <SectionHeader icon={Calendar} label="التواريخ" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground/70">تاريخ الطلب</span>
                      <span className="text-[12px] font-semibold text-foreground">{formatDate(order.createdAt)}</span>
                    </div>
                    {order.deliveredAt && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">تاريخ التوصيل</span>
                        <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">{formatDate(order.deliveredAt)}</span>
                      </div>
                    )}
                    {order.cancelledAt && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">تاريخ الإلغاء</span>
                        <span className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">{formatDate(order.cancelledAt)}</span>
                      </div>
                    )}
                    {order.estimatedDelivery && !order.deliveredAt && !isCancelled && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground/70">التوصيل المتوقع</span>
                        <span className="text-[12px] font-semibold text-foreground">{formatDate(order.estimatedDelivery)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Sticky Action Bar ─── */}
            {showActions && !isFinal && (
              <div className="shrink-0 border-t border-border/30 bg-background p-3 sm:p-4 flex gap-2.5">
                {onUpdateStatus && !cancelConfirm && (
                  <Button
                    className="flex-1 h-11 rounded-xl font-bold text-[13px]"
                    onClick={() => { onUpdateStatus(order); onOpenChange(false); }}
                  >
                    <Truck className="h-4 w-4 ml-2" />
                    تحديث الحالة
                  </Button>
                )}
                {onCancel && canCancel && !cancelConfirm && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 font-bold"
                    onClick={() => setCancelConfirm(true)}
                  >
                    <Ban className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                )}
                {onCancel && canCancel && cancelConfirm && (
                  <>
                    <Button
                      variant="destructive"
                      className="flex-1 h-11 rounded-xl font-bold text-[13px]"
                      onClick={() => { onCancel(order); onOpenChange(false); setCancelConfirm(false); }}
                    >
                      تأكيد الإلغاء
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-bold"
                      onClick={() => setCancelConfirm(false)}
                    >
                      تراجع
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
