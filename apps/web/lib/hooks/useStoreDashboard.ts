'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Order } from '@/components/(app)/store';

// ==================== INTERFACES ====================

export interface DashboardProduct {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  price: number;
  salePrice?: number;
  quantity: number;
  stock: number;
  images: string[];
  status: string;
  isActive: boolean;
  categoryId?: string;
  category?: { id: string; name: string; nameAr?: string };
  createdAt: string;
  updatedAt: string;
  _count?: { order_items?: number };
  orderCount?: number;
  totalRevenue?: number;
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  isActive: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface DashboardData {
  store: StoreInfo | null;
  stats: DashboardStats;
  topProducts: DashboardProduct[];
  recentOrders: Order[];
  latestProducts: DashboardProduct[];
  stockAlerts: DashboardProduct[];
  ordersByStatus: Record<string, number>;
  revenueChart: { date: string; revenue: number; orders: number }[];
}

const EMPTY_STATS: DashboardStats = {
  totalProducts: 0,
  activeProducts: 0,
  draftProducts: 0,
  outOfStockProducts: 0,
  lowStockProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
  processingOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  totalRevenue: 0,
  todayOrders: 0,
  todayRevenue: 0,
};

const EMPTY_DATA: DashboardData = {
  store: null,
  stats: EMPTY_STATS,
  topProducts: [],
  recentOrders: [],
  latestProducts: [],
  stockAlerts: [],
  ordersByStatus: {},
  revenueChart: [],
};

// ==================== HELPERS ====================

function normalizeProduct(raw: any): DashboardProduct {
  const rawImages = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(raw?.product_images)
      ? raw.product_images.map((img: any) => img?.imagePath).filter(Boolean)
      : [];

  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? raw?.nameAr ?? '',
    nameAr: raw?.nameAr,
    slug: raw?.slug ?? '',
    price: Number(raw?.price ?? 0),
    salePrice: raw?.salePrice != null ? Number(raw.salePrice) : undefined,
    quantity: Number(raw?.quantity ?? raw?.stock ?? 0),
    stock: Number(raw?.stock ?? raw?.quantity ?? 0),
    images: rawImages,
    status: raw?.status ?? (raw?.isActive ? 'ACTIVE' : 'INACTIVE'),
    isActive:
      typeof raw?.isActive === 'boolean'
        ? raw.isActive
        : String(raw?.status ?? '').toUpperCase() === 'ACTIVE',
    categoryId: raw?.categoryId ?? undefined,
    category: raw?.product_categories
      ? { id: String(raw.product_categories.id), name: raw.product_categories.nameAr || raw.product_categories.name }
      : raw?.category
        ? { id: String(raw.category.id), name: raw.category.nameAr || raw.category.name }
        : undefined,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
    _count: raw?._count,
    orderCount: raw?._count?.order_items ?? raw?.orderCount ?? 0,
    totalRevenue: raw?.totalRevenue ?? 0,
  };
}

function computeStats(products: DashboardProduct[], orders: Order[]): DashboardStats {
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isActive).length;
  const draftProducts = products.filter((p) => !p.isActive).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0 && p.isActive).length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
  const processingOrders = orders.filter((o) =>
    ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status),
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Today stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= todayStart).length;
  const todayRevenue = orders
    .filter((o) => o.status === 'DELIVERED' && new Date(o.createdAt) >= todayStart)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return {
    totalProducts,
    activeProducts,
    draftProducts,
    outOfStockProducts,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    processingOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    todayOrders,
    todayRevenue,
  };
}

function computeOrdersByStatus(orders: Order[]): Record<string, number> {
  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  const result: Record<string, number> = {};
  for (const s of statuses) {
    const count = orders.filter((o) => o.status === s).length;
    if (count > 0) result[s] = count;
  }
  return result;
}

function computeRevenueChart(orders: Order[], days = 14): { date: string; revenue: number; orders: number }[] {
  const data: { date: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOrders = orders.filter((o) => {
      const oDate = new Date(o.createdAt).toISOString().split('T')[0];
      return oDate === dateStr;
    });
    const revenue = dayOrders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    data.push({ date: dateStr, revenue, orders: dayOrders.length });
  }
  return data;
}

// ==================== HOOK ====================

export function useStoreDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [storeRes, productsRes, ordersRes, topRes] = await Promise.allSettled([
        api.get<StoreInfo>('/stores/my-store'),
        api.get<any[]>('/products/my-products'),
        api.get<{ orders: Order[]; total: number } | Order[]>('/orders/store'),
        api.get<any[]>('/products/store/top'),
      ]);

      // Store
      const store: StoreInfo | null =
        storeRes.status === 'fulfilled' ? (storeRes.value as any).data : null;

      // Products
      let products: DashboardProduct[] = [];
      if (productsRes.status === 'fulfilled') {
        const raw = (productsRes.value as any).data;
        if (Array.isArray(raw)) {
          products = raw.map(normalizeProduct);
        }
      }

      // Orders
      let orders: Order[] = [];
      if (ordersRes.status === 'fulfilled') {
        const raw = (ordersRes.value as any).data;
        orders = Array.isArray(raw) ? raw : (raw as any)?.orders ?? [];
      }

      // Top products
      let topProducts: DashboardProduct[] = [];
      if (topRes.status === 'fulfilled') {
        const raw = (topRes.value as any).data;
        if (Array.isArray(raw)) {
          topProducts = raw.map(normalizeProduct);
        }
      }
      // Fallback: sort products by orderCount if top endpoint returned empty
      if (topProducts.length === 0 && products.length > 0) {
        topProducts = [...products]
          .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
          .slice(0, 5);
      }

      // Stats
      const stats = computeStats(products, orders);

      // Recent orders (latest 5)
      const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Latest products (latest 4)
      const latestProducts = [...products]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

      // Stock alerts (out of stock + low stock)
      const stockAlerts = products
        .filter((p) => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock);

      // Orders by status
      const ordersByStatus = computeOrdersByStatus(orders);

      // Revenue chart (last 14 days)
      const revenueChart = computeRevenueChart(orders, 14);

      setData({
        store,
        stats,
        topProducts: topProducts.slice(0, 5),
        recentOrders,
        latestProducts,
        stockAlerts,
        ordersByStatus,
        revenueChart,
      });
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل بيانات لوحة التحكم');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    loadDashboard,
  };
}
