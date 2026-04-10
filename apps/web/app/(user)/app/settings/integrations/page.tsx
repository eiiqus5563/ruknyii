'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  GitMerge,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  CalendarDays,
  CalendarCheck,
  Tv,
  Video,
  Users,
  ArrowLeftRight,
  HardDrive,
  ImageIcon,
  FileText,
  Trash2,
  BarChart3,
  Crown,
  Link2,
  TrendingUp,
  Eye,
  ShoppingCart,
  MousePointerClick,
  LayoutGrid,
  Images,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ToggleSwitch } from '@/components/(app)/settings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getGoogleCalendarAuthUrl,
  exchangeGoogleCalendarCode,
  unlinkGoogleCalendar,
} from '@/actions/google-calendar';
import { type StorageUsage } from '@/actions/storage';
import {
  updateAnalyticsSettings,
  disconnectAnalytics,
  type AnalyticsSettings,
} from '@/actions/google-analytics';
import {
  fetchGoogleCalendarStatus,
  fetchStorageUsage,
  fetchAnalyticsSettings,
} from '@/lib/api/settings-client';
import {
  getInstagramStatus,
  disconnectInstagram,
  type InstagramConnection,
} from '@/lib/api/instagram';
import {
  getYouTubeStatus,
  disconnectYouTube,
  type YouTubeConnection,
} from '@/lib/api/youtube';
import { API_EXTERNAL_URL } from '@/lib/config';

// ─── Constants ───────────────────────────────────────────────

const CAL_FEATURES = [
  { icon: CalendarDays, label: 'مزامنة الأحداث', desc: 'أحداثك تُضاف تلقائياً لتقويم Google' },
  { icon: Video, label: 'Google Meet', desc: 'إنشاء روابط اجتماع تلقائياً' },
  { icon: Users, label: 'إدارة الحضور', desc: 'إرسال دعوات وتتبع الاستجابات' },
  { icon: ArrowLeftRight, label: 'تحديث ثنائي', desc: 'أي تعديل هنا ينعكس على التقويم' },
];

const SCOPES = ['إنشاء الأحداث', 'تحديث الأحداث', 'حذف الأحداث', 'روابط Google Meet', 'إدارة الحضور'];

const COMING_SOON = [
  { icon: '/icons/telegram.svg', label: 'تيليجرام', desc: 'إشعارات فورية وأوامر سريعة عبر بوت تيليجرام', color: '#0088CC' },
  { icon: '/icons/whatsapp.svg', label: 'واتساب بزنس', desc: 'إرسال تأكيد الطلبات وتحديثات التوصيل للعملاء', color: '#25D366' },
];

const IG_FEATURES = [
  { icon: LayoutGrid, label: 'شبكة 3×3', desc: 'عرض شبكة منشوراتك مع روابط للمنتجات' },
  { icon: Images, label: 'معرض أفقي', desc: 'عرض أحدث المنشورات والـ Reels' },
  { icon: Link2, label: 'روابط المنشورات', desc: 'إضافة رابط لكل منشور في الشبكة' },
];

const YT_FEATURES = [
  { icon: Tv, label: 'أحدث الفيديوهات', desc: 'عرض آخر الفيديوهات تلقائياً' },
  { icon: Video, label: 'تضمين فيديو', desc: 'تضمين فيديو محدد كبطاقة غنية' },
  { icon: Link2, label: 'رابط القناة', desc: 'رابط مباشر لقناتك' },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof ImageIcon }> = {
  AVATAR: { label: 'الصور الشخصية', icon: ImageIcon },
  COVER: { label: 'صور الغلاف', icon: ImageIcon },
  PRODUCT_IMAGE: { label: 'صور المنتجات', icon: ImageIcon },
  EVENT_COVER: { label: 'صور الأحداث', icon: CalendarDays },
  EVENT_GALLERY: { label: 'معرض الأحداث', icon: ImageIcon },
  FORM_COVER: { label: 'أغلفة النماذج', icon: FileText },
  FORM_BANNER: { label: 'بنرات النماذج', icon: FileText },
  FORM_SUBMISSION: { label: 'مرفقات النماذج', icon: FileText },
  BANNER: { label: 'البنرات', icon: ImageIcon },
};

// ─── Helpers ─────────────────────────────────────────────────

function formatSyncTime(dateStr?: string) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

// ─── Storage Usage Dialog ────────────────────────────────────

function StorageDialog({
  open,
  onOpenChange,
  usage,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usage: StorageUsage | null;
  loading: boolean;
}) {
  const categories = usage?.categoryBreakdown
    ? Object.entries(usage.categoryBreakdown)
        .filter(([, size]) => size > 0)
        .sort(([, a], [, b]) => b - a)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <HardDrive className="size-4 text-primary" />
            تفاصيل التخزين
          </DialogTitle>
        </DialogHeader>

        {loading || !usage ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Main usage bar */}
            <div className="space-y-2.5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[22px] font-bold text-foreground">
                    {formatBytes(usage.used)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    من أصل {formatBytes(usage.limit)}
                  </p>
                </div>
                <p className={cn('text-[13px] font-semibold', usage.percentage > 85 ? 'text-destructive' : 'text-primary')}>
                  {usage.percentage}%
                </p>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', usage.percentage > 85 ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{usage.files} ملف</span>
                <span>متاح: {formatBytes(usage.available)}</span>
              </div>
            </div>

            {/* Category breakdown */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-foreground">توزيع التخزين</p>
                <div className="space-y-1.5">
                  {categories.map(([cat, size]) => {
                    const meta = CATEGORY_LABELS[cat] || { label: cat, icon: FileText };
                    const Icon = meta.icon;
                    const pct = usage.limit > 0 ? Math.round((size / usage.limit) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="size-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground">{meta.label}</span>
                            <span className="text-[10px] text-muted-foreground">{formatBytes(size)}</span>
                          </div>
                          <div className="h-1 w-full rounded-full overflow-hidden bg-muted">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trash */}
            {usage.trashUsed > 0 && (
              <div className="flex items-center gap-2.5 rounded-2xl p-3 bg-muted/30">
                <Trash2 className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[11px] font-medium text-foreground">سلة المحذوفات</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(usage.trashUsed)} — تُحذف نهائياً بعد 30 يوم</p>
                </div>
              </div>
            )}

            {/* Upgrade hint */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 p-3">
              <Crown className="size-4 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-foreground">تحتاج مساحة أكبر؟</p>
                <p className="text-[10px] text-muted-foreground">ترقية إلى باقة مدفوعة للحصول على مساحة إضافية — قريباً</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function IntegrationsSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Google Calendar state
  const [isLoading, setIsLoading] = useState(true);
  const [isLinked, setIsLinked] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const exchangeAttempted = useRef(false);

  // S3 Storage state
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageDialogOpen, setStorageDialogOpen] = useState(false);

  // Google Analytics state
  const [gaSettings, setGaSettings] = useState<AnalyticsSettings | null>(null);
  const [gaLoading, setGaLoading] = useState(true);
  const [gaDialogOpen, setGaDialogOpen] = useState(false);
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [gaSaving, setGaSaving] = useState(false);
  const [gaDisconnecting, setGaDisconnecting] = useState(false);

  // Instagram state
  const [igConnected, setIgConnected] = useState(false);
  const [igConnection, setIgConnection] = useState<InstagramConnection | null>(null);
  const [igLoading, setIgLoading] = useState(true);
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  // YouTube state
  const [ytConnected, setYtConnected] = useState(false);
  const [ytConnection, setYtConnection] = useState<YouTubeConnection | null>(null);
  const [ytLoading, setYtLoading] = useState(true);
  const [ytDisconnecting, setYtDisconnecting] = useState(false);

  // Load all statuses (client-side GET, not server action POST)
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setStorageLoading(true);
      setGaLoading(true);
      setIgLoading(true);
      setYtLoading(true);
      const [calRes, storRes, gaRes, igRes, ytRes] = await Promise.all([
        fetchGoogleCalendarStatus(),
        fetchStorageUsage(),
        fetchAnalyticsSettings(),
        getInstagramStatus().catch(() => ({ connected: false, connection: null })),
        getYouTubeStatus().catch(() => ({ connected: false, connection: null })),
      ]);
      if (calRes.data) {
        setIsLinked(calRes.data.linked);
        if (calRes.data.linked) setLastSync(new Date().toISOString());
      }
      if (storRes.data) setStorageUsage(storRes.data);
      if (gaRes.data) {
        setGaSettings(gaRes.data);
        if (gaRes.data.googleAnalyticsId) setGaMeasurementId(gaRes.data.googleAnalyticsId);
      }
      setIgConnected(igRes.connected);
      setIgConnection(igRes.connection);
      setYtConnected(ytRes.connected);
      setYtConnection(ytRes.connection);
      setIgLoading(false);
      setYtLoading(false);
      setGaLoading(false);
      setStorageLoading(false);
      setIsLoading(false);
    })();
  }, []);

  // OAuth callback
  useEffect(() => {
    const code = searchParams.get('google_code');
    const err = searchParams.get('google_error');
    if (err) { toast.error('فشل في ربط تقويم Google: ' + err); router.replace('/app/settings/integrations'); return; }
    if (code && !exchangeAttempted.current) {
      exchangeAttempted.current = true;
      (async () => {
        setIsConnecting(true);
        const { error } = await exchangeGoogleCalendarCode(code);
        setIsConnecting(false);
        if (error) { toast.error(error); } else { setIsLinked(true); setLastSync(new Date().toISOString()); toast.success('تم ربط تقويم Google بنجاح!'); }
        router.replace('/app/settings/integrations');
      })();
    }
  }, [searchParams, router, toast]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    const { data: authUrl, error } = await getGoogleCalendarAuthUrl('/app/settings/integrations');
    setIsConnecting(false);
    if (error || !authUrl) { toast.error(error || 'فشل في بدء عملية الربط'); return; }
    window.location.href = authUrl;
  }, [toast]);

  const handleUnlink = useCallback(async () => {
    setIsUnlinking(true);
    const { error } = await unlinkGoogleCalendar();
    setIsUnlinking(false);
    if (error) { toast.error(error); return; }
    setIsLinked(false); setLastSync(null); setAutoSync(true); setCalendarDialogOpen(false);
    toast.success('تم إلغاء ربط تقويم Google');
  }, [toast]);

  const handleOpenStorageDialog = useCallback(async () => {
    setStorageDialogOpen(true);
    if (!storageUsage) {
      setStorageLoading(true);
      const { data } = await fetchStorageUsage();
      if (data) setStorageUsage(data);
      setStorageLoading(false);
    }
  }, [storageUsage]);

  const handleConnectGA = useCallback(async () => {
    const trimmed = gaMeasurementId.trim();
    if (!trimmed || !/^G-[A-Z0-9]+$/.test(trimmed)) {
      toast.error('معرّف القياس غير صالح — يجب أن يبدأ بـ G-');
      return;
    }
    setGaSaving(true);
    const { data, error } = await updateAnalyticsSettings(trimmed);
    setGaSaving(false);
    if (error) { toast.error(error); return; }
    if (data) { setGaSettings(data); setGaMeasurementId(data.googleAnalyticsId); }
    setGaDialogOpen(false);
    toast.success('تم ربط Google Analytics بنجاح!');
  }, [gaMeasurementId, toast]);

  const handleDisconnectGA = useCallback(async () => {
    setGaDisconnecting(true);
    const { data, error } = await disconnectAnalytics();
    setGaDisconnecting(false);
    if (error) { toast.error(error); return; }
    if (data) setGaSettings(data);
    setGaMeasurementId('');
    setGaDialogOpen(false);
    toast.success('تم إلغاء ربط Google Analytics');
  }, [toast]);

  const handleConnectInstagram = useCallback(() => {
    window.location.href = `${API_EXTERNAL_URL}/integrations/instagram/auth`;
  }, []);

  const handleDisconnectInstagram = useCallback(async () => {
    setIgDisconnecting(true);
    try {
      await disconnectInstagram();
      setIgConnected(false);
      setIgConnection(null);
      toast.success('تم إلغاء ربط إنستغرام');
    } catch {
      toast.error('فشل في إلغاء ربط إنستغرام');
    } finally {
      setIgDisconnecting(false);
    }
  }, [toast]);

  const handleReconnectInstagram = useCallback(async () => {
    setIgDisconnecting(true);
    try {
      await disconnectInstagram();
      setIgConnected(false);
      setIgConnection(null);
      window.location.href = `${API_EXTERNAL_URL}/integrations/instagram/auth`;
    } catch {
      toast.error('فشل في إعادة الربط');
      setIgDisconnecting(false);
    }
  }, [toast]);

  const handleConnectYouTube = useCallback(() => {
    window.location.href = `${API_EXTERNAL_URL}/integrations/youtube/auth`;
  }, []);

  const handleDisconnectYouTube = useCallback(async () => {
    setYtDisconnecting(true);
    try {
      await disconnectYouTube();
      setYtConnected(false);
      setYtConnection(null);
      toast.success('تم إلغاء ربط YouTube');
    } catch {
      toast.error('فشل في إلغاء ربط YouTube');
    } finally {
      setYtDisconnecting(false);
    }
  }, [toast]);

  const handleReconnectYouTube = useCallback(async () => {
    setYtDisconnecting(true);
    try {
      await disconnectYouTube();
      setYtConnected(false);
      setYtConnection(null);
      window.location.href = `${API_EXTERNAL_URL}/integrations/youtube/auth`;
    } catch {
      toast.error('فشل في إعادة الربط');
      setYtDisconnecting(false);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const storagePct = storageUsage?.percentage ?? 0;

  return (
    <div className="space-y-5">
      {/* Dialogs */}
      <StorageDialog open={storageDialogOpen} onOpenChange={setStorageDialogOpen} usage={storageUsage} loading={storageLoading} />

      {/* ── التخزين السحابي ──────────────────────────────── */}
      <div className="rounded-2xl bg-muted/30 p-4 sm:p-6 transition-all duration-300">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-sm font-semibold text-foreground">التخزين السحابي</h2>
          <p className="mt-1 text-xs text-muted-foreground">تخزين سحابي آمن — 5GB مجاناً شهرياً</p>
        </div>

        <div className="space-y-3">
          {/* Status row */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-background/50 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <HardDrive className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">S3 Cloud Storage</p>
                <p className="text-[11px] text-muted-foreground">
                  {storageLoading ? 'جاري التحميل...' : storageUsage ? `${formatBytes(storageUsage.used)} / ${formatBytes(storageUsage.limit)}` : 'غير متاح'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="size-3" />
              مفعّل
            </span>
          </div>

          {/* Usage bar */}
          {!storageLoading && storageUsage && (
            <div className="rounded-xl bg-background/50 px-3 sm:px-4 py-2.5 sm:py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-foreground">
                  {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.limit)}
                </span>
                <span className={cn('text-[11px] font-semibold', storagePct > 85 ? 'text-destructive' : 'text-primary')}>
                  {storagePct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-muted">
                <div className={cn('h-full rounded-full transition-all duration-500', storagePct > 85 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{storageUsage.files} ملف مرفوع</span>
                <span className="text-[10px] text-muted-foreground">متاح: {formatBytes(storageUsage.available)}</span>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            {[
              { icon: ImageIcon, label: 'صور المنتجات' },
              { icon: HardDrive, label: 'ملفات آمنة' },
              { icon: CalendarDays, label: 'صور الأحداث' },
            ].map(({ label, icon: Icon }) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                <Icon className="size-3" />
                {label}
              </span>
            ))}
          </div>

          {/* Action */}
          <button onClick={handleOpenStorageDialog} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <BarChart3 className="size-3.5" />
            تفاصيل الاستخدام
          </button>

          {/* Upgrade hint */}
          {storagePct > 70 && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
              <Crown className="size-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] text-muted-foreground">
                {storagePct > 85 ? 'المساحة على وشك الامتلاء — ترقية الباقة قريباً' : 'تجاوزت 70% — يمكنك شراء وحدات إضافية قريباً'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── التكاملات ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-muted/30 p-4 sm:p-6 transition-all duration-300">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-sm font-semibold text-foreground">التكاملات</h2>
          <p className="mt-1 text-xs text-muted-foreground">ربط ركني مع خدمات خارجية لمزامنة الأحداث والمواعيد</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* ── Instagram ────────────────────────────── */}
          <div className="rounded-xl bg-background/50 px-3 sm:px-4 py-3 sm:py-4 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Image src="/icons/instagram.svg" alt="Instagram" width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">إنستغرام</p>
                  <p className="text-[11px] text-muted-foreground">
                    {igConnected ? `@${igConnection?.username ?? ''}` : 'عرض شبكة منشوراتك على صفحتك'}
                  </p>
                </div>
              </div>
              {igConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 shrink-0">
                  <CheckCircle2 className="size-3" />
                  مرتبط
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shrink-0">غير مرتبط</span>
              )}
            </div>

            {/* Connected profile */}
            {igConnected && igConnection?.profilePicUrl && (
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
                <Image src={igConnection.profilePicUrl} alt={igConnection.username || ''} width={36} height={36} className="rounded-full border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground truncate">{igConnection.name || igConnection.username}</p>
                  {typeof igConnection.followersCount === 'number' && (
                    <p className="text-[10px] font-medium text-primary">{igConnection.followersCount.toLocaleString('en-US')} متابع</p>
                  )}
                </div>
              </div>
            )}

            {/* Feature tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {IG_FEATURES.map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            {igLoading ? (
              <div className="flex items-center justify-center py-1"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
            ) : igConnected ? (
              <div className="flex gap-2">
                <button onClick={handleReconnectInstagram} disabled={igDisconnecting} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {igDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                  إعادة الربط
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleDisconnectInstagram} disabled={igDisconnecting} className="flex items-center justify-center rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                      {igDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>إلغاء الربط</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button onClick={handleConnectInstagram} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <GitMerge className="size-3.5" />
                ربط إنستغرام
              </button>
            )}
          </div>

          {/* ── YouTube ──────────────────────────────── */}
          <div className="rounded-xl bg-background/50 px-3 sm:px-4 py-3 sm:py-4 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Image src="/icons/youtube.svg" alt="YouTube" width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">YouTube</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ytConnected ? ytConnection?.channelTitle ?? '' : 'عرض فيديوهاتك الأخيرة أو تضمين فيديو محدد'}
                  </p>
                </div>
              </div>
              {ytConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 shrink-0">
                  <CheckCircle2 className="size-3" />
                  مرتبط
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shrink-0">غير مرتبط</span>
              )}
            </div>

            {/* Connected channel */}
            {ytConnected && ytConnection && (
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
                {ytConnection.channelThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ytConnection.channelThumbnail} alt={ytConnection.channelTitle || ''} width={36} height={36} className="rounded-full border border-border object-cover size-9" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary"><Tv className="size-4 text-primary-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground truncate">{ytConnection.channelTitle}</p>
                  {typeof ytConnection.subscriberCount === 'number' && (
                    <p className="text-[10px] font-medium text-primary">{ytConnection.subscriberCount.toLocaleString('en-US')} مشترك</p>
                  )}
                </div>
              </div>
            )}

            {/* Feature tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {YT_FEATURES.map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            {ytLoading ? (
              <div className="flex items-center justify-center py-1"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
            ) : ytConnected ? (
              <div className="flex gap-2">
                <button onClick={handleReconnectYouTube} disabled={ytDisconnecting} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {ytDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                  إعادة الربط
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleDisconnectYouTube} disabled={ytDisconnecting} className="flex items-center justify-center rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                      {ytDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>إلغاء الربط</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button onClick={handleConnectYouTube} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <GitMerge className="size-3.5" />
                ربط YouTube
              </button>
            )}
          </div>

          {/* ── Google Calendar ───────────────────────── */}
          <div className="rounded-xl bg-background/50 px-3 sm:px-4 py-3 sm:py-4 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Image src="/icons/google-calendar.svg" alt="Google Calendar" width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">تقويم Google</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isLinked ? 'مرتبطة ويتم مزامنتها تلقائياً' : 'مزامنة الأحداث تلقائياً مع تقويم Google'}
                  </p>
                  {isLinked && lastSync && (
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="size-2.5" />
                      آخر مزامنة: {formatSyncTime(lastSync)}
                    </p>
                  )}
                </div>
              </div>
              {isLinked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 shrink-0">
                  <CheckCircle2 className="size-3" />
                  مرتبط
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shrink-0">غير مرتبط</span>
              )}
            </div>

            {/* Feature tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CAL_FEATURES.map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            {isLinked ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setCalendarDialogOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  <BarChart3 className="size-3.5" />
                  عرض التفاصيل
                </button>
                <button onClick={handleUnlink} disabled={isUnlinking} className="flex items-center justify-center rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                  {isUnlinking ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3.5" />}
                </button>
              </div>
            ) : (
              <button onClick={handleConnect} disabled={isConnecting} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {isConnecting ? <Loader2 className="size-3 animate-spin" /> : <GitMerge className="size-3.5" />}
                ربط التقويم
              </button>
            )}
          </div>

          {/* ── Google Analytics ──────────────────────── */}
          <div className="rounded-xl bg-background/50 px-3 sm:px-4 py-3 sm:py-4 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Image src="/icons/google-analytics.svg" alt="Google Analytics" width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Google Analytics</p>
                  <p className="text-[11px] text-muted-foreground">
                    {gaSettings?.isConnected ? `تتبع الزيارات — ${gaSettings.googleAnalyticsId}` : 'تتبع زيارات المتجر وسلوك العملاء عبر GA4'}
                  </p>
                </div>
              </div>
              {gaSettings?.isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 shrink-0">
                  <CheckCircle2 className="size-3" />
                  مرتبط
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shrink-0">غير مرتبط</span>
              )}
            </div>

            {/* Feature tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { icon: Eye, label: 'مشاهدات الصفحات' },
                { icon: ShoppingCart, label: 'التجارة الإلكترونية' },
                { icon: MousePointerClick, label: 'أحداث مخصصة' },
              ].map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            {gaLoading ? (
              <div className="flex items-center justify-center py-1"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
            ) : gaSettings?.isConnected ? (
              <div className="flex gap-2">
                <button onClick={() => setGaDialogOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  <BarChart3 className="size-3.5" />
                  التفاصيل
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleDisconnectGA} disabled={gaDisconnecting} className="flex items-center justify-center rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                      {gaDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>إلغاء الربط</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button onClick={() => setGaDialogOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <Link2 className="size-3.5" />
                ربط Analytics
              </button>
            )}
          </div>

        </div>

        {/* Google Analytics Dialog */}
        <Dialog open={gaDialogOpen} onOpenChange={setGaDialogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Image src="/icons/google-analytics.svg" alt="Google Analytics" width={18} height={18} />
                  {gaSettings?.isConnected ? 'تفاصيل Google Analytics' : 'ربط Google Analytics'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-foreground">معرّف القياس (Measurement ID)</p>
                  <input type="text" value={gaMeasurementId} onChange={(e) => setGaMeasurementId(e.target.value.toUpperCase())} placeholder="G-XXXXXXXXXX" dir="ltr" disabled={gaSettings?.isConnected} className="w-full rounded-xl bg-background/50 border border-border/30 px-3 py-2.5 text-[12px] text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20 disabled:opacity-60" />
                  <p className="text-[10px] text-muted-foreground">تجده في Google Analytics → الإدارة → مصادر البيانات → تفاصيل البث</p>
                </div>
                {gaSettings?.isConnected ? (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[12px] font-medium text-foreground">الأحداث المتتبعة</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { icon: Eye, label: 'مشاهدات الصفحات', desc: 'تتبع تلقائي لكل صفحة' },
                          { icon: ShoppingCart, label: 'التجارة الإلكترونية', desc: 'مبيعات، سلة، شراء' },
                          { icon: MousePointerClick, label: 'أحداث مخصصة', desc: 'نماذج، بحث، تسجيل' },
                          { icon: TrendingUp, label: 'التحويلات', desc: 'تتبع أهداف الأعمال' },
                        ].map(({ icon: Icon, label, desc }) => (
                          <div key={label} className="flex items-start gap-2 rounded-xl bg-muted/30 p-2.5">
                            <Icon className="size-3.5 shrink-0 mt-0.5 text-primary" />
                            <div>
                              <p className="text-[11px] font-medium text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                      <p className="text-[11px] leading-relaxed text-foreground">البيانات تُرسل مباشرةً إلى حسابك في Google Analytics. إلغاء الربط لن يحذف البيانات المسجلة سابقاً.</p>
                    </div>
                    <button onClick={handleDisconnectGA} disabled={gaDisconnecting} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                      {gaDisconnecting ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3.5" />}
                      إلغاء ربط Analytics
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[12px] font-medium text-foreground">كيف يعمل؟</p>
                      <div className="space-y-2">
                        {[
                          { step: '1', text: 'أنشئ حساب Google Analytics 4 مجاني' },
                          { step: '2', text: 'أنشئ مصدر بيانات (Data Stream) لموقعك' },
                          { step: '3', text: 'انسخ معرّف القياس (G-XXXXXXXXXX) والصقه هنا' },
                        ].map(({ step, text }) => (
                          <div key={step} className="flex items-center gap-2.5">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground bg-primary">{step}</div>
                            <p className="text-[11px] text-foreground">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleConnectGA} disabled={gaSaving || !gaMeasurementId.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                      {gaSaving ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3.5" />}
                      ربط Google Analytics
                    </button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
      </div>

      {/* ── تكاملات قادمة ──────────────────────────────────── */}
      <div className="rounded-2xl bg-muted/30 p-4 sm:p-6 transition-all duration-300">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-sm font-semibold text-foreground">تكاملات قادمة</h2>
          <p className="mt-1 text-xs text-muted-foreground">تكاملات جديدة سيتم دعمها قريباً</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMING_SOON.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-background/50 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                  <Image src={item.icon} alt={item.label} width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{item.desc}</p>
                </div>
              </div>
              <span className="inline-flex rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 shrink-0">قريباً</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
