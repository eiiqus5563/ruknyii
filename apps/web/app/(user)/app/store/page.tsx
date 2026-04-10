'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Crown,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyStoreState } from '@/components/(app)/store';
import { OrderDetailsDialog } from '@/components/(app)/store';
import { generateFormSlug } from '@/lib/utils/generateFormSlug';
import {
  StoreHeader,
  DashboardStatsCards,
  DashboardStatsSkeleton,
  TopProducts,
  TopProductsSkeleton,
  StockAlerts,
  StockAlertsSkeleton,
  RecentOrders,
  RecentOrdersSkeleton,
  OrdersStatusChart,
  OrdersStatusChartSkeleton,
  RevenueChart,
  RevenueChartSkeleton,
  LatestProducts,
  LatestProductsSkeleton,
  DashboardSection,
} from '@/components/(app)/store/StoreDashboard';
import { useStoreDashboard } from '@/lib/hooks/useStoreDashboard';
import type { DashboardProduct } from '@/lib/hooks/useStoreDashboard';
import type { Order } from '@/components/(app)/store';
import { useRouter } from 'next/navigation';

export default function StorePage() {
  const router = useRouter();
  const { data, isLoading, error, loadDashboard } = useStoreDashboard();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleNavigate = useCallback(
    (href: string) => router.push(href),
    [router],
  );

  const handleViewProduct = useCallback(
    (product: DashboardProduct) => router.push(`/app/store/products/${product.slug}`),
    [router],
  );

  const handleEditProduct = useCallback(
    (product: DashboardProduct) => router.push(`/app/store/products/${product.slug}`),
    [router],
  );

  const handleViewOrder = useCallback(
    (order: Order) => setSelectedOrder(order),
    [],
  );

  const handleCreateProduct = useCallback(
    () => {
      const slug = generateFormSlug();
      router.push(`/app/store/products/create/${slug}?new=true`);
    },
    [router],
  );

  const hasProducts = data.stats.totalProducts > 0;

  return (
    <div
      className="relative flex h-[calc(100%-0.5rem)] sm:h-[calc(100%-1rem)] flex-1 min-w-0 gap-4 m-1 sm:m-2 md:ms-0"
      dir="rtl"
    >
      <div className="flex-1 min-w-0 bg-card overflow-hidden">
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-5 pb-20">
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2">
              <StoreHeader store={data.store} />

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  aria-label="تحديث البيانات"
                  className={cn(
                    'p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                    isLoading && 'animate-spin',
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCreateProduct}
                  aria-label="إضافة منتج جديد"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">إضافة منتج</span>
                  <span className="sm:hidden">منتج</span>
                </button>
              </div>
            </div>

            {/* ── Error ──────────────────────────────────── */}
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="shrink-0 rounded-xl px-3.5 py-1.5 text-[13px] font-medium bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* ── Stats Cards ────────────────────────────── */}
            {isLoading ? (
              <DashboardStatsSkeleton />
            ) : (
              <DashboardStatsCards stats={data.stats} />
            )}

            {/* ── Empty State ────────────────────────────── */}
            {!isLoading && !hasProducts && (
              <EmptyStoreState onCreateProduct={handleCreateProduct} />
            )}

            {/* ── Revenue Chart (full width) ─────────────── */}
            {(isLoading || hasProducts) && (
              <DashboardSection title="الإيرادات" icon={TrendingUp}>
                {isLoading ? (
                  <RevenueChartSkeleton />
                ) : (
                  <RevenueChart data={data.revenueChart} />
                )}
              </DashboardSection>
            )}

            {/* ── Dashboard Grid ─────────────────────────── */}
            {(isLoading || hasProducts) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Top Products */}
                <DashboardSection
                  title="أفضل المنتجات مبيعاً"
                  icon={Crown}
                  action={{ label: 'عرض الكل', onClick: () => handleNavigate('/app/store/products') }}
                >
                  {isLoading ? (
                    <TopProductsSkeleton />
                  ) : (
                    <TopProducts products={data.topProducts} onView={handleViewProduct} />
                  )}
                </DashboardSection>

                {/* Stock Alerts */}
                <DashboardSection
                  title="تنبيهات المخزون"
                  icon={AlertTriangle}
                  action={
                    data.stockAlerts.length > 0
                      ? { label: 'إدارة المخزون', onClick: () => handleNavigate('/app/store/products') }
                      : undefined
                  }
                >
                  {isLoading ? (
                    <StockAlertsSkeleton />
                  ) : (
                    <StockAlerts products={data.stockAlerts} onEdit={handleEditProduct} />
                  )}
                </DashboardSection>

                {/* Recent Orders */}
                <DashboardSection
                  title="أحدث الطلبات"
                  icon={ShoppingCart}
                  action={{ label: 'عرض الكل', onClick: () => handleNavigate('/app/store/orders') }}
                >
                  {isLoading ? (
                    <RecentOrdersSkeleton />
                  ) : (
                    <RecentOrders orders={data.recentOrders} onView={handleViewOrder} />
                  )}
                </DashboardSection>

                {/* Orders Status Chart */}
                <DashboardSection
                  title="توزيع حالات الطلبات"
                  icon={TrendingUp}
                >
                  {isLoading ? (
                    <OrdersStatusChartSkeleton />
                  ) : (
                    <OrdersStatusChart
                      ordersByStatus={data.ordersByStatus}
                      totalOrders={data.stats.totalOrders}
                    />
                  )}
                </DashboardSection>
              </div>
            )}

            {/* ── Latest Products ─────────────────────────── */}
            {(isLoading || data.latestProducts.length > 0) && (
              <DashboardSection
                title="أحدث المنتجات المضافة"
                icon={Layers}
                action={{ label: 'عرض الكل', onClick: () => handleNavigate('/app/store/products') }}
              >
                {isLoading ? (
                  <LatestProductsSkeleton />
                ) : (
                  <LatestProducts products={data.latestProducts} onView={handleViewProduct} />
                )}
              </DashboardSection>
            )}

            {/* Bottom Blur Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}
      />
    </div>
  );
}
