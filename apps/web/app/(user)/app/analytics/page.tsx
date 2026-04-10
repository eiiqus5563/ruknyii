'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  MousePointerClick,
  FileText,
  Link2,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ExternalLink,
  Chrome,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { StatsCard, StatsCardSkeleton } from '@/components/(app)/dashboard';
import api from '@/lib/api/client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AnalyticsData {
  summary: {
    totalClicks: number;
    totalLinkViews: number;
    totalFormViews: number;
    totalSubmissions: number;
    linksCount: number;
    formsCount: number;
    conversionRate: number;
    changes: {
      clicks: number;
      formViews: number;
      submissions: number;
      conversionRate: number;
    };
  };
  chartData: { date: string; clicks: number; submissions: number }[];
  deviceBreakdown: { device: string; clicks: number }[];
  browserBreakdown: { browser: string; clicks: number }[];
  countryBreakdown: { country: string; clicks: number }[];
  referrerBreakdown: { referrer: string; clicks: number }[];
  topLinks: { id: string; title: string; platform: string; url: string; clicks: number }[];
  topForms: { id: string; title: string; views: number; submissions: number; conversionRate: number }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEVICE_CONFIG: Record<string, { icon: typeof Monitor; label: string }> = {
  desktop: { icon: Monitor, label: 'سطح المكتب' },
  mobile: { icon: Smartphone, label: 'الجوال' },
  tablet: { icon: Tablet, label: 'أجهزة لوحية' },
  unknown: { icon: Monitor, label: 'أخرى' },
};

const BAR_COLORS = ['#5a9a56', '#e8fd9d', '#d6dfea', '#cbe2c8', '#a3c9a0'];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get<AnalyticsData>(`/analytics/overview?days=${period}`);
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  /* Loading */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-muted/30 p-5 h-[340px] animate-pulse" />
          <div className="rounded-3xl bg-muted/30 p-5 h-[340px] animate-pulse" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-muted/30 p-5 h-[260px] animate-pulse" />
          <div className="rounded-3xl bg-muted/30 p-5 h-[260px] animate-pulse" />
        </div>
      </div>
    );
  }

  /* Empty state */
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-medium">لا تتوفر بيانات للتحليلات</p>
      </div>
    );
  }

  const { summary, chartData, deviceBreakdown, browserBreakdown, countryBreakdown, referrerBreakdown, topLinks, topForms } = data;
  const totalDeviceClicks = deviceBreakdown.reduce((s, d) => s + d.clicks, 0);
  const totalBrowserClicks = browserBreakdown.reduce((s, b) => s + b.clicks, 0);
  const totalCountryClicks = countryBreakdown.reduce((s, c) => s + c.clicks, 0);
  const totalReferrerClicks = referrerBreakdown.reduce((s, r) => s + r.clicks, 0);

  const formatChange = (val: number) => {
    if (val === 0) return { text: '0%', trend: 'up' as const };
    return { text: `${val > 0 ? '+' : ''}${val}%`, trend: val >= 0 ? 'up' as const : 'down' as const };
  };

  const clicksChange = formatChange(summary.changes.clicks);
  const viewsChange = formatChange(summary.changes.formViews);
  const subsChange = formatChange(summary.changes.submissions);
  const convChange = formatChange(summary.changes.conversionRate);

  return (
    <div className="space-y-4 mt-10">
      {/* ── KPI Cards ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard title="النقرات" value={summary.totalClicks.toLocaleString('en')} change={clicksChange.text} trend={clicksChange.trend} highlight />
        <StatsCard title="مشاهدات النماذج" value={summary.totalFormViews.toLocaleString('en')} change={viewsChange.text} trend={viewsChange.trend} />
        <StatsCard title="الردود" value={summary.totalSubmissions.toLocaleString('en')} change={subsChange.text} trend={subsChange.trend} />
        <StatsCard title="معدل التحويل" value={`${summary.conversionRate}%`} change={convChange.text} trend={convChange.trend} />
      </div>

      {/* ── Chart + Devices ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">النشاط اليومي</h3>
              <p className="text-sm text-muted-foreground mt-0.5">النقرات والردود خلال الفترة</p>
            </div>
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all',
                    period === d
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {d === 7 ? '7 أيام' : d === 30 ? '30 يوم' : '90 يوم'}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a9a56" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#5a9a56" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8fd9d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e8fd9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    direction: 'rtl',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-GB')}
                  formatter={(value, name) => [
                    value,
                    name === 'clicks' ? 'النقرات' : 'الردود',
                  ]}
                />
                <Area type="monotone" dataKey="clicks" stroke="#5a9a56" strokeWidth={2} fill="url(#clicksGrad)" dot={false} />
                <Area type="monotone" dataKey="submissions" stroke="#e8fd9d" strokeWidth={2} fill="url(#subsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              لا توجد بيانات للفترة المحددة
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#5a9a56' }} />
              النقرات
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#e8fd9d' }} />
              الردود
            </span>
          </div>
        </motion.div>

        {/* Device Breakdown — progress bars only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-1">الأجهزة</h3>
          <p className="text-sm text-muted-foreground mb-5">توزيع النقرات حسب الجهاز</p>

          {totalDeviceClicks > 0 ? (
            <div className="space-y-4">
              {deviceBreakdown.map((d, i) => {
                const config = DEVICE_CONFIG[d.device] || DEVICE_CONFIG.unknown;
                const Icon = config.icon;
                const pct = Math.round((d.clicks / totalDeviceClicks) * 100);
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${BAR_COLORS[i % BAR_COLORS.length]}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{config.label}</p>
                        <span className="text-xs text-muted-foreground tabular-nums">{d.clicks.toLocaleString('en')}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums w-10 text-left">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock icon={Monitor} text="لا توجد بيانات" />
          )}
        </motion.div>
      </div>

      {/* ── Referrers + Countries ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Referrers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">أفضل المصادر</h3>
              <p className="text-sm text-muted-foreground mt-0.5">مصادر الزيارات</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/50">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {referrerBreakdown.length > 0 && totalReferrerClicks > 0 ? (
            <div className="space-y-3">
              {referrerBreakdown.map((r, i) => {
                const pct = Math.round((r.clicks / totalReferrerClicks) * 100);
                return (
                  <div key={r.referrer} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{r.referrer}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden shrink-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums w-14 text-left">{r.clicks.toLocaleString('en')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock icon={ExternalLink} text="لا توجد بيانات مصادر" />
          )}
        </motion.div>

        {/* Geographic Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">التوزيع الجغرافي</h3>
              <p className="text-sm text-muted-foreground mt-0.5">أكثر الدول زيارة</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/50">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {countryBreakdown.length > 0 && totalCountryClicks > 0 ? (
            <div className="space-y-3">
              {countryBreakdown.map((c, i) => {
                const pct = Math.round((c.clicks / totalCountryClicks) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{c.country}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden shrink-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums w-14 text-left">{c.clicks.toLocaleString('en')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock icon={Globe} text="لا توجد بيانات جغرافية" />
          )}
        </motion.div>
      </div>

      {/* ── Browsers + Top Links ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Browser Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">المتصفحات</h3>
              <p className="text-sm text-muted-foreground mt-0.5">أكثر المتصفحات استخداماً</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/50">
              <Chrome className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {browserBreakdown.length > 0 && totalBrowserClicks > 0 ? (
            <div className="space-y-3">
              {browserBreakdown.map((b, i) => {
                const pct = Math.round((b.clicks / totalBrowserClicks) * 100);
                return (
                  <div key={b.browser} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{b.browser}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden shrink-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums w-14 text-left">{b.clicks.toLocaleString('en')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock icon={Chrome} text="لا توجد بيانات متصفحات" />
          )}
        </motion.div>

        {/* Top Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">أفضل الروابط</h3>
              <p className="text-sm text-muted-foreground mt-0.5">حسب عدد النقرات</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/50">
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {topLinks.length > 0 ? (
            <div className="space-y-2.5">
              {topLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-background/50 hover:bg-background transition-colors"
                >
                  <span className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                    index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
                  )}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{link.platform}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-foreground tabular-nums">
                    <MousePointerClick className="w-3.5 h-3.5 text-primary" />
                    {link.clicks.toLocaleString('en')}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyBlock icon={Link2} text="لا توجد نقرات على الروابط" />
          )}
        </motion.div>
      </div>

      {/* ── Top Forms ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">أفضل النماذج</h3>
            <p className="text-sm text-muted-foreground mt-0.5">حسب معدل التحويل</p>
          </div>
          <div className="p-2 rounded-xl bg-muted/50">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        {topForms.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {topForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-background/50 hover:bg-background transition-colors"
              >
                <span className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                  index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
                )}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{form.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {form.views.toLocaleString('en')} مشاهدة • {form.submissions.toLocaleString('en')} رد
                  </p>
                </div>
                <span className={cn(
                  'px-2 py-1 rounded-xl text-xs font-bold tabular-nums',
                  form.conversionRate > 50
                    ? 'bg-primary/10 text-primary dark:text-primary'
                    : form.conversionRate > 20
                      ? 'bg-accent/50 text-accent-foreground dark:text-accent'
                      : 'bg-muted/50 text-muted-foreground'
                )}>
                  {form.conversionRate}%
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyBlock icon={FileText} text="لا توجد ردود على النماذج" />
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EmptyBlock({ icon: Icon, text }: { icon: typeof Link2; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[140px] text-muted-foreground">
      <Icon className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
