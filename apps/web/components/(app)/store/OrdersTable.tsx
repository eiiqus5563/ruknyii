'use client';

import { memo } from 'react';
import { Table, Chip, Button } from '@heroui/react';
import { Eye, Truck, Ban, User } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type { Order } from './OrderCard';
import { ORDER_STATUS_CONFIG } from './OrderCard';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-IQ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCustomerName(order: Order): string {
  return (
    order.customer?.name ||
    order.users?.profile?.name ||
    order.users?.name ||
    'زائر'
  );
}

const STATUS_CHIP_COLOR: Record<string, 'warning' | 'accent' | 'success' | 'danger' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  PROCESSING: 'accent',
  SHIPPED: 'default',
  OUT_FOR_DELIVERY: 'accent',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'default',
};

const COL_CLASS = '!text-right !text-foreground/70';

interface OrdersTableProps {
  orders: Order[];
  onView?: (order: Order) => void;
  onUpdateStatus?: (order: Order) => void;
  onCancel?: (order: Order) => void;
}

export const OrdersTable = memo(function OrdersTable({
  orders,
  onView,
  onUpdateStatus,
  onCancel,
}: OrdersTableProps) {
  return (
    <div dir="rtl" className="orders-table-rtl">
      <style>{`
        .orders-table-rtl .table__column {
          text-align: right !important;
        }
        .orders-table-rtl .table__column::after {
          right: auto !important;
          left: 0 !important;
        }
        .orders-table-rtl .table__cell {
          text-align: right !important;
        }
        .orders-table-rtl .table__body tr:first-child td:first-child {
          border-top-left-radius: 0 !important;
          border-top-right-radius: 1rem !important;
        }
        .orders-table-rtl .table__body tr:first-child td:last-child {
          border-top-right-radius: 0 !important;
          border-top-left-radius: 1rem !important;
        }
        .orders-table-rtl .table__body tr:last-child td:first-child {
          border-bottom-left-radius: 0 !important;
          border-bottom-right-radius: 1rem !important;
        }
        .orders-table-rtl .table__body tr:last-child td:last-child {
          border-bottom-right-radius: 0 !important;
          border-bottom-left-radius: 1rem !important;
        }
        .orders-table-rtl .table-root--secondary .table__column:first-child {
          border-radius: 0 1rem 1rem 0 !important;
        }
        .orders-table-rtl .table-root--secondary .table__column:last-child {
          border-radius: 1rem 0 0 1rem !important;
        }
      `}</style>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="جدول الطلبات" className="min-w-[930px]">
            <Table.Header>
              <Table.Column isRowHeader id="orderNumber" className={COL_CLASS}>رقم الطلب</Table.Column>
              <Table.Column id="customer" className={COL_CLASS}>العميل</Table.Column>
              <Table.Column id="status" className={COL_CLASS}>الحالة</Table.Column>
              <Table.Column id="products" className={COL_CLASS}>المنتجات</Table.Column>
              <Table.Column id="total" className={COL_CLASS}>الإجمالي</Table.Column>
              <Table.Column id="date" className={COL_CLASS}>التاريخ</Table.Column>
              <Table.Column id="actions" className={COL_CLASS}>إجراءات</Table.Column>
            </Table.Header>
            <Table.Body>
              {orders.map((order) => {
                const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
                const customerName = getCustomerName(order);
                const items = order.order_items || order.items || [];
                const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
                const isFinal = ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);
                const chipColor = STATUS_CHIP_COLOR[order.status] || 'default';

                return (
                  <Table.Row key={order.id} id={order.id}>
                    {/* رقم الطلب */}
                    <Table.Cell>
                      <span className="font-semibold text-sm whitespace-nowrap" dir="ltr">
                        #{order.orderNumber}
                      </span>
                    </Table.Cell>

                    {/* العميل */}
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate max-w-[140px]" dir="auto">{customerName}</span>
                          {order.phoneNumber && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]" dir="ltr">
                              {order.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </Table.Cell>

                    {/* الحالة */}
                    <Table.Cell>
                      <Chip color={chipColor} size="sm" variant="soft" className="whitespace-nowrap">
                        {config.label}
                      </Chip>
                    </Table.Cell>

                    {/* المنتجات */}
                    <Table.Cell>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {items.slice(0, 1).map((item, i) => (
                          <span key={i} className="text-xs text-muted-foreground truncate max-w-[180px] block" dir="auto">
                            {item.productName} ×{item.quantity}
                          </span>
                        ))}
                        {items.length > 1 && (
                          <span className="text-[11px] text-muted-foreground/60">
                            +{items.length - 1} أخرى
                          </span>
                        )}
                        {items.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {(order as any).itemsCount || 0} منتج
                          </span>
                        )}
                      </div>
                    </Table.Cell>

                    {/* الإجمالي */}
                    <Table.Cell>
                      <span className="font-semibold text-sm tabular-nums whitespace-nowrap">
                        {formatCurrency(order.total, order.currency)}
                      </span>
                    </Table.Cell>

                    {/* التاريخ */}
                    <Table.Cell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </span>
                    </Table.Cell>

                    {/* إجراءات */}
                    <Table.Cell>
                      <div className="flex items-center gap-0.5">
                        {onView && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="tertiary"
                            onPress={() => onView(order)}
                            aria-label="عرض"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onUpdateStatus && !isFinal && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="tertiary"
                            onPress={() => onUpdateStatus(order)}
                            aria-label="تحديث الحالة"
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onCancel && canCancel && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="danger-soft"
                            onPress={() => onCancel(order)}
                            aria-label="إلغاء"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
});
