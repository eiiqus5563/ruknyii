'use client';

import { useState, useEffect } from 'react';
import {
  StatsCard,
  StatsCardSkeleton,
  OverviewStats,
  RecentOrders,
  TopProductsTable,
  ActivityBarChart,
  TasksList,
  WelcomeBanner,
  OrderStatusDistribution,
} from '@/components/(app)/dashboard';
import api from '@/lib/api/client';
import { formatIQD } from '@/lib/currency';
import { useAuth } from '@/providers';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  events: { active: number; total: number };
  products: { active: number; total: number };
  forms: { active: number; total: number; submissions: number };
  views: { total: number; thisMonth: number };
}

interface ChartDay {
  day: string;
  date: string;
  orders: number;
  revenue: number;
  products: number;
}

interface ChartData {
  current: ChartDay[];
  previous: ChartDay[];
  summary: {
    currentTotal: number;
    previousTotal: number;
    currentOrders: number;
    previousOrders: number;
  };
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  avatar?: string;
  href?: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  users?: { profile?: { name?: string } };
  order_items?: { productName: string }[];
}

interface TopProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to be ready before fetching dashboard data
    if (authLoading || !isAuthenticated) return;

    const load = async () => {
      try {
        const [statsRes, chartRes, activityRes, ordersRes, productsRes] = await Promise.all([
          api.get<DashboardStats>('/dashboard/stats').catch(() => null),
          api.get<ChartData>('/dashboard/chart', { days: 7 }).catch(() => null),
          api.get<Activity[]>('/dashboard/activity', { limit: 10 }).catch(() => null),
          api.get<{ orders: Order[]; total: number }>('/orders/store', { limit: 5 }).catch(() => null),
          api.get<TopProduct[]>('/products/store/top', { limit: 5 }).catch(() => null),
        ]);
        if (statsRes?.data) setStats(statsRes.data);
        if (chartRes?.data) setChart(chartRes.data);
        if (activityRes?.data) setActivities(Array.isArray(activityRes.data) ? activityRes.data : []);
        if (ordersRes?.data) {
          const raw = ordersRes.data;
          setOrders(Array.isArray(raw) ? raw : (raw as any).orders ?? []);
        }
        if (productsRes?.data) setTopProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, isAuthenticated]);

  const formatCurrency = (amount: number) => formatIQD(amount);

  /* ── Loading skeleton ── */
  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5 h-[220px] sm:h-[300px] animate-pulse" />
          <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5 h-[220px] sm:h-[300px] animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── Build Stats rows from API data ── */
  const s = stats ?? { events: { active: 0, total: 0 }, products: { active: 0, total: 0 }, forms: { active: 0, total: 0, submissions: 0 }, views: { total: 0, thisMonth: 0 } };

  const statsRow1 = [
    { title: 'المشاهدات', value: s.views.total.toLocaleString('en'), change: `${s.views.thisMonth} هذا الشهر`, trend: 'up' as const, highlight: true },
    { title: 'الطلبات', value: (chart?.summary.currentOrders ?? 0).toLocaleString('en'), change: pctChange(chart?.summary.currentOrders, chart?.summary.previousOrders), trend: trendDir(chart?.summary.currentOrders, chart?.summary.previousOrders) },
    { title: 'المنتجات', value: s.products.total.toLocaleString('en'), change: `${s.products.active} نشط`, trend: 'up' as const },
    { title: 'الإيرادات', value: formatCurrency(chart?.summary.currentTotal ?? 0), change: pctChange(chart?.summary.currentTotal, chart?.summary.previousTotal), trend: trendDir(chart?.summary.currentTotal, chart?.summary.previousTotal) },
  ];

  const statsRow2 = [
    { title: 'النماذج', value: s.forms.total.toLocaleString('en'), change: `${s.forms.active} نشط`, trend: 'up' as const, highlight: true },
    { title: 'الفعاليات', value: s.events.total.toLocaleString('en'), change: `${s.events.active} قادمة`, trend: 'up' as const },
    { title: 'ردود النماذج', value: s.forms.submissions.toLocaleString('en'), change: '+0%', trend: 'up' as const },
    { title: 'المنتجات النشطة', value: s.products.active.toLocaleString('en'), change: s.products.active > 0 ? 'جيد' : '-', trend: 'up' as const },
  ];

  const overviewStatsData = [
    { label: 'المشاهدات', value: s.views.total, change: s.views.thisMonth },
    { label: 'الطلبات', value: chart?.summary.currentOrders ?? 0, change: (chart?.summary.currentOrders ?? 0) - (chart?.summary.previousOrders ?? 0) },
    { label: 'ردود النماذج', value: s.forms.submissions, change: 0, highlight: true },
    { label: 'المنتجات النشطة', value: s.products.active, change: 0 },
  ];

  /* ── Chart data → ActivityBarChart ── */
  const chartBarData = (chart?.current ?? []).map((d) => ({
    day: d.day,
    value: d.revenue,
    isHighlighted: d.revenue > 0,
  }));

  const totalRevenue = chart?.summary.currentTotal ?? 0;
  const revenueBadgeValue = pctChange(chart?.summary.currentTotal, chart?.summary.previousTotal);
  const revenueBadgeTrend = trendDir(chart?.summary.currentTotal, chart?.summary.previousTotal);

  /* ── Orders → RecentOrders format ── */
  const mappedOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber || o.id.slice(0, 8),
    customerName: o.users?.profile?.name || 'عميل',
    total: Number(o.total) || 0,
    status: o.status,
    createdAt: o.createdAt,
    items: o.order_items?.map((i) => ({ productName: i.productName })) ?? [],
  }));

  /* ── Activities → TasksList format ── */
  const mappedActivities = activities.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type as any,
    time: timeAgo(a.createdAt),
    isNew: isRecent(a.createdAt),
  }));

  return (
    <div className="space-y-3 sm:space-y-4 mt-2 sm:mt-10">
      {/* ── بانر الترحيب للمستخدم الجديد ── */}
      <WelcomeBanner
        hasLinks={s.views.total > 0}
        hasForms={s.forms.total > 0}
      />

      {/* ── الصف الأول: بطاقات الإحصائيات ── */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        {statsRow1.map((s) => (
          <StatsCard key={s.title} {...s} />
        ))}
      </div>

      {/* ── الصف الثاني: بطاقات إضافية ── */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        {statsRow2.map((s) => (
          <StatsCard key={s.title} {...s} />
        ))}
      </div>

      {/* ── نظرة عامة + نشاط الأسبوع ── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <OverviewStats
          title="نظرة عامة"
          subtitle="إحصائياتك خلال هذا الأسبوع"
          stats={overviewStatsData}
        />
        <ActivityBarChart
          title="إيرادات الأسبوع"
          totalValue={formatCurrency(totalRevenue)}
          data={chartBarData}
          badge={{ value: revenueBadgeValue, trend: revenueBadgeTrend }}
        />
      </div>

      {/* ── آخر الطلبات + توزيع الحالات ── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <RecentOrders orders={mappedOrders} formatCurrency={formatCurrency} />
        <OrderStatusDistribution orders={mappedOrders} formatCurrency={formatCurrency} />
      </div>

      {/* ── المنتجات الأكثر مبيعاً ── */}
      <TopProductsTable products={topProducts} formatCurrency={formatCurrency} />

      {/* ── آخر النشاطات ── */}
      <TasksList tasks={mappedActivities} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pctChange(current?: number, previous?: number): string {
  const c = current ?? 0;
  const p = previous ?? 0;
  if (p === 0) return c > 0 ? '+100%' : '+0%';
  const pct = Math.round(((c - p) / p) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function trendDir(current?: number, previous?: number): 'up' | 'down' {
  return (current ?? 0) >= (previous ?? 0) ? 'up' : 'down';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}