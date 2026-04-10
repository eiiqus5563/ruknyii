'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Eye,
  EyeOff,
  Layers,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Box,
} from 'lucide-react';
import { Product } from '@/lib/hooks/useStore';
import { formatCurrency } from '@/lib/currency';
import { ORDER_STATUS_CONFIG } from './OrderCard';
import type { Order } from './OrderCard';
import { API_URL } from '@/lib/config';
import { AuthClient } from '@/lib/auth/auth-client';

// ─── Types ──────────────────────────────────────────────────────
interface ProductDetailsDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onToggleStatus?: (product: Product) => void;
}

interface ProductOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  quantity: number;
  customerName?: string;
}

interface ProductStats {
  totalOrders: number;
  totalRevenue: number;
  totalQuantitySold: number;
}

// ─── Helpers ────────────────────────────────────────────────────
function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return fmtDate(dateStr);
}

function safeCurrency(amount: unknown, currency = 'IQD') {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  return formatCurrency(Number.isFinite(n) ? n : 0, currency);
}

// ─── Component ──────────────────────────────────────────────────
export function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleStatus,
}: ProductDetailsDialogProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalQuantitySold: 0,
  });
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Reset on product change
  useEffect(() => {
    setImageIndex(0);
    setOrders([]);
    setStats({ totalOrders: 0, totalRevenue: 0, totalQuantitySold: 0 });
  }, [product?.id]);

  // Fetch orders related to this product
  const fetchProductOrders = useCallback(async () => {
    if (!product) return;
    setLoadingOrders(true);
    try {
      let token = AuthClient.getToken();
      if (!token) {
        const refreshed = await AuthClient.refreshTokens();
        if (refreshed) token = AuthClient.getToken();
      }
      if (!token) return;

      const res = await fetch(`${API_URL}/orders/store`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const allOrders: Order[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      // Filter orders containing this product
      const productOrders: ProductOrder[] = [];
      let totalRevenue = 0;
      let totalQuantitySold = 0;

      for (const order of allOrders) {
        const items = order.order_items || order.items || [];
        const matchingItems = items.filter(
          (item: any) =>
            item.productId === product.id ||
            item.product_id === product.id ||
            item.productName === product.name,
        );

        if (matchingItems.length > 0) {
          const qty = matchingItems.reduce(
            (sum: number, item: any) => sum + (item.quantity || 1),
            0,
          );
          const revenue = matchingItems.reduce(
            (sum: number, item: any) =>
              sum + (item.price || 0) * (item.quantity || 1),
            0,
          );

          totalQuantitySold += qty;
          totalRevenue += revenue;

          productOrders.push({
            id: order.id,
            orderNumber: order.orderNumber || order.id.slice(0, 8),
            status: order.status,
            total: revenue,
            currency: order.currency || 'IQD',
            createdAt: order.createdAt,
            quantity: qty,
            customerName:
              order.users?.profile?.name || order.users?.name || undefined,
          });
        }
      }

      // Sort by newest first
      productOrders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setOrders(productOrders);
      setStats({
        totalOrders: productOrders.length,
        totalRevenue,
        totalQuantitySold,
      });
    } catch {
      // silently fail
    } finally {
      setLoadingOrders(false);
    }
  }, [product]);

  useEffect(() => {
    if (open && product) fetchProductOrders();
  }, [open, product, fetchProductOrders]);

  const images = useMemo(() => product?.images ?? [], [product?.images]);
  const hasMultipleImages = images.length > 1;

  const nextImage = useCallback(
    () => setImageIndex((i) => (i + 1) % images.length),
    [images.length],
  );
  const prevImage = useCallback(
    () => setImageIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );

  if (!product) return null;

  const price = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice as unknown as string)
      : Number(product.compareAtPrice)
    : 0;
  const safeCompare = Number.isFinite(compareAt) ? compareAt : 0;
  const hasDiscount = safeCompare > safePrice && safeCompare > 0;
  const discountPercent = hasDiscount
    ? Math.round(((safeCompare - safePrice) / safeCompare) * 100)
    : 0;
  const stock = Number(product.stock) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="max-w-[calc(100%-1rem)] sm:max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0"
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 z-50 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm text-muted-foreground flex items-center justify-center hover:bg-background transition-colors shadow-sm text-sm font-medium"
        >
          ✕
        </button>

        <div className="flex flex-col sm:flex-row max-h-[85vh] overflow-hidden">
          {/* ─── Image Section (hidden on mobile, shown on sm+) ─── */}
          <div className="hidden sm:block sm:w-[55%] shrink-0 p-3">
            <div className="relative w-full h-full bg-muted/30 overflow-hidden rounded-2xl">
            {images.length > 0 ? (
              <>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={imageIndex}
                    src={images[imageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>

                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Image counter */}
                {images.length > 1 && (
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
                    {imageIndex + 1}/{images.length}
                  </span>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <Package className="w-16 h-16 text-muted-foreground/15" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md bg-black/40 text-white">
                {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {product.isActive ? 'نشط' : 'مسودة'}
              </span>
            </div>

            {hasDiscount && (
              <span className="absolute top-2.5 left-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-white backdrop-blur-md">
                -{discountPercent}%
              </span>
            )}

            </div>
          </div>

          {/* ─── Info Section ─────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Mobile image (shown only on mobile) */}
              <div className="sm:hidden p-3 pb-0">
                <div className="relative w-full aspect-[4/3] bg-muted/30 overflow-hidden rounded-2xl">
                  {images.length > 0 ? (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={`m-${imageIndex}`}
                          src={images[imageIndex]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      </AnimatePresence>
                      {hasMultipleImages && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setImageIndex(i)}
                              className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                            />
                          ))}
                        </div>
                      )}
                      {images.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
                          {imageIndex + 1}/{images.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <Package className="w-12 h-12 text-muted-foreground/15" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
              {/* Thumbnail + Name */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted/50 shrink-0 border border-border/30">
                  {images[0] ? (
                    <img src={images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-foreground leading-snug">{product.name}</h2>
                  {product.category && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <Layers className="w-3 h-3" />
                      {product.category.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {safeCurrency(safePrice)}
                </p>
                {hasDiscount && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground line-through tabular-nums">
                      {safeCurrency(safeCompare)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                      -{discountPercent}%
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/60 text-[11px] font-medium text-muted-foreground">
                  {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {product.isActive ? 'نشط' : 'مسودة'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/60 text-[11px] font-medium text-muted-foreground">
                  <Box className="w-3 h-3" />
                  {stock > 0 ? `${fmtNum(stock)} متوفر` : 'نفد المخزون'}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <>
                  <div className="border-t border-border/40" />
                  <div>
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                      <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      الوصف
                    </h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                </>
              )}

            {/* ─── Stats Row ─────────────────────────────── */}
            <div className="border-t border-border/40" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: ShoppingCart, value: stats.totalOrders, label: 'طلب' },
                { icon: TrendingUp, value: stats.totalRevenue, label: 'IQD', isCurrency: true },
                { icon: Package, value: stats.totalQuantitySold, label: 'مبيعات' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  className="rounded-xl bg-muted/40 p-2.5 text-center"
                >
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {loadingOrders ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-muted-foreground" />
                    ) : stat.isCurrency ? (
                      fmtNum(stat.value)
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* ─── Details Grid ──────────────────────────── */}
            <div className="rounded-xl border border-border/50 divide-y divide-border/50">
              {[
                { label: 'الحالة', value: product.isActive ? 'نشط' : 'مخفي' },
                { label: 'المخزون', value: `${fmtNum(stock)} قطعة` },
                { label: 'السعر', value: safeCurrency(safePrice) },
                ...(hasDiscount ? [{ label: 'قبل الخصم', value: safeCurrency(safeCompare), strike: true }] : []),
                { label: 'تاريخ الإنشاء', value: fmtDate(product.createdAt) },
                { label: 'آخر تحديث', value: timeAgo(product.updatedAt) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span
                    className={`text-[11px] font-medium tabular-nums ${
                      (row as any).strike ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* ─── Recent Orders ──────────────────────────── */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 px-0.5">
                <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                آخر الطلبات
              </h3>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 py-6 text-center">
                  <ShoppingCart className="w-8 h-8 text-muted-foreground/15 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">لا توجد طلبات لهذا المنتج</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto [&::-webkit-scrollbar]:hidden rounded-xl border border-border/50 p-1.5">
                  {orders.slice(0, 10).map((order, i) => {
                    const sc =
                      ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] ||
                      ORDER_STATUS_CONFIG.PENDING;

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-muted">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate">
                              #{order.orderNumber}
                              {order.customerName && (
                                <span className="text-muted-foreground font-normal mr-1">
                                  · {order.customerName}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              {timeAgo(order.createdAt)}
                              <span className="opacity-40">·</span>
                              {order.quantity} قطعة
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground">
                            {sc.label}
                          </span>
                          <span className="text-[10px] font-bold text-foreground tabular-nums">
                            {safeCurrency(order.total, order.currency)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
            </div>

          {/* ─── Actions Bar ──────────────────────── */}
          <div className="border-t border-border/50 p-3 flex items-center gap-2 bg-background shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => { onOpenChange(false); onEdit(product); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                تحرير المنتج
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => { onOpenChange(false); onDelete(product); }}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
