'use client';

import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Crown,
  Zap,
  Shield,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlansOverview, type SubscriptionPlan, type PlanOverviewItem } from '@/lib/api/subscriptions';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_COLORS: Record<SubscriptionPlan, { bg: string; text: string; border: string; ring: string }> = {
  FREE: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-200 dark:border-zinc-800', ring: 'ring-zinc-500/20' },
  PRO: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-500/20' },
  WHALE: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-300 dark:border-violet-700', ring: 'ring-violet-500/30' },
  BUSINESS: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-500/20' },
};

const PLAN_ICONS: Record<SubscriptionPlan, React.ElementType> = {
  FREE: Shield,
  PRO: Zap,
  WHALE: Crown,
  BUSINESS: Sparkles,
};

type BillingCycle = 'MONTHLY' | 'YEARLY';

function formatPrice(price: number): string {
  if (price === 0) return 'مجاني';
  return `${price.toLocaleString('en-US')}`;
}

function formatNumber(n: number): string {
  if (n == null) return '0';
  if (n === Infinity || n >= 999_999_999) return 'غير محدود';
  return n.toLocaleString('en-US');
}

function formatBytes(bytes: number): string {
  if (bytes == null) return '0';
  if (bytes === Infinity || bytes >= 999_999_999_999) return 'غير محدود';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb % 1 === 0 ? 0 : 1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');

  const { data, isLoading } = useQuery({
    queryKey: ['plans-overview'],
    queryFn: getPlansOverview,
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="size-4 rotate-180" />
            الرئيسية
          </Link>
          <Link
            href="/app"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            لوحة التحكم
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-foreground"
        >
          اختر الباقة المناسبة لك
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto"
        >
          ابدأ مجاناً وقم بالترقية عندما تحتاج المزيد من الميزات والمساحة
        </motion.p>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1"
        >
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-medium transition-all',
              billingCycle === 'MONTHLY'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            شهري
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-medium transition-all',
              billingCycle === 'YEARLY'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            سنوي
            <span className="mr-1.5 text-[10px] text-emerald-500 font-bold">وفر 20%</span>
          </button>
        </motion.div>
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.plans ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                index={index}
                isPopular={plan.id === 'WHALE'}
              />
            ))}
          </div>
        ) : null}

        {/* Features comparison */}
        {data?.plans && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16"
          >
            <h2 className="text-xl font-bold text-foreground text-center mb-8">مقارنة الميزات</h2>
            <FeaturesComparison plans={data.plans} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Plan Card
// ═══════════════════════════════════════════════════════════════════════════

function PlanCard({
  plan,
  billingCycle,
  index,
  isPopular,
}: {
  plan: PlanOverviewItem;
  billingCycle: BillingCycle;
  index: number;
  isPopular: boolean;
}) {
  const colors = PLAN_COLORS[plan.id];
  const PlanIcon = PLAN_ICONS[plan.id];
  const price = billingCycle === 'YEARLY' ? plan.price.yearly : plan.price.monthly;
  const isFree = plan.id === 'FREE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative rounded-2xl border-2 p-5 transition-all hover:shadow-lg',
        isPopular ? `${colors.border} ring-2 ${colors.ring} shadow-md` : 'border-border/50'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-violet-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
            الأكثر شعبية ⭐
          </span>
        </div>
      )}

      <div className={cn('flex size-11 items-center justify-center rounded-xl mb-4', colors.bg)}>
        <PlanIcon className={cn('size-5', colors.text)} />
      </div>

      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{plan.nameEn}</p>

      <div className="mt-4 mb-5">
        {isFree ? (
          <span className="text-2xl font-bold text-foreground">مجاني</span>
        ) : (
          <>
            <span className="text-2xl font-bold text-foreground">{formatPrice(price)}</span>
            <span className="text-xs text-muted-foreground mr-1">
              د.ع / {billingCycle === 'YEARLY' ? 'سنة' : 'شهر'}
            </span>
            {billingCycle === 'YEARLY' && (
              <p className="text-[10px] text-muted-foreground mt-1">
                ≈ {formatPrice(Math.round(plan.price.yearly / 12))} د.ع / شهر
              </p>
            )}
          </>
        )}
      </div>

      <Link
        href={isFree ? '/app' : '/app/settings/billing'}
        className={cn(
          'block w-full rounded-xl px-4 py-2.5 text-center text-xs font-bold transition-all',
          isFree
            ? 'bg-muted text-foreground hover:bg-muted/80'
            : isPopular
            ? 'bg-gradient-to-l from-violet-500 to-violet-600 text-white hover:shadow-md hover:shadow-violet-500/20'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}
      </Link>

      {/* Key features */}
      <div className="mt-5 space-y-2">
        <PlanFeature text={`${formatBytes(plan.limits.storageBytes)} تخزين`} enabled />
        <PlanFeature text={`${formatNumber(plan.limits.categories)} تصنيف`} enabled />
        <PlanFeature text={`${formatNumber(plan.limits.maxSessions)} جلسات`} enabled />
        <PlanFeature text={`${formatNumber(plan.limits.imagesPerProduct)} صور/منتج`} enabled />
        <PlanFeature text="منتجات رقمية" enabled={plan.limits.digitalProducts} />
        <PlanFeature text="إزالة العلامة المائية" enabled={plan.limits.removeWatermark} />
        <PlanFeature text="Google Sheets" enabled={plan.limits.googleSheets} />
        <PlanFeature text="تحليلات متقدمة" enabled={plan.limits.storeAnalytics !== false} />
      </div>
    </motion.div>
  );
}

function PlanFeature({ text, enabled }: { text: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {enabled ? (
        <Check className="size-3.5 text-emerald-500 shrink-0" />
      ) : (
        <X className="size-3.5 text-muted-foreground/30 shrink-0" />
      )}
      <span className={cn(enabled ? 'text-foreground' : 'text-muted-foreground/50')}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Features Comparison Table
// ═══════════════════════════════════════════════════════════════════════════

function FeaturesComparison({ plans }: { plans: PlanOverviewItem[] }) {
  type FeatureRow = {
    label: string;
    getValue: (p: PlanOverviewItem) => string | boolean | number;
  };

  const sections: { title: string; features: FeatureRow[] }[] = [
    {
      title: 'المتجر',
      features: [
        { label: 'المنتجات', getValue: (p) => formatNumber(p.limits.products) },
        { label: 'التصنيفات', getValue: (p) => formatNumber(p.limits.categories) },
        { label: 'الكوبونات', getValue: (p) => formatNumber(p.limits.coupons) },
        { label: 'صور لكل منتج', getValue: (p) => formatNumber(p.limits.imagesPerProduct) },
        { label: 'المنتجات الرقمية', getValue: (p) => p.limits.digitalProducts },
        { label: 'قائمة الأمنيات', getValue: (p) => p.limits.wishlist },
        { label: 'تقييمات المنتجات', getValue: (p) => p.limits.productReviews },
        { label: 'تحليلات المتجر', getValue: (p) => p.limits.storeAnalytics === false ? false : p.limits.storeAnalytics },
      ],
    },
    {
      title: 'الروابط',
      features: [
        { label: 'الروابط', getValue: (p) => formatNumber(p.limits.links) },
        { label: 'مجموعات الروابط', getValue: (p) => formatNumber(p.limits.linkGroups) },
        { label: 'صورة الغلاف', getValue: (p) => p.limits.coverPhoto },
        { label: 'إزالة العلامة المائية', getValue: (p) => p.limits.removeWatermark },
        { label: 'روابط مخصصة قصيرة', getValue: (p) => p.limits.customShortLinks },
        { label: 'رمز QR مخصص', getValue: (p) => p.limits.customQr },
      ],
    },
    {
      title: 'النماذج',
      features: [
        { label: 'النماذج', getValue: (p) => formatNumber(p.limits.forms) },
        { label: 'نماذج متعددة الخطوات', getValue: (p) => p.limits.multiStepForms },
        { label: 'المنطق الشرطي', getValue: (p) => p.limits.conditionalLogic === false ? false : p.limits.conditionalLogic },
        { label: 'Google Sheets', getValue: (p) => p.limits.googleSheets },
        { label: 'Webhook', getValue: (p) => p.limits.webhook },
      ],
    },
    {
      title: 'التكاملات',
      features: [
        { label: 'Instagram', getValue: (p) => p.limits.integrationInstagram },
        { label: 'YouTube', getValue: (p) => p.limits.integrationYoutube === false ? false : p.limits.integrationYoutube },
        { label: 'LinkedIn', getValue: (p) => p.limits.integrationLinkedin === false ? false : p.limits.integrationLinkedin },
        { label: 'Google Calendar', getValue: (p) => p.limits.integrationGoogleCalendar },
        { label: 'Google Analytics', getValue: (p) => p.limits.integrationGoogleAnalytics },
        { label: 'Telegram', getValue: (p) => p.limits.integrationTelegram },
      ],
    },
    {
      title: 'الأمان والتخزين',
      features: [
        { label: 'التخزين', getValue: (p) => formatBytes(p.limits.storageBytes) },
        { label: 'الجلسات النشطة', getValue: (p) => formatNumber(p.limits.maxSessions) },
        { label: 'سجل الأمان', getValue: (p) => p.limits.securityLog === false ? false : (p.limits.securityLog === 'full' ? 'كامل' : `${p.limits.securityLog} يوم`) },
        { label: 'كشف الأنشطة المشبوهة', getValue: (p) => p.limits.anomalyDetection },
        { label: 'الأجهزة الموثوقة', getValue: (p) => p.limits.trustedDevices },
        { label: 'سرعة الدعم', getValue: (p) => `${p.limits.supportResponseHours} ساعة` },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-right py-3 px-4 font-semibold text-foreground w-[200px]">الميزة</th>
            {plans.map((p) => (
              <th key={p.id} className="py-3 px-3 text-center font-semibold text-foreground min-w-[100px]">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.title}>
              <tr className="bg-muted/15">
                <td colSpan={plans.length + 1} className="py-2 px-4 text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
                  {section.title}
                </td>
              </tr>
              {section.features.map((feature) => (
                <tr key={feature.label} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                  <td className="py-2.5 px-4 text-muted-foreground">{feature.label}</td>
                  {plans.map((p) => {
                    const val = feature.getValue(p);
                    return (
                      <td key={p.id} className="py-2.5 px-3 text-center">
                        {typeof val === 'boolean' ? (
                          val ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-muted-foreground/25 mx-auto" />
                        ) : (
                          <span className="text-foreground font-medium">
                            {(() => {
                              const levelLabels: Record<string, string> = { basic: 'أساسي', advanced: 'متقدم', full: 'كامل', single: 'واحد', all: 'الكل', card: 'بطاقة', 'card+post': 'بطاقة+منشور', csv: 'CSV', 'csv+pdf': 'CSV+PDF' };
                              return levelLabels[val as string] ?? val;
                            })()}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
