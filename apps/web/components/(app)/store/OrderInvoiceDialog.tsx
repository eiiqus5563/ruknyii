'use client';

import { useRef } from 'react';
import {
  Printer,
  X,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Download,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import type { Order } from './OrderCard';
import { ORDER_STATUS_CONFIG } from './OrderCard';

// ─── Props ────────────────────────────────────────────────────

interface OrderInvoiceDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName?: string;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatVariantLabel(attrs: Record<string, string> | null | undefined): string {
  if (!attrs || typeof attrs !== 'object') return '';
  return Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' · ');
}

// ─── Print Styles ─────────────────────────────────────────────

const PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    padding: 20px;
    direction: rtl;
    max-width: 400px;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice { position: relative; }
  .inv-header {
    text-align: center;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
  }
  .inv-header .store-name { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.3px; margin-bottom: 4px; }
  .inv-header .inv-subtitle { font-size: 11px; color: #6b7280; }
  .inv-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    margin-bottom: 14px;
    background: #f9fafb;
    border-radius: 10px;
    font-size: 11px;
  }
  .inv-meta .meta-item { display: flex; align-items: center; gap: 6px; color: #4b5563; }
  .inv-meta .meta-val { font-weight: 600; color: #111; }
  .inv-section { margin-bottom: 14px; }
  .inv-section-title {
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }
  .inv-customer { font-size: 11px; line-height: 1.8; }
  .inv-customer .cust-name { font-weight: 600; font-size: 12px; color: #111; }
  .inv-customer .cust-detail { color: #6b7280; display: flex; align-items: center; gap: 5px; }
  .inv-items { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; }
  .inv-items thead th {
    text-align: right;
    padding: 8px 6px;
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 2px solid #e5e7eb;
  }
  .inv-items tbody td {
    padding: 10px 6px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  .inv-items tbody tr:last-child td { border-bottom: none; }
  .inv-items .item-name { font-weight: 500; color: #111; }
  .inv-items .item-variant { font-size: 9px; color: #9ca3af; margin-top: 2px; }
  .inv-items .item-qty { text-align: center; color: #6b7280; }
  .inv-items .item-price { text-align: left; font-weight: 600; color: #111; white-space: nowrap; }
  .inv-summary {
    margin-top: 6px;
    padding: 12px 14px;
    background: #f9fafb;
    border-radius: 10px;
  }
  .inv-summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; color: #6b7280; }
  .inv-summary-row .val { color: #111; font-weight: 500; }
  .inv-summary-row.discount .val { color: #059669; }
  .inv-summary-total {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 10px;
    border-top: 2px solid #111;
    font-size: 15px;
    font-weight: 800;
    color: #111;
  }
  .inv-status {
    text-align: center;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #d1d5db;
  }
  .inv-status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .inv-footer {
    text-align: center;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px dashed #d1d5db;
    font-size: 10px;
    color: #9ca3af;
    line-height: 1.6;
  }
  .inv-footer .thanks { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 2px; }
  @media print {
    body { padding: 8px; }
    @page { size: 80mm auto; margin: 4mm; }
    .inv-meta, .inv-summary { background: #f9fafb !important; }
  }
`;

// ─── Status color map for print ──────────────────────────────

const PRINT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
  PROCESSING: { bg: '#e0e7ff', text: '#3730a3' },
  SHIPPED: { bg: '#ede9fe', text: '#5b21b6' },
  OUT_FOR_DELIVERY: { bg: '#cffafe', text: '#155e75' },
  DELIVERED: { bg: '#d1fae5', text: '#065f46' },
  CANCELLED: { bg: '#ffe4e6', text: '#9f1239' },
  REFUNDED: { bg: '#f3f4f6', text: '#374151' },
};

export function OrderInvoiceDialog({
  order,
  open,
  onOpenChange,
  storeName,
}: OrderInvoiceDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
  const items = order.order_items || order.items || [];
  const customerName =
    order.customer?.name ||
    order.users?.profile?.name ||
    order.users?.name ||
    (order.phoneNumber ? `زائر (${order.phoneNumber})` : 'زائر');
  const address = order.address || order.addresses;
  const statusColors = PRINT_STATUS_COLORS[order.status] || PRINT_STATUS_COLORS.PENDING;

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>فاتورة #${order.orderNumber}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] p-0 gap-0 rounded-2xl overflow-hidden"
        dir="rtl"
      >
        {/* ─── Toolbar ─── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-foreground leading-none">فاتورة</h2>
              <p className="text-[10px] text-muted-foreground">#{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 rounded-xl gap-1.5 text-[12px] border-border/40"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Invoice Preview ─── */}
        <div className="max-h-[75vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="p-4 sm:p-5">
            <div
              ref={printRef}
              className="bg-white dark:bg-zinc-950 rounded-2xl p-5 sm:p-6 text-foreground"
            >
              {/* ── Header ── */}
              <div className="inv-header text-center pb-4 border-b-2 border-border/30 mb-4">
                <h1 className="store-name text-xl font-extrabold text-foreground tracking-tight">
                  {storeName || 'المتجر'}
                </h1>
                <p className="inv-subtitle text-[11px] text-muted-foreground mt-1">فاتورة ضريبية مبسطة</p>
              </div>

              {/* ── Meta Bar ── */}
              <div className="inv-meta flex items-center justify-between rounded-xl bg-muted/30 px-3.5 py-2.5 mb-4 text-[11px]">
                <div className="meta-item flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span className="meta-val font-semibold text-foreground">{order.orderNumber}</span>
                </div>
                <div className="meta-item flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span className="meta-val font-semibold text-foreground">{formatDate(order.createdAt)}</span>
                </div>
              </div>

              {/* ── Customer ── */}
              <div className="inv-section mb-4">
                <p className="inv-section-title text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 pb-1.5 border-b border-border/20">
                  العميل
                </p>
                <div className="inv-customer text-[11px] leading-relaxed space-y-1">
                  <p className="cust-name font-semibold text-foreground text-[12px]">{customerName}</p>
                  {order.phoneNumber && (
                    <p className="cust-detail text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span dir="ltr">{order.phoneNumber}</span>
                    </p>
                  )}
                  {address?.city && (
                    <p className="cust-detail text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {[address.city, address.district, address.street].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Items ── */}
              <div className="inv-section mb-4">
                <p className="inv-section-title text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 pb-1.5 border-b border-border/20">
                  المنتجات
                </p>
                <table className="inv-items w-full text-[11px]">
                  <thead>
                    <tr>
                      <th className="text-right py-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wide border-b-2 border-border/30">
                        المنتج
                      </th>
                      <th className="text-center py-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wide border-b-2 border-border/30 w-14">
                        الكمية
                      </th>
                      <th className="text-left py-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wide border-b-2 border-border/30">
                        المبلغ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-border/10 last:border-0">
                        <td className="py-2.5 align-top">
                          <p className="item-name font-medium text-foreground text-[11px] leading-snug">{item.productName}</p>
                          {(item as any).variantAttributes && (
                            <p className="item-variant text-[9px] text-muted-foreground/70 mt-0.5">
                              {formatVariantLabel((item as any).variantAttributes)}
                            </p>
                          )}
                        </td>
                        <td className="item-qty py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="item-price py-2.5 text-left font-semibold whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Summary ── */}
              <div className="inv-summary rounded-xl bg-muted/30 dark:bg-muted/20 px-3.5 py-3 space-y-1">
                <div className="inv-summary-row flex justify-between text-[11px]">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="val font-medium tabular-nums">{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                {Number(order.shippingFee) > 0 && (
                  <div className="inv-summary-row flex justify-between text-[11px]">
                    <span className="text-muted-foreground">التوصيل</span>
                    <span className="val font-medium tabular-nums">{formatCurrency(order.shippingFee, order.currency)}</span>
                  </div>
                )}
                {Number(order.discount) > 0 && (
                  <div className="inv-summary-row discount flex justify-between text-[11px]">
                    <span className="text-muted-foreground">الخصم</span>
                    <span className="val font-medium tabular-nums text-emerald-600">-{formatCurrency(order.discount, order.currency)}</span>
                  </div>
                )}
                <div className="inv-summary-total flex justify-between pt-2.5 mt-1.5 border-t-2 border-foreground/80 text-[15px] font-extrabold">
                  <span>الإجمالي</span>
                  <span className="tabular-nums">{formatCurrency(order.total, order.currency)}</span>
                </div>
              </div>

              {/* ── Status ── */}
              <div className="inv-status text-center mt-4 pt-3.5 border-t border-dashed border-border/40">
                <span
                  className={cn(
                    'inv-status-badge inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold',
                    config.bg,
                    config.textColor,
                  )}
                  style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors.text }} />
                  {config.label}
                </span>
              </div>

              {/* ── Footer ── */}
              <div className="inv-footer text-center mt-4 pt-3.5 border-t border-dashed border-border/30">
                <p className="thanks text-[12px] font-semibold text-muted-foreground/80">شكراً لتسوقكم معنا ♥</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
