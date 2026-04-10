'use client';

import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Loader2,
  Truck,
  Package,
  PackageCheck,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Order } from './OrderCard';
import { ORDER_STATUS_CONFIG } from './OrderCard';

// ─── Valid transitions ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PROCESSING: Loader2,
  SHIPPED: Truck,
  OUT_FOR_DELIVERY: Package,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
  REFUNDED: RotateCcw,
};

// ─── Props ────────────────────────────────────────────────────

interface StatusUpdateDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (order: Order, newStatus: string) => void;
  isUpdating?: boolean;
}

export function StatusUpdateDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: StatusUpdateDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!order) return null;

  const currentConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
  const CurrentIcon = STATUS_ICON[order.status] || Clock;
  const nextStatuses = VALID_TRANSITIONS[order.status] || [];

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(order, selected);
    setSelected(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelected(null);
      }}
    >
      <DialogContent
        className="sm:max-w-[380px] p-0 gap-0 rounded-2xl sm:rounded-3xl overflow-hidden border-border/50"
        dir="rtl"
      >
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-base font-bold text-foreground mb-1">تحديث حالة الطلب</h2>
          <p className="text-[12px] text-muted-foreground">
            #{order.orderNumber}
          </p>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', currentConfig.bg)}>
              <CurrentIcon className={cn('h-4 w-4', currentConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">الحالة الحالية</p>
              <p className="text-sm font-semibold text-foreground">{currentConfig.label}</p>
            </div>
          </div>

          {/* Arrow */}
          {nextStatuses.length > 0 && (
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/40">
                <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
              </div>
            </div>
          )}

          {/* Next status options */}
          {nextStatuses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">اختر الحالة الجديدة</p>
              {nextStatuses.map((status) => {
                const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
                const Icon = STATUS_ICON[status] || Clock;
                const isSelected = selected === status;
                const isDanger = status === 'CANCELLED' || status === 'REFUNDED';

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelected(status)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl p-3 border-2 transition-all',
                      isSelected
                        ? isDanger
                          ? 'border-rose-500/50 bg-rose-500/5'
                          : 'border-primary/50 bg-primary/5'
                        : 'border-transparent bg-muted/30 hover:bg-muted/50',
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className={cn(
                        'text-sm font-semibold',
                        isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-foreground',
                      )}>
                        {config.label}
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                      isSelected
                        ? isDanger
                          ? 'border-rose-500 bg-rose-500'
                          : 'border-primary bg-primary'
                        : 'border-border',
                    )}>
                      {isSelected && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">هذا الطلب في حالته النهائية</p>
            </div>
          )}

          {/* Actions */}
          {nextStatuses.length > 0 && (
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 h-11 rounded-xl"
                onClick={handleConfirm}
                disabled={!selected || isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <ArrowLeft className="w-4 h-4 ml-2" />
                )}
                {isUpdating ? 'جاري التحديث...' : 'تأكيد التحديث'}
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
