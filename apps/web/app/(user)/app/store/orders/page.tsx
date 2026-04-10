'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  TableProperties,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Package,
} from 'lucide-react';
import {
  OrderCard,
  OrdersGridSkeleton,
  ORDER_STATUS_CONFIG,
  OrderDetailsDialog,
  StatusUpdateDialog,
  OrderInvoiceDialog,
} from '@/components/(app)/store';
import { OrdersTable } from '@/components/(app)/store/OrdersTable';
import type { Order, OrderStatus } from '@/components/(app)/store';
import { api } from '@/lib/api';
import { toast } from '@/components/toast-provider';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

// ─── Constants ────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'PENDING', label: 'معلق', icon: Clock },
  { value: 'CONFIRMED', label: 'مؤكد', icon: CheckCircle },
  { value: 'PROCESSING', label: 'قيد التجهيز', icon: Package },
  { value: 'SHIPPED', label: 'تم الشحن' },
  { value: 'OUT_FOR_DELIVERY', label: 'في الطريق' },
  { value: 'DELIVERED', label: 'تم التوصيل', icon: CheckCircle },
  { value: 'CANCELLED', label: 'ملغي', icon: XCircle },
  { value: 'REFUNDED', label: 'مسترجع' },
];

// ─── Export Helpers ───────────────────────────────────────────────

function getStatusLabel(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.label || status;
}

function formatDateExport(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function exportToCSV(orders: Order[], filename: string) {
  const BOM = '\uFEFF';
  const headers = [
    'رقم الطلب', 'العميل', 'الهاتف', 'الحالة', 'المنتجات',
    'المجموع الفرعي', 'التوصيل', 'الخصم', 'الإجمالي', 'العملة',
    'المحافظة', 'الحي', 'تاريخ الطلب', 'ملاحظة العميل',
  ];

  const rows = orders.map((o) => {
    const items = o.order_items || o.items || [];
    const customerName = o.customer?.name || o.users?.profile?.name || o.users?.name || 'زائر';
    const address = o.address || o.addresses;
    const products = items.map((i) => `${i.productName} ×${i.quantity}`).join(' | ');
    return [
      o.orderNumber, customerName, o.phoneNumber || '', getStatusLabel(o.status), products,
      o.subtotal, o.shippingFee || 0, o.discount || 0, o.total, o.currency || 'IQD',
      address?.city || '', address?.district || '', formatDateExport(o.createdAt), o.customerNote || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = BOM + [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
}

function exportToExcel(orders: Order[], filename: string) {
  const rows = orders.map((o) => {
    const orderItems = o.order_items || o.items || [];
    const customerName = o.customer?.name || o.users?.profile?.name || o.users?.name || 'زائر';
    const address = o.address || o.addresses;
    const products = orderItems.map((i) => {
      let name = i.productName;
      if (i.variantAttributes) {
        const attrs = Object.entries(i.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ');
        name += ` (${attrs})`;
      }
      return `${name} ×${i.quantity}`;
    }).join(' | ');
    return `<tr>
      <td>${o.orderNumber}</td><td>${customerName}</td>
      <td style="mso-number-format:'\\@'">${o.phoneNumber || ''}</td>
      <td>${getStatusLabel(o.status)}</td><td>${products}</td>
      <td style="mso-number-format:'#\\,##0'">${o.subtotal}</td>
      <td style="mso-number-format:'#\\,##0'">${o.shippingFee || 0}</td>
      <td style="mso-number-format:'#\\,##0'">${o.discount || 0}</td>
      <td style="mso-number-format:'#\\,##0'">${o.total}</td>
      <td>${o.currency || 'IQD'}</td>
      <td>${address?.city || ''}</td><td>${address?.district || ''}</td>
      <td>${formatDateExport(o.createdAt)}</td><td>${o.customerNote || ''}</td>
    </tr>`;
  }).join('\n');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>td,th{padding:6px 10px;border:1px solid #ddd;text-align:right;font-family:Tahoma,Arial}th{background:#f5f5f5;font-weight:bold}</style></head>
<body dir="rtl"><table><thead><tr>
  <th>رقم الطلب</th><th>العميل</th><th>الهاتف</th><th>الحالة</th><th>المنتجات</th>
  <th>المجموع الفرعي</th><th>التوصيل</th><th>الخصم</th><th>الإجمالي</th><th>العملة</th>
  <th>المحافظة</th><th>الحي</th><th>تاريخ الطلب</th><th>ملاحظة العميل</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`;

  downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusDialogOrder, setStatusDialogOrder] = useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportMenuOpen]);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await api.get<{ orders: Order[]; total: number } | Order[]>(
        '/orders/store',
      );

      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any).orders ?? [];
      setOrders(list);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل الطلبات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Status filter (client-side)
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.users?.profile?.name?.toLowerCase().includes(q) ||
          o.phoneNumber?.includes(q) ||
          (o.order_items || o.items)?.some((i) => i.productName?.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [orders, statusFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const processing = orders.filter((o) =>
      ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status),
    ).length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    const revenue = orders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const currency = orders[0]?.currency || 'IQD';
    const completionRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    return { total, pending, processing, delivered, cancelled, revenue, currency, completionRate };
  }, [orders]);

  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  }, []);

  const handleUpdateStatus = useCallback((order: Order) => {
    setStatusDialogOrder(order);
    setStatusDialogOpen(true);
  }, []);

  const handleConfirmStatusUpdate = useCallback(
    async (order: Order, newStatus: string) => {
      setIsStatusUpdating(true);
      try {
        if (newStatus === 'CANCELLED') {
          await api.put(`/orders/${order.id}/cancel`, {
            cancellationReason: 'تم الإلغاء بواسطة البائع',
          });
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : o,
            ),
          );
        } else {
          await api.put(`/orders/${order.id}/status`, { status: newStatus });
          setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)),
          );
        }
        const config = ORDER_STATUS_CONFIG[newStatus];
        toast.success(`تم تحديث الطلب إلى: ${config?.label || newStatus}`);
        setStatusDialogOpen(false);
        setStatusDialogOrder(null);
      } catch {
        toast.error('فشل تحديث حالة الطلب');
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [],
  );

  const handlePrintInvoice = useCallback((order: Order) => {
    setInvoiceOrder(order);
    setInvoiceOpen(true);
    setDetailsOpen(false);
  }, []);

  const handleCancelOrder = useCallback(
    async (order: Order) => {
      try {
        await api.put(`/orders/${order.id}/cancel`, {
          cancellationReason: 'تم الإلغاء بواسطة البائع',
        });
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : o,
          ),
        );
        toast.success('تم إلغاء الطلب');
      } catch {
        toast.error('فشل إلغاء الطلب');
      }
    },
    [],
  );

  const handleExport = useCallback(
    (format: 'csv' | 'excel') => {
      const data = filteredOrders.length > 0 ? filteredOrders : orders;
      if (data.length === 0) {
        toast.error('لا توجد طلبات للتصدير');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const filterLabel = statusFilter !== 'all' ? `_${statusFilter}` : '';
      const filename = `orders${filterLabel}_${date}`;

      if (format === 'csv') {
        exportToCSV(data, filename);
      } else {
        exportToExcel(data, filename);
      }
      toast.success(`تم تصدير ${data.length} طلب`);
      setExportMenuOpen(false);
    },
    [filteredOrders, orders, statusFilter],
  );

  return (
    <div dir="rtl" className="space-y-3 sm:space-y-4 mt-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-foreground">الطلبات</h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Export Button */}
          {orders.length > 0 && (
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className={cn(
                  'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all',
                  'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  exportMenuOpen && 'bg-muted/50 text-foreground',
                )}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تصدير</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', exportMenuOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {exportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute end-0 top-full mt-1.5 z-[120] w-48 bg-card rounded-xl shadow-xl border border-border/30 overflow-hidden"
                  >
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => handleExport('excel')}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <div className="text-right">
                          <p className="font-medium">Excel</p>
                          <p className="text-[10px] text-muted-foreground">ملف .xls للمحاسبة</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <div className="text-right">
                          <p className="font-medium">CSV</p>
                          <p className="text-[10px] text-muted-foreground">نص بسيط للاستيراد</p>
                        </div>
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            aria-label="تحديث"
            className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      {!isLoading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {/* Total Orders */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-3 sm:p-5 bg-primary/10 dark:bg-primary/5"
          >
            <p className="text-[11px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">إجمالي الطلبات</p>
            <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-0.5 sm:mb-1">
              {stats.total}
            </h3>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-500">
                {stats.pending > 0 ? `${stats.pending} جديد` : 'لا يوجد معلق'}
              </span>
            </div>
          </motion.div>

          {/* Processing */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-2xl p-3 sm:p-5 bg-muted/30 dark:bg-muted/20"
          >
            <p className="text-[11px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">قيد التنفيذ</p>
            <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-0.5 sm:mb-1">
              {stats.processing}
            </h3>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-500">نشط</span>
            </div>
          </motion.div>

          {/* Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl p-3 sm:p-5 bg-primary/10 dark:bg-primary/5"
          >
            <p className="text-[11px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">الإيرادات</p>
            <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-0.5 sm:mb-1">
              {formatCurrency(stats.revenue, stats.currency)}
            </h3>
            <div className="flex items-center gap-1.5">
              {stats.completionRate > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">{stats.completionRate}% اكتمال</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-medium text-rose-500">+0%</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Cancelled */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className={cn(
              'rounded-2xl p-3 sm:p-5',
              stats.cancelled > 0 ? 'bg-rose-500/10 dark:bg-rose-500/5' : 'bg-muted/30 dark:bg-muted/20',
            )}
          >
            <p className="text-[11px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">ملغي / مسترجع</p>
            <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-0.5 sm:mb-1">
              {stats.cancelled}
            </h3>
            <div className="flex items-center gap-1.5">
              {stats.cancelled > 0 && stats.total > 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-medium text-rose-500">{Math.round((stats.cancelled / stats.total) * 100)}%</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">جيد</span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Error ─── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="shrink-0 rounded-xl px-3.5 py-1.5 text-[13px] font-medium bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            إعادة المحاولة
          </button>
        </motion.div>
      )}

      {/* ─── Search & Filters ─── */}
      {!isLoading && orders.length > 0 && (
        <div className="space-y-3">
          {/* Search + View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم الطلب، اسم العميل، المنتج..."
                className="w-full h-10 sm:h-11 pr-10 pl-9 rounded-xl bg-muted/30 text-[13px] sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* View Toggle - Desktop */}
            <div className="hidden sm:flex items-center gap-0.5 bg-muted/30 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                title="عرض بطاقات"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                title="عرض جدول"
              >
                <TableProperties className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Pills */}
          <div className="-mx-1 px-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-1.5 sm:gap-2 w-max sm:w-auto sm:flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const count = f.value === 'all' ? orders.length : orders.filter((o) => o.status === f.value).length;
                if (f.value !== 'all' && count === 0) return null;
                return (
                  <motion.button
                    key={f.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStatusFilter(f.value)}
                    className={cn(
                      'h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all duration-200 select-none whitespace-nowrap flex items-center gap-1.5',
                      statusFilter === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 dark:bg-muted/20 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                    <span className={cn(
                      'text-[10px] sm:text-[11px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1',
                      statusFilter === f.value ? 'bg-primary-foreground/20' : 'bg-muted/60',
                    )}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Content ─── */}
      {isLoading ? (
        <OrdersGridSkeleton count={6} />
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/60 p-10 sm:p-14 text-center"
        >
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-muted/50 mx-auto mb-4">
            <ShoppingBag className="w-7 h-7 sm:w-9 sm:h-9 text-muted-foreground/30" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">لا توجد طلبات بعد</h3>
          <p className="text-[13px] sm:text-sm text-muted-foreground max-w-xs mx-auto">
            عند استلام أي طلب جديد سيظهر هنا مع جميع التفاصيل
          </p>
        </motion.div>
      ) : filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/60 p-8 sm:p-10 text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-3">
            <Search className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">لا توجد نتائج</h3>
          <p className="text-[13px] sm:text-sm text-muted-foreground mb-3">جرب تغيير معايير البحث أو التصفية</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="text-[13px] text-primary hover:underline font-medium"
          >
            إعادة تعيين الفلاتر
          </button>
        </motion.div>
      ) : (
        <>
          {/* Result count bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] sm:text-sm font-bold text-foreground">
                {statusFilter !== 'all' ? `طلبات ${getStatusLabel(statusFilter)}` : 'جميع الطلبات'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-semibold tabular-nums">
                {filteredOrders.length}
              </span>
            </div>

            {/* Mobile view toggle */}
            <div className="flex sm:hidden items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                )}
              >
                <TableProperties className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cards view */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2  lg:grid-cols-3 gap-2.5 sm:gap-3">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={handleViewOrder}
                    onUpdateStatus={handleUpdateStatus}
                    onCancel={handleCancelOrder}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <OrdersTable
              orders={filteredOrders}
              onView={handleViewOrder}
              onUpdateStatus={handleUpdateStatus}
              onCancel={handleCancelOrder}
            />
          )}
        </>
      )}

      {/* ─── Dialogs ─── */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdateStatus={handleUpdateStatus}
        onCancel={handleCancelOrder}
        onPrintInvoice={handlePrintInvoice}
      />

      <StatusUpdateDialog
        order={statusDialogOrder}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onConfirm={handleConfirmStatusUpdate}
        isUpdating={isStatusUpdating}
      />

      <OrderInvoiceDialog
        order={invoiceOrder}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  );
}

// ─── Status Distribution ──────────────────────────────────────────

function StatusDistribution({ orders }: { orders: Order[] }) {
  const total = orders.length;
  const statuses = [
    { key: 'PENDING', label: 'معلق', color: '#f59e0b', count: orders.filter(o => o.status === 'PENDING').length },
    { key: 'CONFIRMED', label: 'مؤكد', color: '#3b82f6', count: orders.filter(o => o.status === 'CONFIRMED').length },
    { key: 'PROCESSING', label: 'قيد التجهيز', color: '#6366f1', count: orders.filter(o => o.status === 'PROCESSING').length },
    { key: 'SHIPPED', label: 'تم الشحن', color: '#8b5cf6', count: orders.filter(o => o.status === 'SHIPPED').length },
    { key: 'OUT_FOR_DELIVERY', label: 'في الطريق', color: '#06b6d4', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length },
    { key: 'DELIVERED', label: 'مكتمل', color: '#10b981', count: orders.filter(o => o.status === 'DELIVERED').length },
    { key: 'CANCELLED', label: 'ملغي', color: '#ef4444', count: orders.filter(o => o.status === 'CANCELLED').length },
    { key: 'REFUNDED', label: 'مسترجع', color: '#6b7280', count: orders.filter(o => o.status === 'REFUNDED').length },
  ].filter(s => s.count > 0);

  if (total === 0 || statuses.length <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl sm:rounded-3xl bg-muted/30 p-4"
    >
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/40 mb-3">
        {statuses.map((s) => (
          <motion.div
            key={s.key}
            initial={{ width: 0 }}
            animate={{ width: `${(s.count / total) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ backgroundColor: s.color }}
            className="first:rounded-r-full last:rounded-l-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {statuses.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-muted-foreground">
              {s.label}{' '}
              <span className="font-semibold text-foreground tabular-nums">{s.count}</span>
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
