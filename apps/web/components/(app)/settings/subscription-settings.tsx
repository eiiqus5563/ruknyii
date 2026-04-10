'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Zap,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  CreditCard,
  Shield,
  Sparkles,
  ArrowUpCircle,
  Database,
  Users,
  HardDrive,
  ShoppingBag,
  Tag,
  Ticket,
  FileText,
  Link2,
  Inbox,
  Pen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/(app)/settings';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getMySubscription,
  getMyUsage,
  getPlansOverview,
  upgradePlan,
  cancelSubscription,
  type SubscriptionPlan,
  type BillingCycle,
  type SubscriptionDetails,
  type UsageSummary,
  type PlanOverviewItem,
} from '@/lib/api/subscriptions';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Helpers
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_META: Record<SubscriptionPlan, { icon: React.ElementType; label: string; bg: string; text: string; border: string }> = {
  FREE:     { icon: Shield,   label: 'المجانية',  bg: 'bg-zinc-500/10',   text: 'text-zinc-500',   border: 'border-zinc-200 dark:border-zinc-800' },
  PRO:      { icon: Zap,      label: 'الاحترافية', bg: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'border-blue-200 dark:border-blue-800' },
  WHALE:    { icon: Crown,    label: 'الحوت',     bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-200 dark:border-violet-800' },
  BUSINESS: { icon: Sparkles, label: 'الأعمال',   bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-200 dark:border-amber-800' },
};

const PLAN_ORDER: Record<SubscriptionPlan, number> = { FREE: 0, PRO: 1, WHALE: 2, BUSINESS: 3 };

function fmt(n: number | null | undefined): string {
  if (n == null) return '0';
  if (!isFinite(n) || n >= 999_999_999) return '∞';
  return n.toLocaleString('en-US');
}

function fmtBytes(b: number | null | undefined): string {
  if (b == null) return '0';
  if (!isFinite(b) || b >= 999_999_999_999) return '∞';
  const gb = b / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(gb % 1 === 0 ? 0 : 1)} GB`;
  return `${(b / (1024 ** 2)).toFixed(0)} MB`;
}

function fmtPrice(p: number): string {
  if (p === 0) return 'مجاني';
  return `${p.toLocaleString('en-US')} د.ع`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function SubscriptionSettings() {
  const queryClient = useQueryClient();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: getMySubscription,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['subscription-usage'],
    queryFn: getMyUsage,
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans-overview'],
    queryFn: getPlansOverview,
  });

  if (subLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) return null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    queryClient.invalidateQueries({ queryKey: ['subscription-usage'] });
  };

  return (
    <div className="space-y-5 mt-2" dir="rtl">
      {/* Row 1: Current Plan + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <CurrentPlanSection subscription={subscription} />
        <QuickActionsSection
          subscription={subscription}
          onUpgrade={() => setShowUpgrade(true)}
          onCancel={() => setShowCancel(true)}
        />
      </div>

      {/* Row 2: Usage */}
      {usage && <UsageSection usage={usage} />}

      {/* Modals */}
      <AnimatePresence>
        {showUpgrade && plansData && (
          <UpgradeModal
            plans={plansData.plans}
            currentPlan={subscription.plan}
            onClose={() => setShowUpgrade(false)}
            onSuccess={() => { setShowUpgrade(false); invalidateAll(); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCancel && (
          <CancelModal
            subscription={subscription}
            onClose={() => setShowCancel(false)}
            onSuccess={() => { setShowCancel(false); invalidateAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Current Plan Section
// ═══════════════════════════════════════════════════════════════════════════

function CurrentPlanSection({ subscription }: { subscription: SubscriptionDetails }) {
  const meta = PLAN_META[subscription.plan];
  const PlanIcon = meta.icon;
  const isFree = subscription.plan === 'FREE';

  return (
    <SettingsSection className="h-full" title="الباقة الحالية" description="تفاصيل اشتراكك">
      <div className="space-y-3">
        {/* Plan Row */}
        <SettingsRow>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', meta.bg)}>
              <PlanIcon className={cn('size-4', meta.text)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-foreground">باقة {meta.label}</p>
                <StatusBadge status={subscription.status} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isFree ? 'الباقة الأساسية المجانية' : (subscription.billingCycle === 'MONTHLY' ? 'اشتراك شهري' : 'اشتراك سنوي')}
              </p>
            </div>
          </div>
        </SettingsRow>

        {/* Period Info */}
        {!isFree && subscription.currentPeriodEnd && (
          <>
            <SettingsRow>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">تاريخ البدء</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(subscription.currentPeriodStart)}</p>
                </div>
              </div>
            </SettingsRow>

            <SettingsRow>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {subscription.status === 'CANCELLED' ? 'ينتهي في' : 'يتجدد في'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(subscription.currentPeriodEnd)}</p>
                </div>
              </div>
            </SettingsRow>
          </>
        )}

        {/* Cancellation Warning */}
        {subscription.status === 'CANCELLED' && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
              <p className="text-[12px] font-medium text-foreground">الاشتراك ملغي</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ستبقى الميزات متاحة حتى {fmtDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Actions Section
// ═══════════════════════════════════════════════════════════════════════════

function QuickActionsSection({
  subscription,
  onUpgrade,
  onCancel,
}: {
  subscription: SubscriptionDetails;
  onUpgrade: () => void;
  onCancel: () => void;
}) {
  const isFree = subscription.plan === 'FREE';
  const canUpgrade = PLAN_ORDER[subscription.plan] < 3;

  return (
    <SettingsSection className="h-full" title="إدارة الباقة" description="ترقية أو إلغاء اشتراكك">
      <div className="space-y-3">
        {/* Upgrade */}
        {(isFree || canUpgrade) && (
          <SettingsRow
            className="cursor-pointer hover:bg-background/70 active:scale-[0.99]"
            onClick={onUpgrade}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <ArrowUpCircle className="size-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">ترقية الباقة</p>
                <p className="text-[11px] text-muted-foreground">احصل على ميزات أكثر ومساحة أكبر</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
              ترقية
            </Badge>
          </SettingsRow>
        )}

        {/* Plan Features Summary */}
        <SettingsRow>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Database className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">التخزين</p>
              <p className="text-[11px] text-muted-foreground">{fmtBytes(subscription.limits?.storageBytes)}</p>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">الجلسات النشطة</p>
              <p className="text-[11px] text-muted-foreground">{fmt(subscription.limits?.maxSessions)}</p>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">سرعة الدعم</p>
              <p className="text-[11px] text-muted-foreground">{subscription.limits?.supportResponseHours} ساعة</p>
            </div>
          </div>
        </SettingsRow>

        {/* Cancel */}
        {!isFree && subscription.status === 'ACTIVE' && (
          <button
            onClick={onCancel}
            className="w-full rounded-xl bg-background/50 px-4 py-3 text-[12px] font-medium text-muted-foreground transition-all duration-300 hover:bg-destructive/5 hover:text-destructive active:scale-[0.99]"
          >
            إلغاء الاشتراك
          </button>
        )}
      </div>
    </SettingsSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Status Badge
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: SubscriptionDetails['status'] }) {
  const map = {
    ACTIVE:    { label: 'نشط',   cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    EXPIRED:   { label: 'منتهي', cls: 'bg-destructive/10 text-destructive' },
    CANCELLED: { label: 'ملغي',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    PAST_DUE:  { label: 'متأخر', cls: 'bg-destructive/10 text-destructive' },
  };
  const c = map[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', c.cls)}>
      {c.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Usage Section
// ═══════════════════════════════════════════════════════════════════════════

const USAGE_ITEMS: { key: keyof UsageSummary['usage']; label: string; icon: React.ElementType; isBytes?: boolean }[] = [
  { key: 'storage',              label: 'التخزين',               icon: HardDrive,   isBytes: true },
  { key: 'products',             label: 'المنتجات',              icon: ShoppingBag },
  { key: 'categories',           label: 'التصنيفات',             icon: Tag },
  { key: 'coupons',              label: 'الكوبونات',             icon: Ticket },
  { key: 'forms',                label: 'النماذج',               icon: FileText },
  { key: 'links',                label: 'الروابط',               icon: Link2 },
  { key: 'linkGroups',           label: 'مجموعات الروابط',       icon: Link2 },
  { key: 'sessions',             label: 'الجلسات النشطة',        icon: Users },
  { key: 'submissionsThisMonth', label: 'الإرسالات (هذا الشهر)', icon: Inbox },
  { key: 'postsToday',           label: 'المنشورات (اليوم)',     icon: Pen },
];

function UsageSection({ usage }: { usage: UsageSummary }) {
  return (
    <SettingsSection title="الاستخدام" description="ملخص استخدامك الحالي مقارنة بحدود باقتك">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {USAGE_ITEMS.map((item, index) => {
          const data = usage.usage[item.key];
          if (!data) return null;
          const isUnlimited = !isFinite(data.limit) || data.limit >= 999_999_999;
          const pct = isUnlimited ? 0 : data.limit > 0 ? Math.min((data.used / data.limit) * 100, 100) : 0;
          const isNear = !isUnlimited && pct >= 80;
          const isAt = !isUnlimited && pct >= 100;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className={cn(
                'rounded-xl bg-background/50 px-4 py-3 transition-all duration-300',
                isAt && 'ring-1 ring-destructive/30 bg-destructive/5',
                isNear && !isAt && 'ring-1 ring-amber-500/30 bg-amber-500/5'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg',
                  isAt ? 'bg-destructive/10' : isNear ? 'bg-amber-500/10' : 'bg-primary/10'
                )}>
                  <Icon className={cn(
                    'size-3.5',
                    isAt ? 'text-destructive' : isNear ? 'text-amber-500' : 'text-primary'
                  )} />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {item.isBytes ? fmtBytes(data.used) : fmt(data.used)}
                    {' / '}
                    {item.isBytes ? fmtBytes(data.limit) : fmt(data.limit)}
                  </span>
                </div>
              </div>
              {!isUnlimited && data.limit > 0 ? (
                <Progress
                  value={pct}
                  className={cn(
                    'h-1.5',
                    isAt && '[&>[data-slot=progress-indicator]]:bg-destructive',
                    isNear && !isAt && '[&>[data-slot=progress-indicator]]:bg-amber-500'
                  )}
                />
              ) : (
                <div className="h-1.5 rounded-full bg-muted/50" />
              )}
            </motion.div>
          );
        })}
      </div>
    </SettingsSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Upgrade Modal
// ═══════════════════════════════════════════════════════════════════════════

function UpgradeModal({
  plans,
  currentPlan,
  onClose,
  onSuccess,
}: {
  plans: PlanOverviewItem[];
  currentPlan: SubscriptionPlan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan) throw new Error('No plan selected');
      return upgradePlan(selectedPlan, billingCycle);
    },
    onSuccess: () => {
      toast.success('تم ترقية الباقة بنجاح! 🎉');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'حدث خطأ أثناء الترقية');
    },
  });

  const available = plans.filter((p) => PLAN_ORDER[p.id] > PLAN_ORDER[currentPlan]);
  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-background border border-border/50 shadow-xl [&::-webkit-scrollbar]:hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-sm px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">ترقية الباقة</h2>
            <p className="mt-1 text-xs text-muted-foreground">اختر الباقة المناسبة لاحتياجاتك</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 rounded-full bg-muted/30 p-1">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={cn(
                'flex-1 rounded-full px-5 py-2.5 text-xs font-medium transition-all duration-200',
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
                'flex-1 rounded-full px-5 py-2.5 text-xs font-medium transition-all duration-200',
                billingCycle === 'YEARLY'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              سنوي
              <span className="mr-1.5 text-[10px] text-emerald-500 font-bold">وفر 20%</span>
            </button>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {available.map((plan, i) => {
              const m = PLAN_META[plan.id];
              const PIcon = m.icon;
              const price = billingCycle === 'YEARLY' ? plan.price.yearly : plan.price.monthly;
              const isSel = selectedPlan === plan.id;
              const isPop = plan.id === 'WHALE';

              return (
                <motion.button
                  key={plan.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'relative flex flex-col items-center rounded-2xl border bg-muted/20 p-5 text-center transition-all duration-200 active:scale-[0.98]',
                    isSel ? `${m.border} shadow-sm bg-muted/40` : 'border-border/30 hover:border-border/60'
                  )}
                >
                  {isPop && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-2.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                      الأكثر شعبية
                    </span>
                  )}
                  <div className={cn('flex size-11 items-center justify-center rounded-full mb-3', m.bg)}>
                    <PIcon className={cn('size-5', m.text)} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-base font-bold text-foreground tabular-nums">{fmtPrice(price)}</span>
                    <span className="text-[10px] text-muted-foreground mr-1">
                      / {billingCycle === 'YEARLY' ? 'سنة' : 'شهر'}
                    </span>
                  </div>
                  {billingCycle === 'YEARLY' && (
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      ≈ {fmtPrice(Math.round(plan.price.yearly / 12))} / شهر
                    </p>
                  )}
                  {isSel && (
                    <div className="absolute top-3 left-3">
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                        <Check className="size-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Features */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-2xl bg-muted/30 p-4 sm:p-5"
            >
              <h4 className="text-xs font-semibold text-foreground mb-3">مميزات باقة {selected.name}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <FeatureRow label="التخزين" value={fmtBytes(selected.limits.storageBytes)} />
                <FeatureRow label="التصنيفات" value={fmt(selected.limits.categories)} />
                <FeatureRow label="الكوبونات" value={fmt(selected.limits.coupons)} />
                <FeatureRow label="صور لكل منتج" value={fmt(selected.limits.imagesPerProduct)} />
                <FeatureRow label="الجلسات" value={fmt(selected.limits.maxSessions)} />
                <FeatureRow label="مجموعات الروابط" value={fmt(selected.limits.linkGroups)} />
                <FeatureRow label="المنتجات الرقمية" value={selected.limits.digitalProducts} />
                <FeatureRow label="Google Sheets" value={selected.limits.googleSheets} />
                <FeatureRow label="إزالة العلامة المائية" value={selected.limits.removeWatermark} />
                <FeatureRow label="تحليلات المتجر" value={selected.limits.storeAnalytics} />
              </div>
            </motion.div>
          )}

          {/* Confirm */}
          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedPlan || mutation.isPending}
            className={cn(
              'w-full h-12 rounded-full text-sm font-semibold text-primary-foreground transition-all',
              'bg-primary hover:bg-primary/90 active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin mx-auto" />
            ) : selectedPlan ? (
              `ترقية إلى ${plans.find((p) => p.id === selectedPlan)?.name}`
            ) : (
              'اختر باقة'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Feature Row (inside upgrade modal)
// ═══════════════════════════════════════════════════════════════════════════

function FeatureRow({ label, value }: { label: string; value: string | boolean | number }) {
  const levelMap: Record<string, string> = { basic: 'أساسي', advanced: 'متقدم', full: 'كامل' };
  let display: React.ReactNode;
  if (typeof value === 'boolean') {
    display = value
      ? <Check className="size-3.5 text-emerald-500" />
      : <X className="size-3.5 text-muted-foreground/30" />;
  } else {
    display = <span className="text-foreground font-medium">{levelMap[String(value)] ?? value}</span>;
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {display}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Cancel Modal
// ═══════════════════════════════════════════════════════════════════════════

function CancelModal({
  subscription,
  onClose,
  onSuccess,
}: {
  subscription: SubscriptionDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const mutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success('تم إلغاء الاشتراك. ستبقى الميزات متاحة حتى نهاية الفترة الحالية.');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'حدث خطأ أثناء الإلغاء');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-background border border-border/50 shadow-xl p-5 sm:p-6"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">إلغاء الاشتراك</h3>
            <p className="text-xs text-muted-foreground mt-0.5">هل أنت متأكد من رغبتك بالإلغاء؟</p>
          </div>
        </div>

        {/* Warning box */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-5 space-y-2">
          <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            <span>ستفقد الوصول لميزات الباقة المدفوعة بعد انتهاء الفترة الحالية</span>
          </div>
          <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-300">
            <Calendar className="size-3.5 mt-0.5 shrink-0" />
            <span>ستبقى الميزات متاحة حتى {fmtDate(subscription.currentPeriodEnd)}</span>
          </div>
          <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-300">
            <Shield className="size-3.5 mt-0.5 shrink-0" />
            <span>سيتم تحويلك تلقائياً للباقة المجانية</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-[13px] font-medium text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98]"
          >
            تراجع
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-destructive text-[13px] font-semibold text-destructive-foreground transition-all duration-200 hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'تأكيد الإلغاء'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
