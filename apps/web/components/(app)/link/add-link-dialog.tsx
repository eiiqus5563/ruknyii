'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  PlayCircle,
  MessageSquare,
  CalendarDays,
  Type,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
  Globe,
  Mail,
  Link2,
  Loader2,
  LayoutGrid,
  Images,
  CheckCircle2,
  LogIn,
  Unlink,
  ImageIcon,
  Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getBrandByKey,
  detectPlatformKeyFromUrl,
  extractDomain,
  getFaviconUrl,
  getLocalIconPathByKey,
  type BrandInfo,
} from '@/lib/brand-icons';
import { useToast } from '@/components/ui/toast';
import { createSocialLink, fetchUrlMetadata, type UrlMetadata } from '@/lib/api/social-links';
import {
  getInstagramStatus,
  createInstagramBlock,
  disconnectInstagram,
  type InstagramConnection,
} from '@/lib/api/instagram';
import {
  getYouTubeStatus,
  getYouTubeVideoInfo,
  createYouTubeBlock,
  disconnectYouTube,
  type YouTubeConnection,
  type YouTubeVideo,
} from '@/lib/api/youtube';
import { API_EXTERNAL_URL } from '@/lib/config';
import {
  getLinkedInStatus,
  createLinkedInBlock,
  disconnectLinkedIn,
  type LinkedInConnection,
} from '@/lib/api/linkedin';
import { Play, Tv, Video, User, FileText, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, ClipboardList, Phone, ExternalLink, Settings2, Package, Percent, Megaphone, Share2, Briefcase } from 'lucide-react';
import { useForms, FieldType, FormType, FormStatus } from '@/lib/hooks/useForms';
import { Reorder } from 'framer-motion';
import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Brand SVG Icon component                                           */
/* ------------------------------------------------------------------ */

function BrandIcon({
  brand,
  className,
}: {
  brand: BrandInfo;
  className?: string;
}) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={brand.title}
      className={className}
    >
      <path d={brand.path} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface CategoryItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface LinkItemData {
  id: string;
  /** simple-icons key (used for getBrandByKey) */
  brandKey: string;
  name: string;
  description: string;
  /** Fallback bg color when brand not found */
  fallbackBg?: string;
  category: string[];
}

const categories: CategoryItem[] = [
  { id: 'suggested', label: 'مقترحات', icon: Sparkles },
  { id: 'commerce',  label: 'المتجر',   icon: ShoppingBag },
  { id: 'social',    label: 'اجتماعي', icon: Heart },
  { id: 'media',     label: 'ميديا',   icon: PlayCircle },
  { id: 'contact',   label: 'تواصل',   icon: MessageSquare },
  { id: 'events',    label: 'فعاليات', icon: CalendarDays },
  { id: 'text',      label: 'نص',      icon: Type },
  { id: 'all',       label: 'الكل',    icon: MoreHorizontal },
];

const linkItems: LinkItemData[] = [
  { id: 'instagram',  brandKey: 'instagram',  name: 'Instagram',         description: 'اعرض منشوراتك و Reels',        category: ['suggested', 'social'] },
  { id: 'tiktok',     brandKey: 'tiktok',     name: 'TikTok',            description: 'شارك فيديوهاتك على TikTok',    category: ['suggested', 'social', 'media'] },
  { id: 'youtube',    brandKey: 'youtube',    name: 'YouTube',           description: 'شارك فيديوهات YouTube',        category: ['suggested', 'social', 'media'] },
  { id: 'linkedin',   brandKey: 'linkedin',   name: 'LinkedIn',         description: 'اعرض ملفك المهني',             category: ['social'], fallbackBg: '#0A66C2' },
  { id: 'whatsapp',   brandKey: 'whatsapp',   name: 'WhatsApp',         description: 'رابط دردشة مباشرة',            category: ['contact'] },
  { id: 'telegram',   brandKey: 'telegram',   name: 'Telegram',         description: 'قناتك أو حسابك على Telegram',  category: ['contact'] },
  { id: 'soundcloud', brandKey: 'soundcloud', name: 'SoundCloud',       description: 'شارك مقاطعك الصوتية',          category: ['media'] },
  { id: 'zoom',       brandKey: 'zoom',       name: 'Zoom',             description: 'رابط اجتماع Zoom',             category: ['events', 'contact'] },
  { id: 'add-product',     brandKey: '_store',  name: 'إضافة منتج جديد',         description: 'أضف منتجاً جديداً إلى متجرك',              category: ['commerce'], fallbackBg: '#10B981' },
  { id: 'add-discount',    brandKey: '_store',  name: 'إضافة خصومات',            description: 'أنشئ كوبونات وعروض خصم لمنتجاتك',          category: ['commerce'], fallbackBg: '#F59E0B' },
  { id: 'add-ad',          brandKey: '_store',  name: 'إضافة إعلان تجاري',       description: 'أنشئ إعلاناً للترويج لمنتجاتك وعروضك',     category: ['commerce'], fallbackBg: '#8B5CF6' },
  { id: 'social-promote',  brandKey: '_store',  name: 'ترويج على مواقع التواصل',  description: 'شارك منتجاتك على إنستغرام وتيك توك وغيرها', category: ['commerce'], fallbackBg: '#EC4899' },
  { id: 'email',      brandKey: 'gmail',      name: 'البريد الإلكتروني', description: 'أضف بريدك الإلكتروني',         category: ['contact'] },
  { id: 'website',    brandKey: '_website',    name: 'موقع إلكتروني',    description: 'أضف رابط موقعك',               category: ['social'] },
  { id: 'forms',       brandKey: '_form',      name: 'نماذج سريعة',        description: 'تسجيل بريد، نموذج اتصال، أو نموذج مخصص', category: ['suggested'], fallbackBg: '#6366f1' },
];

function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return value;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function inferUsernameFromUrl(rawUrl: string, platformKey?: string): string {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (platformKey === 'youtube' && url.searchParams.get('v')) {
      return `video_${url.searchParams.get('v')}`.slice(0, 100);
    }

    const preferred =
      pathSegments[pathSegments.length - 1] ||
      pathSegments[0] ||
      url.hostname.replace(/^www\./i, '').split('.')[0] ||
      'link';

    return preferred.replace(/^@/, '').slice(0, 100);
  } catch {
    return 'link';
  }
}

/* ------------------------------------------------------------------ */
/*  Instagram Sub-View                                                 */
/* ------------------------------------------------------------------ */

const instagramOptions = [
  {
    id: 'grid' as const,
    Icon: LayoutGrid,
    title: 'استنساخ شبكة إنستغرام وإضافة روابط',
    description:
      'اعرض شبكة منشوراتك وأضف روابط للمنتجات والفعاليات والمقالات، حتى يتمكن متابعوك من التسوق منها.',
    coming: false,
    requiresAuth: true,
  },
  {
    id: 'feed' as const,
    Icon: Images,
    title: 'مشاركة أحدث المنشورات أو Reels بشكل مرئي',
    description:
      'اعرض معرض منشوراتك أو Reels لإرسال الزوار مباشرة إلى ملفك الشخصي واستكشاف محتواك.',
    coming: false,
    requiresAuth: true,
  },
  {
    id: 'link' as const,
    Icon: Link2,
    title: 'رابط بسيط لملفي الشخصي',
    description: 'وجّه الزوار مباشرة إلى ملفك الشخصي على إنستغرام عبر رابط كلاسيكي.',
    coming: false,
    requiresAuth: false,
  },
] as const;

function InstagramSubView({
  onBack,
  onAddSuccess,
}: {
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const [activeOption, setActiveOption] = useState<'grid' | 'feed' | 'link' | null>(null);
  const [urlInput, setUrlInput] = useState('https://www.instagram.com/');
  const [isAdding, setIsAdding] = useState(false);
  const [igStatus, setIgStatus] = useState<{ connected: boolean; connection: InstagramConnection | null } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const urlRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  // Check Instagram connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setCheckingStatus(true);
        const status = await getInstagramStatus();
        setIgStatus(status);
      } catch {
        setIgStatus({ connected: false, connection: null });
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (activeOption === 'link') {
      setTimeout(() => urlRef.current?.focus(), 150);
    }
  }, [activeOption]);



  const handleAddSimpleLink = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      const username = inferUsernameFromUrl(normalizedUrl, 'instagram');
      await createSocialLink({
        platform: 'instagram',
        username,
        url: normalizedUrl,
        title: 'Instagram',
      });
      showToast({ title: 'تمت الإضافة', message: 'تم إضافة رابط إنستغرام', variant: 'success' });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إضافة الرابط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, showToast, onAddSuccess]);

  const handleConnectInstagram = useCallback(() => {
    // Redirect to Instagram OAuth (via backend)
    window.location.href = `${API_EXTERNAL_URL}/integrations/instagram/auth`;
  }, []);

  const handleDisconnectInstagram = useCallback(async () => {
    try {
      setIsAdding(true);
      await disconnectInstagram();
      setIgStatus({ connected: false, connection: null });
      showToast({ title: 'تم', message: 'تم إلغاء ربط إنستغرام', variant: 'success' });
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إلغاء الربط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast]);

  const handleCreateBlock = useCallback(async (type: 'GRID' | 'FEED') => {
    try {
      setIsAdding(true);
      await createInstagramBlock(type);
      showToast({
        title: 'تمت الإضافة',
        message: type === 'GRID' ? 'تم إضافة شبكة إنستغرام' : 'تم إضافة معرض إنستغرام',
        variant: 'success',
      });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إنشاء البلوك', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast, onAddSuccess]);

  return (
    <motion.div
      key="instagram-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/instagram.svg" alt="Instagram" className="w-8 h-8" />
          <span className="font-semibold text-sm">Instagram</span>
        </div>
        {igStatus?.connected && (
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            متصل
          </span>
        )}
      </div>

      {/* ── Options list ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-2 pb-8">
        {checkingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <>
        {/* ── Connected account card (top) ── */}
        {igStatus?.connected && (
          <div className="mb-3 flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/60">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              {igStatus.connection?.profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={igStatus.connection.profilePicUrl}
                  alt={igStatus.connection.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">@{igStatus.connection?.username}</p>
              {igStatus.connection?.followersCount != null && (
                <p className="text-[11px] text-muted-foreground">
                  {igStatus.connection.followersCount.toLocaleString()} متابع
                </p>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDisconnectInstagram}
                  disabled={isAdding}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">إلغاء الربط</TooltipContent>
            </Tooltip>
          </div>
        )}

        <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
          اختر كيف تريد إضافة إنستغرام
        </p>

        {instagramOptions.map((opt) => {
          const needsAuth = opt.requiresAuth && !igStatus?.connected;
          const isSelected = activeOption === opt.id;
          return (
            <div key={opt.id}>
              <button
                onClick={() => {
                  if (needsAuth) {
                    handleConnectInstagram();
                    return;
                  }
                  if (opt.id === 'grid' || opt.id === 'feed') {
                    handleCreateBlock(opt.id === 'grid' ? 'GRID' : 'FEED');
                    return;
                  }
                  setActiveOption((prev) => (prev === opt.id ? null : opt.id));
                }}
                disabled={isAdding}
                className={cn(
                  'w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border text-start transition-all group',
                  isSelected
                    ? 'border-foreground/40 bg-foreground/5 shadow-sm'
                    : 'border-border/60 bg-card hover:border-border hover:shadow-sm cursor-pointer',
                  isAdding && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'bg-foreground text-background'
                      : needsAuth
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted/60 text-foreground group-hover:bg-muted',
                  )}
                >
                  {needsAuth ? (
                    <LogIn className="w-5 h-5" />
                  ) : (
                    <opt.Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm leading-snug">{opt.title}</p>
                    {needsAuth && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                        يتطلب الربط
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {needsAuth
                      ? 'اضغط هنا لربط حساب إنستغرام الخاص بك أولاً'
                      : opt.description}
                  </p>
                </div>
              </button>
            </div>
          );
        })}

        {/* ── URL input (slides in when option 3 active) ── */}
        <AnimatePresence>
          {activeOption === 'link' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">رابط حسابك على إنستغرام</p>
                <input
                  ref={urlRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSimpleLink()}
                  placeholder="https://www.instagram.com/username"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
                <button
                  onClick={handleAddSimpleLink}
                  disabled={isAdding || !urlInput.trim()}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    'إضافة رابط إنستغرام'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        </>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  YouTube Sub-View                                                   */
/* ------------------------------------------------------------------ */

const youtubeOptions = [
  {
    id: 'latest' as const,
    Icon: Tv,
    title: 'عرض أحدث الفيديوهات',
    description:
      'اعرض آخر فيديوهاتك من قناتك على YouTube تلقائياً بشكل شبكة بصرية على ملفك.',
    requiresAuth: true,
  },
  {
    id: 'embed' as const,
    Icon: Video,
    title: 'تضمين فيديو محدد',
    description:
      'ألصق رابط فيديو YouTube وسيظهر كبطاقة غنية مع صورة مصغرة ومعلومات الفيديو.',
    requiresAuth: false,
  },
  {
    id: 'link' as const,
    Icon: Link2,
    title: 'رابط بسيط للقناة',
    description: 'وجّه الزوار مباشرة إلى قناتك على YouTube عبر رابط كلاسيكي.',
    requiresAuth: false,
  },
] as const;

function YouTubeSubView({
  onBack,
  onAddSuccess,
}: {
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const [activeOption, setActiveOption] = useState<'latest' | 'embed' | 'link' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [ytStatus, setYtStatus] = useState<{ connected: boolean; connection: YouTubeConnection | null } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [videoPreview, setVideoPreview] = useState<YouTubeVideo | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  // Check YouTube connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setCheckingStatus(true);
        const status = await getYouTubeStatus();
        setYtStatus(status);
      } catch {
        setYtStatus({ connected: false, connection: null });
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (activeOption === 'link' || activeOption === 'embed') {
      setTimeout(() => urlRef.current?.focus(), 150);
    }
  }, [activeOption]);

  // Fetch video preview when URL changes (for embed option)
  useEffect(() => {
    if (activeOption !== 'embed' || !urlInput.trim()) {
      setVideoPreview(null);
      return;
    }
    const isYtUrl = /(?:youtube\.com|youtu\.be)/.test(urlInput);
    if (!isYtUrl) return;

    const timer = setTimeout(async () => {
      try {
        setFetchingPreview(true);
        const info = await getYouTubeVideoInfo(normalizeUrl(urlInput));
        setVideoPreview(info);
      } catch {
        setVideoPreview(null);
      } finally {
        setFetchingPreview(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [urlInput, activeOption]);

  const handleAddSimpleLink = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      const username = inferUsernameFromUrl(normalizedUrl, 'youtube');
      await createSocialLink({
        platform: 'youtube',
        username,
        url: normalizedUrl,
        title: 'YouTube',
      });
      showToast({ title: 'تمت الإضافة', message: 'تم إضافة رابط YouTube', variant: 'success' });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إضافة الرابط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, showToast, onAddSuccess]);

  const handleConnectYouTube = useCallback(() => {
    window.location.href = `${API_EXTERNAL_URL}/integrations/youtube/auth`;
  }, []);

  const handleDisconnectYouTube = useCallback(async () => {
    try {
      setIsAdding(true);
      await disconnectYouTube();
      setYtStatus({ connected: false, connection: null });
      showToast({ title: 'تم', message: 'تم إلغاء ربط YouTube', variant: 'success' });
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إلغاء الربط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast]);

  const handleCreateLatestBlock = useCallback(async () => {
    try {
      setIsAdding(true);
      await createYouTubeBlock('LATEST_VIDEOS');
      showToast({
        title: 'تمت الإضافة',
        message: 'تم إضافة بلوك أحدث الفيديوهات',
        variant: 'success',
      });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إنشاء البلوك', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast, onAddSuccess]);

  const handleAddEmbedVideo = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      await createYouTubeBlock('SINGLE_VIDEO', normalizedUrl);
      showToast({
        title: 'تمت الإضافة',
        message: 'تم تضمين فيديو YouTube',
        variant: 'success',
      });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل تضمين الفيديو', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, showToast, onAddSuccess]);

  return (
    <motion.div
      key="youtube-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/youtube.svg" alt="YouTube" className="w-8 h-8" />
          <span className="font-semibold text-sm">YouTube</span>
        </div>
      </div>

      {/* ── Options list ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-2 pb-8">
        {checkingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Connected account card (top) ── */}
            {ytStatus?.connected && (
              <div className="mb-3 flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/60">
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-muted">
                  {ytStatus.connection?.channelThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ytStatus.connection.channelThumbnail}
                      alt={ytStatus.connection.channelTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ytStatus.connection?.channelTitle}</p>
                  {ytStatus.connection?.subscriberCount != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {ytStatus.connection.subscriberCount.toLocaleString()} مشترك
                    </p>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleDisconnectYouTube}
                      disabled={isAdding}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">إلغاء الربط</TooltipContent>
                </Tooltip>
              </div>
            )}

            <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
              اختر كيف تريد إضافة YouTube
            </p>

            {youtubeOptions.map((opt) => {
              const needsAuth = opt.requiresAuth && !ytStatus?.connected;
              const isSelected = activeOption === opt.id;
              return (
                <div key={opt.id}>
                  <button
                    onClick={() => {
                      if (needsAuth) {
                        handleConnectYouTube();
                        return;
                      }
                      if (opt.id === 'latest') {
                        handleCreateLatestBlock();
                        return;
                      }
                      setActiveOption((prev) => (prev === opt.id ? null : opt.id));
                    }}
                    disabled={isAdding}
                    className={cn(
                      'w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border text-start transition-all group',
                      isSelected
                        ? 'border-foreground/40 bg-foreground/5 shadow-sm'
                        : 'border-border/60 bg-card hover:border-border hover:shadow-sm cursor-pointer',
                      isAdding && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-foreground text-background'
                          : needsAuth
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-muted/60 text-foreground group-hover:bg-muted',
                      )}
                    >
                      {needsAuth ? (
                        <LogIn className="w-5 h-5" />
                      ) : (
                        <opt.Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm leading-snug">{opt.title}</p>
                        {needsAuth && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            يتطلب الربط
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {needsAuth
                          ? 'اضغط هنا لربط حساب YouTube الخاص بك أولاً'
                          : opt.description}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}

            {/* ── URL input for embed option ── */}
            <AnimatePresence>
              {activeOption === 'embed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">رابط فيديو YouTube</p>
                    <input
                      ref={urlRef}
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && handleAddEmbedVideo()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />

                    {/* Video Preview */}
                    {fetchingPreview && (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {videoPreview && !fetchingPreview && (
                      <div className="flex gap-3 p-2 rounded-xl bg-background border border-border/60">
                        <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={videoPreview.thumbnail} alt={videoPreview.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{videoPreview.title}</p>
                          {videoPreview.viewCount && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {parseInt(videoPreview.viewCount).toLocaleString()} مشاهدة
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAddEmbedVideo}
                      disabled={isAdding || !urlInput.trim()}
                      className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الإضافة...
                        </>
                      ) : (
                        'تضمين الفيديو'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── URL input for simple link option ── */}
            <AnimatePresence>
              {activeOption === 'link' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">رابط قناتك على YouTube</p>
                    <input
                      ref={urlRef}
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSimpleLink()}
                      placeholder="https://www.youtube.com/@yourchannel"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                    <button
                      onClick={handleAddSimpleLink}
                      disabled={isAdding || !urlInput.trim()}
                      className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الإضافة...
                        </>
                      ) : (
                        'إضافة رابط YouTube'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


          </>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  TikTok Sub-View                                                    */
/* ------------------------------------------------------------------ */

const tiktokOptions = [
  {
    id: 'embed' as const,
    Icon: Video,
    title: 'تضمين فيديو محدد',
    description:
      'ألصق رابط فيديو TikTok وسيظهر كبطاقة غنية مع صورة مصغرة ومعلومات الفيديو.',
    requiresAuth: false,
  },
  {
    id: 'link' as const,
    Icon: Link2,
    title: 'رابط بسيط للملف الشخصي',
    description: 'وجّه الزوار مباشرة إلى ملفك الشخصي على TikTok عبر رابط كلاسيكي.',
    requiresAuth: false,
  },
] as const;

function TikTokSubView({
  onBack,
  onAddSuccess,
}: {
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const [activeOption, setActiveOption] = useState<'embed' | 'link' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [videoPreview, setVideoPreview] = useState<UrlMetadata | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  useEffect(() => {
    if (activeOption === 'link' || activeOption === 'embed') {
      setTimeout(() => urlRef.current?.focus(), 150);
    }
  }, [activeOption]);

  // Fetch video preview when URL changes (for embed option)
  useEffect(() => {
    if (activeOption !== 'embed' || !urlInput.trim()) {
      setVideoPreview(null);
      return;
    }
    const isTikTokUrl = /tiktok\.com/.test(urlInput);
    if (!isTikTokUrl) return;

    const timer = setTimeout(async () => {
      try {
        setFetchingPreview(true);
        const metadata = await fetchUrlMetadata(normalizeUrl(urlInput));
        setVideoPreview(metadata);
      } catch {
        setVideoPreview(null);
      } finally {
        setFetchingPreview(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [urlInput, activeOption]);

  const handleAddSimpleLink = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      const username = inferUsernameFromUrl(normalizedUrl, 'tiktok');
      await createSocialLink({
        platform: 'tiktok',
        username,
        url: normalizedUrl,
        title: 'TikTok',
      });
      showToast({ title: 'تمت الإضافة', message: 'تم إضافة رابط TikTok', variant: 'success' });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إضافة الرابط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, showToast, onAddSuccess]);

  const handleAddEmbedVideo = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      const username = inferUsernameFromUrl(normalizedUrl, 'tiktok');
      await createSocialLink({
        platform: 'tiktok',
        username,
        url: normalizedUrl,
        title: videoPreview?.title || 'TikTok Video',
        thumbnail: videoPreview?.image || undefined,
      });
      showToast({
        title: 'تمت الإضافة',
        message: 'تم تضمين فيديو TikTok',
        variant: 'success',
      });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل تضمين الفيديو', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, videoPreview, showToast, onAddSuccess]);

  return (
    <motion.div
      key="tiktok-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/tiktok.svg" alt="TikTok" className="w-8 h-8" />
          <span className="font-semibold text-sm">TikTok</span>
        </div>
      </div>

      {/* ── Options list ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-2 pb-8">
        <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
          اختر كيف تريد إضافة TikTok
        </p>

        {tiktokOptions.map((opt) => {
          const isSelected = activeOption === opt.id;
          return (
            <div key={opt.id}>
              <button
                onClick={() => setActiveOption((prev) => (prev === opt.id ? null : opt.id))}
                disabled={isAdding}
                className={cn(
                  'w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border text-start transition-all group',
                  isSelected
                    ? 'border-foreground/40 bg-foreground/5 shadow-sm'
                    : 'border-border/60 bg-card hover:border-border hover:shadow-sm cursor-pointer',
                  isAdding && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'bg-foreground text-background'
                      : 'bg-muted/60 text-foreground group-hover:bg-muted',
                  )}
                >
                  <opt.Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            </div>
          );
        })}

        {/* ── URL input for embed option ── */}
        <AnimatePresence>
          {activeOption === 'embed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">رابط فيديو TikTok</p>
                <input
                  ref={urlRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && handleAddEmbedVideo()}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />

                {/* Video Preview */}
                {fetchingPreview && (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {videoPreview && !fetchingPreview && (
                  <div className="flex gap-3 p-2 rounded-xl bg-background border border-border/60">
                    {videoPreview.image && (
                      <div className="relative w-20 h-28 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={videoPreview.image} alt={videoPreview.title || 'TikTok'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-3">{videoPreview.title}</p>
                      {videoPreview.siteName && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {videoPreview.siteName}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddEmbedVideo}
                  disabled={isAdding || !urlInput.trim()}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    'تضمين الفيديو'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── URL input for simple link option ── */}
        <AnimatePresence>
          {activeOption === 'link' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">رابط ملفك الشخصي على TikTok</p>
                <input
                  ref={urlRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSimpleLink()}
                  placeholder="https://www.tiktok.com/@username"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
                <button
                  onClick={handleAddSimpleLink}
                  disabled={isAdding || !urlInput.trim()}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    'إضافة رابط TikTok'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form Shortcut Sub-View                                             */
/* ------------------------------------------------------------------ */

interface FormFieldItem {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

const EMAIL_SIGNUP_FIELDS: FormFieldItem[] = [
  { id: 'email', type: FieldType.EMAIL, label: 'البريد الإلكتروني', placeholder: 'example@email.com', required: true },
];

const CONTACT_FIELDS: FormFieldItem[] = [
  { id: 'full_name', type: FieldType.TEXT, label: 'الاسم الكامل', placeholder: 'أدخل اسمك الكامل', required: true },
  { id: 'email', type: FieldType.EMAIL, label: 'البريد الإلكتروني', placeholder: 'example@email.com', required: true },
  { id: 'phone', type: FieldType.PHONE, label: 'رقم الهاتف', placeholder: '07xxxxxxxxx', required: true },
  { id: 'message', type: FieldType.TEXTAREA, label: 'الرسالة', placeholder: 'اكتب رسالتك هنا...', required: true },
];

const AVAILABLE_FIELD_TYPES: { type: FieldType; label: string; icon: LucideIcon }[] = [
  { type: FieldType.TEXT, label: 'نص قصير', icon: Type },
  { type: FieldType.EMAIL, label: 'بريد إلكتروني', icon: Mail },
  { type: FieldType.PHONE, label: 'رقم هاتف', icon: Phone },
  { type: FieldType.SELECT, label: 'قائمة منسدلة', icon: ChevronLeft },
  { type: FieldType.RADIO, label: 'اختيار واحد', icon: CheckCircle2 },
];

type FormTemplate = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  fields: FormFieldItem[];
  formType: FormType;
};

const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'email-signup',
    title: 'نموذج تسجيل بريد',
    description: 'اجمع عناوين البريد الإلكتروني من زوارك',
    icon: Mail,
    color: '#10B981',
    fields: EMAIL_SIGNUP_FIELDS,
    formType: FormType.REGISTRATION,
  },
  {
    id: 'contact',
    title: 'نموذج اتصال',
    description: 'الاسم، البريد، الهاتف، والرسالة',
    icon: MessageSquare,
    color: '#3B82F6',
    fields: CONTACT_FIELDS,
    formType: FormType.CONTACT,
  },
];

function FormShortcutSubView({
  onBack,
  onAddSuccess,
}: {
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const { show: showToast } = useToast();
  const { createForm } = useForms();

  const activeTemplate = FORM_TEMPLATES.find((t) => t.id === selectedTemplate);

  const selectTemplate = useCallback((template: FormTemplate) => {
    setSelectedTemplate(template.id);
    setFormTitle(template.title);
    setFields(template.fields.map((f) => ({ ...f })));
    setShowAddField(false);
  }, []);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const toggleRequired = useCallback((id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );
  }, []);

  const addField = useCallback((type: FieldType, label: string) => {
    const hasOptions = type === FieldType.SELECT || type === FieldType.RADIO;
    const newField: FormFieldItem = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      placeholder: '',
      required: false,
      ...(hasOptions ? { options: ['خيار 1', 'خيار 2'] } : {}),
    };
    setFields((prev) => [...prev, newField]);
    setShowAddField(false);
  }, []);

  const updateFieldOptions = useCallback((fieldId: string, options: string[]) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, options } : f))
    );
  }, []);

  const addOptionToField = useCallback((fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const opts = f.options ?? [];
        return { ...f, options: [...opts, `خيار ${opts.length + 1}`] };
      })
    );
  }, []);

  const removeOptionFromField = useCallback((fieldId: string, optIndex: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const opts = [...(f.options ?? [])];
        opts.splice(optIndex, 1);
        return { ...f, options: opts };
      })
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (fields.length === 0) {
      showToast({ title: 'خطأ', message: 'أضف حقلاً واحداً على الأقل', variant: 'error' });
      return;
    }

    try {
      setIsCreating(true);

      const slug = `${selectedTemplate || 'form'}-${Date.now().toString(36)}`;

      const form = await createForm({
        title: formTitle,
        slug,
        type: activeTemplate?.formType ?? FormType.OTHER,
        status: FormStatus.PUBLISHED,
        allowMultipleSubmissions: true,
        showProgressBar: false,
        showQuestionNumbers: false,
        fields: fields.map((f, i) => ({
          label: f.label,
          type: f.type,
          order: i,
          required: f.required,
          placeholder: f.placeholder || undefined,
          ...(f.options && f.options.length > 0 ? { options: f.options } : {}),
        })) as any,
      });

      if (form) {
        // Try to add as a social link (may fail but form is already created)
        try {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          await createSocialLink({
            platform: 'form',
            username: form.slug,
            url: `${baseUrl}/f/${form.slug}`,
            title: formTitle,
          });
        } catch {
          // Social link failed but form was created successfully - that's ok
        }
        showToast({ title: 'تمت الإضافة', message: `تم إنشاء ${formTitle} وإضافته لملفك`, variant: 'success' });
        onAddSuccess?.();
      }
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إنشاء النموذج', variant: 'error' });
    } finally {
      setIsCreating(false);
    }
  }, [fields, formTitle, selectedTemplate, activeTemplate, createForm, showToast, onAddSuccess]);

  const fieldTypeIcon = (type: FieldType) => {
    const found = AVAILABLE_FIELD_TYPES.find((f) => f.type === type);
    if (found) {
      const Icon = found.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <motion.div
      key="form-shortcut-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={selectedTemplate ? () => { setSelectedTemplate(null); setFields([]); setFormTitle(''); } : onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500">
            <ClipboardList className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-sm">
            {selectedTemplate ? (activeTemplate?.title ?? 'نموذج') : 'نماذج سريعة'}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-3 pb-8">
        <AnimatePresence mode="wait">
          {!selectedTemplate ? (
            <motion.div
              key="template-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground px-1">اختر قالب سريع</p>

              {FORM_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all group text-start"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: template.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {template.fields.map((f) => (
                          <span
                            key={f.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                  </button>
                );
              })}

              {/* ── Custom form shortcut ── */}
              <button
                onClick={() => {
                  setSelectedTemplate('custom');
                  setFormTitle('نموذج مخصص');
                  setFields([]);
                }}
                className="w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-dashed border-border/60 bg-card hover:border-border hover:shadow-sm transition-all group text-start"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted/60 text-foreground group-hover:bg-muted">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">نموذج مخصص</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    أنشئ نموذجاً بسيطاً بحقول من اختيارك
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
              </button>

              {/* ── Divider ── */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center px-1">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-[10px] text-muted-foreground/60">أو</span>
                </div>
              </div>

              {/* ── Advanced form link ── */}
              <button
                onClick={() => router.push('/app/forms/create')}
                className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all group text-start"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">إنشاء نموذج متقدم</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    انتقل لمُنشئ النماذج المتقدم مع خيارات تفصيلية كاملة
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form-builder"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">عنوان النموذج</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>

              {/* Fields list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">الحقول</label>
                  <span className="text-[10px] text-muted-foreground/60">{fields.length} حقل</span>
                </div>

                <Reorder.Group
                  axis="y"
                  values={fields}
                  onReorder={setFields}
                  className="space-y-2"
                >
                  <AnimatePresence initial={false}>
                    {fields.map((field, idx) => (
                      <Reorder.Item
                        key={field.id}
                        value={field}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                        className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60 group"
                      >
                        {/* Drag handle */}
                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Field type icon */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground shrink-0">
                          {fieldTypeIcon(field.type)}
                        </div>

                        {/* Label (editable) */}
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            setFields((prev) =>
                              prev.map((f) =>
                                f.id === field.id ? { ...f, label: e.target.value } : f
                              )
                            )
                          }
                          className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
                          placeholder="اسم الحقل"
                        />

                        {/* Required toggle */}
                        <button
                          onClick={() => toggleRequired(field.id)}
                          className={cn(
                            'text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors shrink-0',
                            field.required
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {field.required ? 'مطلوب' : 'اختياري'}
                        </button>

                        {/* Move up/down */}
                        <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveField(idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveField(idx, 'down')}
                            disabled={idx === fields.length - 1}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Options editor for SELECT / RADIO */}
                        {(field.type === FieldType.SELECT || field.type === FieldType.RADIO) && (
                          <div className="w-full mt-2 pt-2 border-t border-border/60 space-y-1.5" style={{ gridColumn: '1 / -1' }}>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              {field.type === FieldType.SELECT ? 'خيارات القائمة' : 'الخيارات'}
                            </p>
                            {(field.options ?? []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground/50 w-4 text-center shrink-0">{optIdx + 1}</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(field.options ?? [])];
                                    newOpts[optIdx] = e.target.value;
                                    updateFieldOptions(field.id, newOpts);
                                  }}
                                  className="flex-1 min-w-0 h-7 px-2 rounded-lg bg-card border border-border/60 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                                  placeholder={`خيار ${optIdx + 1}`}
                                />
                                <button
                                  onClick={() => removeOptionFromField(field.id, optIdx)}
                                  className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addOptionToField(field.id)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              إضافة خيار
                            </button>
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>

                {fields.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center rounded-xl border border-dashed border-border/60">
                    <FileText className="w-6 h-6 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">أضف حقولاً للنموذج</p>
                  </div>
                )}
              </div>

              {/* Add field button */}
              <div className="relative">
                <button
                  onClick={() => setShowAddField(!showAddField)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة حقل
                </button>

                {/* Field type picker */}
                <AnimatePresence>
                  {showAddField && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-card border border-border/60 rounded-xl shadow-lg z-10 p-2 grid grid-cols-2 gap-1"
                    >
                      {AVAILABLE_FIELD_TYPES.map((ft) => {
                        const Icon = ft.icon;
                        return (
                          <button
                            key={ft.type}
                            onClick={() => addField(ft.type, ft.label)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-muted/60 transition-colors text-start"
                          >
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>{ft.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating || fields.length === 0 || !formTitle.trim()}
                className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4" />
                    إنشاء النموذج وإضافته
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  LinkedIn Sub-View                                                  */
/* ------------------------------------------------------------------ */

const linkedinOptions = [
  {
    id: 'profile' as const,
    Icon: User,
    title: 'بطاقة الملف الشخصي',
    description:
      'اربط حسابك واعرض بطاقة غنية تحتوي اسمك والصورة والعنوان الوظيفي على ملفك.',
    requiresAuth: true,
  },
  {
    id: 'link' as const,
    Icon: Link2,
    title: 'رابط بسيط للملف الشخصي',
    description: 'وجّه الزوار مباشرة إلى ملفك الشخصي على LinkedIn عبر رابط كلاسيكي.',
    requiresAuth: false,
  },
] as const;

function LinkedInSubView({
  onBack,
  onAddSuccess,
}: {
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const [activeOption, setActiveOption] = useState<'profile' | 'link' | null>(null);
  const [urlInput, setUrlInput] = useState('https://www.linkedin.com/in/');
  const [isAdding, setIsAdding] = useState(false);
  const [liStatus, setLiStatus] = useState<{ connected: boolean; connection: LinkedInConnection | null } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const urlRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  // Check LinkedIn connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setCheckingStatus(true);
        const status = await getLinkedInStatus();
        setLiStatus(status);
      } catch {
        setLiStatus({ connected: false, connection: null });
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (activeOption === 'link') {
      setTimeout(() => urlRef.current?.focus(), 150);
    }
  }, [activeOption]);

  const handleAddSimpleLink = useCallback(async () => {
    try {
      setIsAdding(true);
      const normalizedUrl = normalizeUrl(urlInput);
      const username = inferUsernameFromUrl(normalizedUrl, 'linkedin');
      await createSocialLink({
        platform: 'linkedin',
        username,
        url: normalizedUrl,
        title: 'LinkedIn',
      });
      showToast({ title: 'تمت الإضافة', message: 'تم إضافة رابط LinkedIn', variant: 'success' });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إضافة الرابط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, showToast, onAddSuccess]);

  const handleConnectLinkedIn = useCallback(() => {
    window.location.href = `${API_EXTERNAL_URL}/integrations/linkedin/auth`;
  }, []);

  const handleDisconnectLinkedIn = useCallback(async () => {
    try {
      setIsAdding(true);
      await disconnectLinkedIn();
      setLiStatus({ connected: false, connection: null });
      showToast({ title: 'تم', message: 'تم إلغاء ربط LinkedIn', variant: 'success' });
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إلغاء الربط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast]);

  const handleCreateProfileCard = useCallback(async () => {
    try {
      setIsAdding(true);
      await createLinkedInBlock('PROFILE_CARD');
      showToast({
        title: 'تمت الإضافة',
        message: 'تم إضافة بطاقة LinkedIn',
        variant: 'success',
      });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إنشاء البلوك', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [showToast, onAddSuccess]);

  return (
    <motion.div
      key="linkedin-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-8 h-8" />
          <span className="font-semibold text-sm">LinkedIn</span>
        </div>
        {liStatus?.connected && (
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            متصل
          </span>
        )}
      </div>

      {/* ── Options list ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-2 pb-8">
        {checkingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <>
        {/* ── Connected account card (top) ── */}
        {liStatus?.connected && (
          <div className="mb-3 rounded-xl border border-border/60 overflow-hidden">
            {/* Mini banner */}
            <div className="h-10 bg-gradient-to-l from-[#0A66C2] to-[#004182] relative">
              <div className="absolute -bottom-4 right-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-card shadow-sm bg-card">
                  {liStatus.connection?.profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={liStatus.connection.profilePicUrl}
                      alt={liStatus.connection.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0A66C2]/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icons/linkedin.svg" alt="" className="w-4 h-4 opacity-50" />
                    </div>
                  )}
                </div>
              </div>
              {/* Disconnect button on banner */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={isAdding}
                    className="absolute top-1.5 left-1.5 flex items-center justify-center w-6 h-6 rounded-md bg-white/15 hover:bg-white/30 text-white/80 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">إلغاء الربط</TooltipContent>
              </Tooltip>
            </div>
            <div className="pt-5 pb-2.5 px-3">
              <p className="text-sm font-semibold truncate">{liStatus.connection?.name}</p>
              {liStatus.connection?.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5" dir="ltr">
                  {liStatus.connection.email}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
          اختر كيف تريد إضافة LinkedIn
        </p>

        {linkedinOptions.map((opt) => {
          const needsAuth = opt.requiresAuth && !liStatus?.connected;
          const isSelected = activeOption === opt.id;
          return (
            <div key={opt.id}>
              <button
                onClick={() => {
                  if (needsAuth) {
                    handleConnectLinkedIn();
                    return;
                  }
                  if (opt.id === 'profile') {
                    handleCreateProfileCard();
                    return;
                  }
                  setActiveOption((prev) => (prev === opt.id ? null : opt.id));
                }}
                disabled={isAdding}
                className={cn(
                  'w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border text-start transition-all group',
                  isSelected
                    ? 'border-foreground/40 bg-foreground/5 shadow-sm'
                    : 'border-border/60 bg-card hover:border-border hover:shadow-sm cursor-pointer',
                  isAdding && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'bg-foreground text-background'
                      : needsAuth
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted/60 text-foreground group-hover:bg-muted',
                  )}
                >
                  {needsAuth ? (
                    <LogIn className="w-5 h-5" />
                  ) : (
                    <opt.Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{opt.title}</span>
                    {needsAuth && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        يتطلب ربط الحساب
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            </div>
          );
        })}

        {/* ── URL input (slides in when link option active) ── */}
        <AnimatePresence>
          {activeOption === 'link' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-4 rounded-2xl bg-card border border-border/60 space-y-3">
                <label className="text-xs font-medium text-muted-foreground">رابط الملف الشخصي</label>
                <input
                  ref={urlRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSimpleLink()}
                  placeholder="https://www.linkedin.com/in/username"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
                <button
                  onClick={handleAddSimpleLink}
                  disabled={isAdding || !urlInput.trim()}
                  className={cn(
                    'w-full h-10 rounded-xl text-sm font-medium transition-all',
                    'bg-foreground text-background hover:opacity-90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'إضافة الرابط'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple Link Sub-View (generic for WhatsApp, Telegram, etc.)        */
/* ------------------------------------------------------------------ */

const SIMPLE_LINK_DEFAULTS: Record<string, { placeholder: string; urlPrefix: string; title: string }> = {
  whatsapp:   { placeholder: 'https://wa.me/966xxxxxxxxx', urlPrefix: 'https://wa.me/', title: 'WhatsApp' },
  telegram:   { placeholder: 'https://t.me/username', urlPrefix: 'https://t.me/', title: 'Telegram' },
  zoom:       { placeholder: 'https://zoom.us/j/...', urlPrefix: 'https://zoom.us/', title: 'Zoom' },
  email:      { placeholder: 'example@email.com', urlPrefix: '', title: 'البريد الإلكتروني' },
  github:     { placeholder: 'https://github.com/username', urlPrefix: 'https://github.com/', title: 'GitHub' },
  soundcloud: { placeholder: 'https://soundcloud.com/username', urlPrefix: 'https://soundcloud.com/', title: 'SoundCloud' },
  website:    { placeholder: 'https://example.com', urlPrefix: 'https://', title: 'موقع إلكتروني' },
};

function SimpleLinkSubView({
  platformId,
  onBack,
  onAddSuccess,
}: {
  platformId: string;
  onBack: () => void;
  onAddSuccess?: () => void;
}) {
  const defaults = SIMPLE_LINK_DEFAULTS[platformId] ?? { placeholder: 'https://', urlPrefix: 'https://', title: platformId };
  const item = linkItems.find((i) => i.id === platformId);
  const brand = item ? getBrandByKey(item.brandKey) : null;
  const localIconPath = item ? getLocalIconPathByKey(item.brandKey) : null;

  const [urlInput, setUrlInput] = useState(defaults.urlPrefix);
  const [isAdding, setIsAdding] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  useEffect(() => {
    setTimeout(() => urlRef.current?.focus(), 150);
  }, []);

  const handleAdd = useCallback(async () => {
    const value = urlInput.trim();
    if (!value || value === defaults.urlPrefix) {
      showToast({ title: 'تنبيه', message: 'الرجاء إدخال الرابط', variant: 'error' });
      return;
    }
    try {
      setIsAdding(true);
      const isEmail = platformId === 'email';
      const finalUrl = isEmail
        ? (value.startsWith('mailto:') ? value : `mailto:${value}`)
        : normalizeUrl(value);
      const username = isEmail ? value.replace('mailto:', '') : inferUsernameFromUrl(finalUrl, platformId);
      await createSocialLink({
        platform: platformId,
        username,
        url: finalUrl,
        title: defaults.title,
      });
      showToast({ title: 'تمت الإضافة', message: `تم إضافة رابط ${defaults.title}`, variant: 'success' });
      onAddSuccess?.();
    } catch {
      showToast({ title: 'خطأ', message: 'فشل إضافة الرابط', variant: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [urlInput, platformId, defaults, showToast, onAddSuccess]);

  return (
    <motion.div
      key="simple-link-sub"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="flex flex-col min-h-0 flex-1 overflow-hidden"
    >
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onBack} className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">رجوع</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {localIconPath ? (
            <img src={localIconPath} alt={defaults.title} className="w-8 h-8" />
          ) : brand ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `#${brand.hex}` }}>
              <BrandIcon brand={brand} className="w-4.5 h-4.5 text-white" />
            </div>
          ) : platformId === 'website' ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
          ) : platformId === 'email' ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500">
              <Mail className="w-4.5 h-4.5 text-white" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: item?.fallbackBg ?? '#6366f1' }}>
              <Link2 className="w-4.5 h-4.5 text-white" />
            </div>
          )}
          <span className="font-semibold text-sm">{defaults.title}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-3 sm:p-4 space-y-4 pb-8">
        <p className="text-sm text-muted-foreground">{item?.description}</p>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {platformId === 'email' ? 'البريد الإلكتروني' : 'الرابط'}
          </label>
          <input
            ref={urlRef}
            type={platformId === 'email' ? 'email' : 'url'}
            dir="ltr"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={defaults.placeholder}
            className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={isAdding || !urlInput.trim() || urlInput.trim() === defaults.urlPrefix}
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إضافة
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detected URL card                                                  */
/* ------------------------------------------------------------------ */

function DetectedUrlCard({
  platformKey,
  brand,
  url,
  onAddSuccess,
}: {
  platformKey: string;
  brand: BrandInfo | null;
  url: string;
  onAddSuccess?: () => void;
}) {
  const domain = extractDomain(url);
  const localIconPath = getLocalIconPathByKey(platformKey);
  const fallbackTitle =
    linkItems.find((item) => item.brandKey === platformKey)?.name ?? platformKey;
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [useThumbnail, setUseThumbnail] = useState(true);
  const { show: showToast } = useToast();

  // Fetch metadata with debounce
  useEffect(() => {
    let cancelled = false;
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;

    setMetadata(null);
    setIsFetchingMeta(true);

    const timer = setTimeout(() => {
      fetchUrlMetadata(normalizedUrl)
        .then((data) => {
          if (!cancelled) setMetadata(data);
        })
        .catch((err) => {
          console.error('Failed to fetch URL metadata:', err);
        })
        .finally(() => {
          if (!cancelled) setIsFetchingMeta(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  const displayTitle = metadata?.title || (brand?.title ?? fallbackTitle);
  const hasThumbnail = !!metadata?.image;

  const handleAdd = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const normalizedUrl = normalizeUrl(url);
      const username = inferUsernameFromUrl(normalizedUrl, platformKey);
      
      await createSocialLink({
        platform: platformKey,
        username,
        url: normalizedUrl,
        title: (metadata?.title || brand?.title || fallbackTitle).slice(0, 50),
        thumbnail: useThumbnail && metadata?.image ? metadata.image : undefined,
      });

      showToast({
        title: 'تمت الإضافة بنجاح',
        message: `تم إضافة ${displayTitle}`,
        variant: 'success',
      });

      onAddSuccess?.();
    } catch (error) {
      console.error('Failed to add link:', error);
      showToast({
        title: 'خطأ',
        message: 'حدث خطأ عند إضافة الرابط',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [platformKey, url, brand?.title, fallbackTitle, metadata?.title, metadata?.image, useThumbnail, displayTitle, onAddSuccess, showToast]);

  /* ---- Icon rendering helper ---- */
  const renderPlatformIcon = () => {
    if (localIconPath) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-white dark:bg-zinc-900 border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={localIconPath} alt={fallbackTitle} width={20} height={20} className="w-5 h-5" />
        </div>
      );
    }
    if (brand) {
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: `#${brand.hex}` }}
        >
          <BrandIcon brand={brand} className="w-5 h-5 text-white" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-muted">
        <Link2 className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border/60 mb-4 overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Show thumbnail or platform icon */}
        {useThumbnail && metadata?.image ? (
          <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={metadata.image} alt={displayTitle} className="w-full h-full object-cover" />
          </div>
        ) : (
          renderPlatformIcon()
        )}
        <div className="flex-1 min-w-0">
          {isFetchingMeta ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">جاري جلب المعلومات...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground truncate">
                {metadata?.title ? metadata.title : `تم التعرف على ${brand?.title ?? fallbackTitle}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate" dir="ltr">
                {domain}
              </p>
            </>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={isLoading || isFetchingMeta}
          className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري...
            </>
          ) : (
            'إضافة'
          )}
        </button>
      </div>

      {/* Thumbnail/Logo toggle — only show when metadata has an image */}
      {!isFetchingMeta && hasThumbnail && (
        <div className="flex items-center gap-2 px-3 pb-3">
          <button
            onClick={() => setUseThumbnail(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              useThumbnail
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            <ImageIcon className="w-3 h-3" />
            صورة مصغرة
          </button>
          <button
            onClick={() => setUseThumbnail(false)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              !useThumbnail
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            <Palette className="w-3 h-3" />
            شعار المنصة
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Unknown URL card (favicon fallback)                                */
/* ------------------------------------------------------------------ */

function UnknownUrlCard({
  url,
  onAddSuccess,
}: {
  url: string;
  onAddSuccess?: () => void;
}) {
  const domain = extractDomain(url);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [useThumbnail, setUseThumbnail] = useState(true);
  const { show: showToast } = useToast();

  // Fetch metadata with debounce
  useEffect(() => {
    let cancelled = false;
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;

    setMetadata(null);
    setIsFetchingMeta(true);

    const timer = setTimeout(() => {
      fetchUrlMetadata(normalizedUrl)
        .then((data) => {
          if (!cancelled) setMetadata(data);
        })
        .catch((err) => {
          console.error('Failed to fetch URL metadata:', err);
        })
        .finally(() => {
          if (!cancelled) setIsFetchingMeta(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  if (!domain) return null;

  const displayTitle = metadata?.title || domain;
  const hasThumbnail = !!metadata?.image;

  const handleAdd = useCallback(async () => {
    try {
      setIsLoading(true);
      const normalizedUrl = normalizeUrl(url);
      const username = inferUsernameFromUrl(normalizedUrl);

      await createSocialLink({
        platform: 'custom',
        username,
        url: normalizedUrl,
        title: (metadata?.title || domain).slice(0, 50),
        thumbnail: useThumbnail && metadata?.image ? metadata.image : undefined,
      });

      showToast({
        title: 'تمت الإضافة بنجاح',
        message: `تم إضافة ${displayTitle}`,
        variant: 'success',
      });

      onAddSuccess?.();
    } catch (error) {
      console.error('Failed to add link:', error);
      showToast({
        title: 'خطأ',
        message: 'حدث خطأ عند إضافة الرابط',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [url, domain, metadata?.title, metadata?.image, useThumbnail, displayTitle, showToast, onAddSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border/60 mb-4 overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {useThumbnail && metadata?.image ? (
          <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={metadata.image} alt={displayTitle} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFaviconUrl(domain)}
              alt={domain}
              width={20}
              height={20}
              className="w-5 h-5 rounded-sm"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {isFetchingMeta ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">جاري جلب المعلومات...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground truncate">
                {metadata?.title || 'رابط خارجي'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate" dir="ltr">
                {domain}
              </p>
            </>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={isLoading || isFetchingMeta}
          className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري...
            </>
          ) : (
            'إضافة'
          )}
        </button>
      </div>

      {/* Thumbnail/Favicon toggle */}
      {!isFetchingMeta && hasThumbnail && (
        <div className="flex items-center gap-2 px-3 pb-3">
          <button
            onClick={() => setUseThumbnail(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              useThumbnail
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            <ImageIcon className="w-3 h-3" />
            صورة مصغرة
          </button>
          <button
            onClick={() => setUseThumbnail(false)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              !useThumbnail
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            <Palette className="w-3 h-3" />
            أيقونة الموقع
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Link item row                                                      */
/* ------------------------------------------------------------------ */

function LinkItemRow({ item, onClick }: { item: LinkItemData; onClick?: () => void }) {
  const brand = getBrandByKey(item.brandKey);
  const localIconPath = getLocalIconPathByKey(item.brandKey);
  const hasSubView = item.id === 'instagram' || item.id === 'youtube' || item.id === 'tiktok' || item.id === 'forms' || item.id === 'linkedin';
  const isSimpleLink = !hasSubView && !item.brandKey.startsWith('_store') && item.id in SIMPLE_LINK_DEFAULTS;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/50 transition-colors group text-start w-full"
    >
      {/* Icon */}
      {localIconPath ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-white dark:bg-zinc-900 border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={localIconPath} alt={item.name} width={20} height={20} className="w-5 h-5" />
        </div>
      ) : brand ? (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: `#${brand.hex}` }}
        >
          <BrandIcon brand={brand} className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'website' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-indigo-500">
          <Globe className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'email' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-sky-500">
          <Mail className="w-5 h-5 text-white" />
        </div>
      ) : item.brandKey === '_form' ? (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: item.fallbackBg ?? '#6366f1' }}
        >
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'add-product' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: item.fallbackBg ?? '#10B981' }}>
          <Package className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'add-discount' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: item.fallbackBg ?? '#F59E0B' }}>
          <Percent className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'add-ad' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: item.fallbackBg ?? '#8B5CF6' }}>
          <Megaphone className="w-5 h-5 text-white" />
        </div>
      ) : item.id === 'social-promote' ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: item.fallbackBg ?? '#EC4899' }}>
          <Share2 className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: item.fallbackBg ?? '#6366f1' }}
        >
          <Link2 className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.description}
        </p>
      </div>

      {/* Arrow / indicator */}
      {hasSubView ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            خيارات
          </span>
          <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      ) : (
        <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  AddLinkDialog                                                      */
/* ------------------------------------------------------------------ */

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSuccess?: () => void;
}

export function AddLinkDialog({ open, onOpenChange, onAddSuccess }: AddLinkDialogProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setActiveCategory('suggested');
      setSelectedPlatform(null);
    }
  }, [open]);

  // Clear platform sub-view when search is used
  useEffect(() => {
    if (searchQuery) setSelectedPlatform(null);
  }, [searchQuery]);

  /* ---- URL detection --------------------------------------------- */
  const isUrl = useMemo(() => {
    const q = searchQuery.trim();
    return /^https?:\/\//i.test(q) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(q);
  }, [searchQuery]);

  const detectedPlatformKey = useMemo(() => {
    if (!isUrl) return null;
    return detectPlatformKeyFromUrl(searchQuery.trim());
  }, [isUrl, searchQuery]);

  const detectedBrand = useMemo(() => {
    if (!detectedPlatformKey) return null;
    return getBrandByKey(detectedPlatformKey);
  }, [detectedPlatformKey]);

  const STORE_ROUTES: Record<string, string> = {
    'add-product': '/app/store?action=add-product',
    'add-discount': '/app/settings/store/marketing?tab=discounts',
    'add-ad': '/app/settings/store/marketing?tab=ads',
    'social-promote': '/app/settings/store/marketing?tab=social',
  };

  /* ---- Filtering ------------------------------------------------- */
  const filteredItems = useMemo(() => {
    return linkItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === 'all' || item.category.includes(activeCategory);

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden h-[85vh] sm:h-[85vh] max-h-[85vh] flex flex-col"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold">
            إضافة
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search (hidden when in sub-view) ── */}
        <AnimatePresence>
          {!selectedPlatform && (
            <motion.div
              key="search-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden px-4 sm:px-5 pb-3 sm:pb-4"
            >
              <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-card border border-border/60 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="الصق رابط أو ابحث..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Body: Sub-view or Main view ── */}
        <AnimatePresence mode="wait">
          {selectedPlatform === 'instagram' ? (
            <InstagramSubView
              key="instagram-sub"
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : selectedPlatform === 'youtube' ? (
            <YouTubeSubView
              key="youtube-sub"
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : selectedPlatform === 'tiktok' ? (
            <TikTokSubView
              key="tiktok-sub"
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : selectedPlatform === 'forms' ? (
            <FormShortcutSubView
              key="forms-sub"
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : selectedPlatform === 'linkedin' ? (
            <LinkedInSubView
              key="linkedin-sub"
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : selectedPlatform && selectedPlatform in SIMPLE_LINK_DEFAULTS ? (
            <SimpleLinkSubView
              key={`${selectedPlatform}-sub`}
              platformId={selectedPlatform}
              onBack={() => setSelectedPlatform(null)}
              onAddSuccess={() => {
                setSelectedPlatform(null);
                setSearchQuery('');
                onOpenChange(false);
                onAddSuccess?.();
              }}
            />
          ) : (
            <motion.div
              key="main-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col sm:flex-row min-h-0 flex-1 m-2 rounded-2xl border-t border-border/60 overflow-hidden"
            >
          {/* Mobile: horizontal scroll categories */}
          <nav className="sm:hidden shrink-0 border-b border-border/60 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-1.5 px-3 py-2.5 min-w-max">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground bg-muted/40'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Desktop: sidebar categories */}
          <nav className="hidden sm:block w-40 shrink-0 border-e border-border/60 py-2 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col gap-0.5 px-2">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-start',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden py-3 sm:py-4 px-3 sm:px-4 pb-8">
            {/* URL auto-detection */}
            {isUrl && detectedPlatformKey && (
              <DetectedUrlCard
                platformKey={detectedPlatformKey}
                brand={detectedBrand}
                url={searchQuery.trim()}
                onAddSuccess={() => {
                  setSearchQuery('');
                  setActiveCategory('suggested');
                  onOpenChange(false);
                  onAddSuccess?.();
                }}
              />
            )}
            {isUrl && !detectedPlatformKey && (
              <UnknownUrlCard
                url={searchQuery.trim()}
                onAddSuccess={() => {
                  setSearchQuery('');
                  setActiveCategory('suggested');
                  onOpenChange(false);
                  onAddSuccess?.();
                }}
              />
            )}

            {/* Section title */}
            <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
              {searchQuery
                ? `نتائج البحث (${filteredItems.length})`
                : categories.find((c) => c.id === activeCategory)?.label ?? ''}
            </p>

            {/* Link items list */}
            <div className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <LinkItemRow
                    key={item.id}
                    item={item}
                    onClick={
                      item.id === 'instagram' ? () => setSelectedPlatform('instagram')
                      : item.id === 'youtube' ? () => setSelectedPlatform('youtube')
                      : item.id === 'tiktok' ? () => setSelectedPlatform('tiktok')
                      : item.id === 'forms' ? () => setSelectedPlatform('forms')
                      : item.id === 'linkedin' ? () => setSelectedPlatform('linkedin')
                      : (item.id in SIMPLE_LINK_DEFAULTS) ? () => setSelectedPlatform(item.id)
                      : STORE_ROUTES[item.id] ? () => {
                          onOpenChange(false);
                          router.push(STORE_ROUTES[item.id]);
                        }
                      : undefined
                    }
                  />
                ))}
              </AnimatePresence>

              {filteredItems.length === 0 && !isUrl && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    جرّب كلمة بحث مختلفة
                  </p>
                </div>
              )}
            </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
