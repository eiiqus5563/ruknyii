import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type PanInfo, useDragControls } from 'framer-motion';
import {
  MapPin,
  Globe,
  Share2,
  QrCode,
  Copy,
  Check,
  X,
  Twitter,
  Linkedin,
  MessageCircle,
  Link2,
  UserPlus,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  FormInput,
  Star,
  HelpCircle,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { getBrandByKey, getLocalIconPathByKey, extractDomain, getFaviconUrl } from '@/lib/brand-icons';
import { trackLinkClick } from '@/lib/api/social-links';
import { formatCurrency } from '@/lib/currency';
import {
  addToCart,
  getCart,
  getCartCount,
  getCartTotal,
  getCartCurrency,
  createPaymentSession,
  type CartItem,
} from '@/lib/cart-store';
import { ProfileHeader } from '@/components/ui/header-2';
import { LogoCloud } from '@/components/ui/logo-cloud';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CartDialog } from '@/components/cart-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  title?: string;
  thumbnail?: string | null;
  layout?: 'classic' | 'featured';
  status?: string;
  isPinned?: boolean;
  displayOrder: number;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  coverImage?: string;
  location?: string;
  venue?: string;
  _count?: { registrations: number };
}

interface ProductVariant {
  id: string;
  sku?: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  attributes: Record<string, string>;
  imageUrl?: string;
}

interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  currency?: string;
  stock?: number;
  images: string[];
  category?: { id: string; name: string } | null;
  storeId?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isDigital?: boolean;
}

interface PublicForm {
  id: string;
  title: string;
  description?: string;
  slug: string;
  type: string;
  coverImage?: string;
  settings?: any;
  createdAt: string;
  expiresAt?: string;
  _count?: { submissions: number };
}

interface HeroButton {
  label: string;
  url: string;
  variant: 'dark' | 'outline';
}

interface HeroSettings {
  headline?: string;
  description?: string;
  buttons?: HeroButton[];
  logoCloud?: {
    enabled: boolean;
    logos: { id: string; src: string; alt: string; displayOrder: number }[];
  };
}

interface PublicProfile {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  banners?: string[];
  location?: string;
  website?: string;
  visibility: string;
  themeKey?: string;
  heroSettings?: HeroSettings;
  createdAt: string;
  user: { id: string; email?: string; name?: string };
  socialLinks: SocialLink[];
  _count?: { followers: number; following: number };
}

export interface PortfolioTemplateProps {
  profile: PublicProfile;
  products: PublicProduct[];
  events: Event[];
  forms: PublicForm[];
  storeId?: string;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  onShowShare: () => void;
  onShowQR: () => void;
  showQRModal: boolean;
  showShareModal: boolean;
  onCloseQR: () => void;
  onCloseShare: () => void;
  copied: boolean;
  onCopyLink: () => void;
  profileUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getInitials = (name: string): string =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ─── Form Type Styles ────────────────────────────────────────────────────────

const FORM_TYPE_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  CONTACT: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500' },
  SURVEY: { icon: ClipboardList, color: 'text-violet-500', bg: 'bg-violet-500' },
  REGISTRATION: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  ORDER: { icon: ShoppingBag, color: 'text-orange-500', bg: 'bg-orange-500' },
  FEEDBACK: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500' },
  QUIZ: { icon: HelpCircle, color: 'text-pink-500', bg: 'bg-pink-500' },
  APPLICATION: { icon: FormInput, color: 'text-indigo-500', bg: 'bg-indigo-500' },
  OTHER: { icon: ClipboardList, color: 'text-muted-foreground', bg: 'bg-muted-foreground' },
};

const FORM_TYPE_LABELS: Record<string, string> = {
  CONTACT: 'تواصل',
  SURVEY: 'استبيان',
  REGISTRATION: 'تسجيل',
  ORDER: 'طلب',
  FEEDBACK: 'تقييم',
  QUIZ: 'اختبار',
  APPLICATION: 'طلب تقديم',
  OTHER: 'نموذج',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PortfolioTemplate({
  profile,
  products,
  forms,
  storeId,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollow,
  onShowShare,
  onShowQR,
  showQRModal,
  showShareModal,
  onCloseQR,
  onCloseShare,
  copied,
  onCopyLink,
  profileUrl,
}: PortfolioTemplateProps) {
  const router = useRouter();
  const displayName = profile.name || profile.user?.name || profile.username;
  const themeColor = '#0D9488';
  const hero = (profile.heroSettings || {}) as HeroSettings;
  const websiteDomain = profile.website ? extractDomain(profile.website) : null;

  // ─── Cart State ──────────────────────────────────────────────────────────────
  const [cartCount, setCartCount] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);

  useEffect(() => {
    // Sync cart count — only for this store
    const sync = () => {
      const cart = getCart();
      const count = cart && cart.storeUsername === profile.username ? getCartCount() : 0;
      setCartCount(count);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [profile.username]);

  // Re-sync cart when cart dialog closes
  useEffect(() => {
    if (!cartDialogOpen) {
      const cart = getCart();
      setCartCount(cart && cart.storeUsername === profile.username ? getCartCount() : 0);
    }
  }, [cartDialogOpen, profile.username]);

  const handleAddToCart = useCallback((product: PublicProduct, quantity = 1, variant?: ProductVariant | null) => {
    const effectiveStoreId = storeId || product.storeId || '';
    const effectivePrice = variant
      ? variant.price
      : (product.salePrice != null && product.salePrice < product.price ? Number(product.salePrice) : product.price);
    const effectiveOriginalPrice = variant
      ? (variant.compareAtPrice ?? variant.price)
      : product.price;
    const effectiveStock = variant ? variant.stock : (product.stock ?? 999);

    // Build variant display name
    let variantName = '';
    if (variant?.attributes) {
      variantName = Object.values(variant.attributes).join(' / ');
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      currency: product.currency ?? 'IQD',
      image: variant?.imageUrl || product.images?.[0] || '',
      stock: effectiveStock,
      storeId: effectiveStoreId,
      storeUsername: profile.username,
      quantity,
      ...(variant ? {
        variantId: variant.id,
        variantName,
        variantAttributes: variant.attributes,
      } : {}),
      ...(product.isDigital ? { isDigital: true } : {}),
    });
    const newCount = getCartCount();
    setCartCount(newCount);
    window.dispatchEvent(new Event('storage'));
    setAddedProductId(product.id);
    setTimeout(() => {
      setAddedProductId(null);
    }, 1800);
  }, [storeId, profile.username]);

  // ─── Banner Slider State ────────────────────────────────────────────────────
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (!profile?.banners || profile.banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?.banners]);

  // ─── Product Categories ─────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const productCategories = useMemo(() => {
    const cats: { id: string; name: string }[] = [];
    products.forEach((p) => {
      if (p.category && !cats.find((c) => c.id === p.category!.id)) {
        cats.push(p.category);
      }
    });
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category?.id === selectedCategory);
  }, [products, selectedCategory]);

  // ─── Visible Links ──────────────────────────────────────────────────────────
  const visibleLinks = profile.socialLinks
    ?.filter((l) => l.status !== 'hidden' && l.platform?.toLowerCase() !== 'form')
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) ?? [];

  const pinnedLinks = visibleLinks.filter((l) => l.isPinned);
  const unpinnedLinks = visibleLinks.filter((l) => !l.isPinned);
  const featuredLinks = unpinnedLinks.filter((l) => l.layout === 'featured' && l.thumbnail);
  const classicLinks = unpinnedLinks.filter((l) => !(l.layout === 'featured' && l.thumbnail));

  const hasLinks = visibleLinks.length > 0;
  const hasProducts = products.length > 0;
  const hasForms = forms.length > 0;
  const hasBanners = !!profile.banners && profile.banners.length > 0;

  // ─── Section Tabs ──────────────────────────────────────────────────────────
  const availableTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = [];
    if (hasLinks) tabs.push({ key: 'links', label: 'الروابط', count: visibleLinks.length });
    if (hasProducts) tabs.push({ key: 'products', label: 'المنتجات', count: products.length });
    if (hasForms) tabs.push({ key: 'forms', label: 'النماذج', count: forms.length });
    return tabs;
  }, [hasLinks, hasProducts, hasForms, visibleLinks.length, products.length, forms.length]);
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.key || 'links');

  // ─── Product Detail Modal ───────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [showQtySelector, setShowQtySelector] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const productSheetDragControls = useDragControls();

  // Reset quantity and variant when modal opens
  useEffect(() => {
    if (selectedProduct) {
      setModalQty(1);
      setShowQtySelector(false);
      setSelectedVariant(null);
    }
  }, [selectedProduct?.id]);

  // Lock body scroll when product modal is open
  useEffect(() => {
    if (selectedProduct) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedProduct]);

  // ─── Shared Modals ───────────────────────────────────────────────────────────
  const sharedModals = (
    <>
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCloseQR}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border/50"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">مشاركة الملف الشخصي</h3>
                <button onClick={onCloseQR} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex justify-center p-6 bg-white rounded-2xl border border-border/40">
                <QRCodeSVG value={profileUrl} size={200} level="H" includeMargin fgColor={themeColor} />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">امسح الكود للوصول للملف الشخصي</p>
              <button onClick={onCopyLink} className="w-full mt-4 py-3 px-4 bg-muted hover:bg-muted/80 rounded-xl font-medium text-foreground flex items-center justify-center gap-2 transition-colors">
                {copied ? <><Check className="w-5 h-5 text-emerald-500" />تم النسخ!</> : <><Copy className="w-5 h-5" />نسخ الرابط</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCloseShare}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl border border-border/50"
            >
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-foreground mb-5">مشاركة</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'واتساب', icon: MessageCircle, color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(profileUrl)}` },
                  { name: 'تويتر', icon: Twitter, color: '#1DA1F2', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}` },
                  { name: 'لينكدإن', icon: Linkedin, color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}` },
                  { name: 'نسخ', icon: Copy, color: '#6B7280', onClick: onCopyLink },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      else if (item.url) window.open(item.url, '_blank');
                      onCloseShare();
                    }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-105" style={{ backgroundColor: item.color }}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={onCloseShare} className="w-full mt-6 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors">إلغاء</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: '#fefefe' }} // خلفية الصفحة بيج فاتح جدًا
    >
      {/* ── Fixed Navbar ── */}
      <ProfileHeader
        displayName={displayName}
        username={profile.username}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollow={onFollow}
        onShowShare={onShowShare}
        onShowQR={onShowQR}
        cartCount={cartCount}
        onCartClick={() => setCartDialogOpen(true)}
        links={[
          ...(hasLinks ? [{ label: 'الروابط', href: '#links' }] : []),
          ...(hasProducts ? [{ label: 'المنتجات', href: '#products' }] : []),
          ...(hasForms ? [{ label: 'النماذج', href: '#forms' }] : []),
        ]}
      />

      {/* ── Hero Nature Card ── */}
      <div className="w-full px-4 sm:px-6 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-[1200px] rounded-[32px] sm:rounded-[40px] overflow-hidden border border-[#c8d4c0] shadow-[0_2px_40px_-12px_rgba(80,100,60,0.12)]"
          style={{ background: 'linear-gradient(170deg, #f4f7f1 0%, #e8ede3 40%, #dce4d5 100%)' }}
        >
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute -left-32 top-[-60px] h-56 w-56 rounded-full bg-[#8aab6e]/15 blur-[100px]" />
          <div className="pointer-events-none absolute -right-24 bottom-[-40px] h-48 w-48 rounded-full bg-[#6b8a50]/10 blur-[80px]" />

          {/* Two-column grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* ── Right: Profile Image ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center justify-center order-2 md:order-2 px-8 sm:px-12 md:px-14 pt-4 md:pt-14 pb-10 md:pb-14"
            >
              {/* Decorative ring behind image */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[280px] sm:w-[340px] lg:w-[400px] aspect-square rounded-full border border-[#a8bfa0]/30" />
              </div>
              <div
                className="relative w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[350px] aspect-square rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-[0_8px_40px_-8px_rgba(60,80,40,0.18)] ring-1 ring-white/50"
                style={{ background: 'linear-gradient(145deg, #c8d8b8 0%, #a0b890 50%, #7a9a65 100%)' }}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={displayName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[5rem] sm:text-[6rem] font-black text-white/25 select-none">{getInitials(displayName)}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Left: Text Content ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center md:items-start md:text-start justify-center px-6 sm:px-10 md:px-14 pt-10 sm:pt-14 pb-6 md:py-16 order-1 md:order-1"
            >
              {/* Username badge */}
              {profile.username && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3d5a28]/[0.07] px-3.5 py-1.5 text-[11px] sm:text-xs font-medium text-[#5a7a42] mb-5"
                >
                  @{profile.username}
                </motion.span>
              )}

              {/* Main heading */}
              <h1 className="text-[clamp(1.7rem,4.5vw,3rem)] font-bold leading-[1.12] tracking-[-0.02em] mb-2 max-w-[20ch] text-[#2c3a22]">
                {hero.headline || displayName}
              </h1>

              {/* Spacer if no headline */}
              {!hero.headline && <div className="mb-2" />}

              {/* Description */}
              {(hero.description || profile.bio) && (
                <p className="text-[14px] sm:text-[15px] text-[#6b7d5e] leading-[1.75] mt-4 mb-8 max-w-[42ch]">
                  {hero.description || profile.bio}
                </p>
              )}

              {(profile.location || websiteDomain) && (
                <div className="mb-7 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-[#b8ccae] px-3.5 py-2 text-[11px] sm:text-xs font-medium text-[#3d5a28] shadow-sm">
                      <MapPin className="h-3.5 w-3.5 text-[#6b8a50]" />
                      {profile.location}
                    </span>
                  )}
                  {websiteDomain && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-[#b8ccae] px-3.5 py-2 text-[11px] sm:text-xs font-medium text-[#3d5a28] shadow-sm transition-all hover:bg-white hover:shadow-md hover:border-[#8aab6e]"
                    >
                      <Globe className="h-3.5 w-3.5 text-[#6b8a50]" />
                      {websiteDomain}
                    </a>
                  )}
                </div>
              )}

              {/* CTA Buttons */}
              {hero.buttons && hero.buttons.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {hero.buttons.slice(0, 2).map((btn, i) => (
                    <motion.a
                      key={i}
                      href={btn.url}
                      target={btn.url.startsWith('http') ? '_blank' : undefined}
                      rel={btn.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-7 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-sm font-semibold transition-all duration-200',
                        btn.variant === 'dark'
                          ? 'bg-[#3d5a28] text-white shadow-[0_2px_12px_-2px_rgba(61,90,40,0.35)] hover:shadow-[0_4px_20px_-4px_rgba(61,90,40,0.45)]'
                          : 'bg-white text-[#3d5a28] border border-[#b8ccae] shadow-sm hover:shadow-md hover:border-[#8aab6e]',
                      )}
                    >
                      {btn.label}
                      {btn.variant === 'dark' && (
                        <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </motion.a>
                  ))}
                </div>
              )}
            </motion.div>

          </div>

          {/* Bottom fade to background */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32"
            style={{ background: 'linear-gradient(to top, #d4dece 0%, transparent 100%)' }}
          />
        </motion.div>
      </div>

      {/* ── Logo Cloud Slider ── */}
      {hero.logoCloud?.enabled && hero.logoCloud.logos?.length > 0 && (
        <div className="w-full px-4 sm:px-6 mt-3 sm:mt-4 pb-8 sm:pb-10">
          <div className="mx-auto max-w-[1200px] rounded-[24px] sm:rounded-[28px] border border-[#ffffff] bg-[#ffffff]/80 px-5 sm:px-8 py-5 sm:py-6 backdrop-blur-sm">
            <div className="mx-auto h-px max-w-sm bg-[#e6d7b8] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
            <LogoCloud
              className="py-2"
              logos={hero.logoCloud.logos
                .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                .map((l) => ({ id: l.id, src: l.src, alt: l.alt }))}
            />
            <div className="mx-auto h-px max-w-sm bg-[#e6d7b8] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
          </div>
        </div>
      )}

      {/* ── Banner Slider ── */}
      {hasBanners && (
        <div className="w-full px-4 sm:px-6 mt-3 sm:mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-[1200px]"
          >
            <div className="rounded-[24px] sm:rounded-[28px] overflow-hidden border border-[#ede7dd] relative group bg-[#f9f7f2]/80">
              <div
                className="relative h-48 sm:h-64 md:h-80 cursor-grab active:cursor-grabbing touch-pan-y"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStartX = touch.clientX;
                  (e.currentTarget as any)._touchStartTime = Date.now();
                }}
                onTouchEnd={(e) => {
                  const touchStartX = (e.currentTarget as any)._touchStartX;
                  const touchStartTime = (e.currentTarget as any)._touchStartTime;
                  if (touchStartX === undefined) return;
                  const touch = e.changedTouches[0];
                  const diff = touchStartX - touch.clientX;
                  const timeDiff = Date.now() - touchStartTime;
                  if (Math.abs(diff) > 50 || (Math.abs(diff) > 20 && timeDiff < 200)) {
                    if (diff > 0) setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1));
                    else setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
                  }
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as any)._mouseStartX = e.clientX;
                  (e.currentTarget as any)._isDragging = true;
                }}
                onMouseUp={(e) => {
                  const mouseStartX = (e.currentTarget as any)._mouseStartX;
                  if (mouseStartX === undefined || !(e.currentTarget as any)._isDragging) return;
                  (e.currentTarget as any)._isDragging = false;
                  const diff = mouseStartX - e.clientX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1));
                    else setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
                  }
                }}
                onMouseLeave={(e) => { (e.currentTarget as any)._isDragging = false; }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentBanner}
                    src={profile.banners![currentBanner]}
                    alt={`Banner ${currentBanner + 1}`}
                    className="w-full h-full object-cover absolute inset-0 select-none pointer-events-none"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    draggable={false}
                  />
                </AnimatePresence>

                {/* Navigation Arrows */}
                {profile.banners!.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Dots */}
                {profile.banners!.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1.5">
                    {profile.banners!.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBanner(idx)}
                        className={cn(
                          'rounded-full transition-all duration-300',
                          idx === currentBanner
                            ? 'bg-white w-5 h-1.5'
                            : 'bg-white/50 hover:bg-white/80 w-1.5 h-1.5',
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Section Tabs ── */}
      {availableTabs.length > 0 && (
        <div className="w-full px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex items-center justify-center gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {availableTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'shrink-0 px-6 py-2.5 rounded-full text-[14px] font-semibold transition-all border',
                    activeTab === tab.key
                      ? 'bg-[#3d5a28] text-white border-[#3d5a28]'
                      : 'bg-white text-[#6b7d5e] border-[#c8d4c0] hover:border-[#8aab6e] hover:text-[#2c3a22]',
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'mr-1.5 text-[12px]',
                    activeTab === tab.key ? 'text-white/60' : 'text-[#8aab6e]',
                  )}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Links Section ── */}
      {hasLinks && activeTab === 'links' && (
        <div id="links" className="w-full px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#3d5a28]/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-[#5a7a42]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#2c3a22]">الروابط</h2>
                  <p className="text-xs text-[#6b7d5e]">{visibleLinks.length} رابط</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Pinned Links */}
                {pinnedLinks.length > 0 && (
                  <div className="space-y-2.5">
                    {pinnedLinks.map((link, index) => {
                      const platformKey = link.platform?.toLowerCase() ?? '';
                      const brand = getBrandByKey(platformKey);
                      const localIconPath = getLocalIconPathByKey(platformKey);
                      const domain = extractDomain(link.url);
                      const hasThumbnail = link.layout === 'featured' && link.thumbnail;
                      return (
                        <motion.a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackLinkClick(link.id)}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="block overflow-hidden rounded-4xl border border-[#091413]/40 bg-[#f4f7f1] hover:bg-[#e8ede3] hover:border-[#8aab6e]/70 hover:-translate-y-0.5 transition-all duration-200 group relative backdrop-blur-sm p-3 md:p-4 min-h-[90px] md:min-h-[110px]"
                        >
                          {/* Pinned badge */}
                          <div className="absolute ml-2 top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#6b8a50]/15 text-[#3d5a28] text-[10px] font-medium">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5a.5.5 0 0 1-1 0V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/></svg>
                              مثبّت
                            </span>
                          </div>
                          {hasThumbnail && (
                            <div className="p-2 pb-0">
                              <div className="relative w-full aspect-[3/2] overflow-hidden rounded-xl bg-[#e8ede3]">
                                <img src={link.thumbnail!} alt={link.title || platformKey} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 p-2 md:p-3">
                            <LinkIcon platformKey={platformKey} brand={brand} localIconPath={localIconPath} domain={domain} thumbnail={!hasThumbnail ? link.thumbnail : undefined} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[1rem] md:text-base text-[#2c3a22] truncate">{link.title || link.platform}</p>
                              {!hasThumbnail && <p className="text-[12px] md:text-[13px] text-[#6b7d5e] truncate mt-0.5">{link.url}</p>}
                            </div>
                            <ArrowLeft className="w-4 h-4 text-[#8aab6e] group-hover:text-[#3d5a28] group-hover:-translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </motion.a>
                      );
                    })}
                  </div>
                )}

                {/* Featured Links */}
                {featuredLinks.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featuredLinks.map((link, index) => {
                      const platformKey = link.platform?.toLowerCase() ?? '';
                      const brand = getBrandByKey(platformKey);
                      const localIconPath = getLocalIconPathByKey(platformKey);
                      const domain = extractDomain(link.url);
                      return (
                        <motion.a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackLinkClick(link.id)}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="block overflow-hidden rounded-2xl border border-[#c8d4c0] bg-[#f4f7f1] hover:bg-[#e8ede3] hover:-translate-y-0.5 transition-all duration-200 group backdrop-blur-sm p-3 md:p-4 min-h-[90px] md:min-h-[110px]"
                        >
                          <div className="p-2 pb-0">
                            <div className="relative w-full aspect-[3/2] overflow-hidden rounded-xl bg-[#e8ede3]">
                              <img src={link.thumbnail!} alt={link.title || platformKey} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-2 md:p-3">
                            <LinkIcon platformKey={platformKey} brand={brand} localIconPath={localIconPath} domain={domain} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[1rem] md:text-base text-[#2c3a22] truncate">{link.title || link.platform}</p>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-[#8aab6e] group-hover:text-[#3d5a28] group-hover:-translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </motion.a>
                      );
                    })}
                  </div>
                )}

                {/* Classic Links */}
                {classicLinks.length > 0 && (
                  <div className="space-y-2.5">
                    {classicLinks.map((link, index) => {
                      const platformKey = link.platform?.toLowerCase() ?? '';
                      const brand = getBrandByKey(platformKey);
                      const localIconPath = getLocalIconPathByKey(platformKey);
                      const domain = extractDomain(link.url);
                      return (
                        <motion.a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackLinkClick(link.id)}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.04 }}
                          className="flex items-center gap-3 rounded-2xl border border-[#c8d4c0] bg-[#f4f7f1] hover:bg-[#e8ede3] hover:-translate-y-0.5 transition-all duration-200 group backdrop-blur-sm p-3 md:p-4 min-h-[90px] md:min-h-[110px]"
                        >
                          <LinkIcon platformKey={platformKey} brand={brand} localIconPath={localIconPath} domain={domain} thumbnail={link.thumbnail} size={36} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[1rem] md:text-base text-[#2c3a22] truncate">{link.title || link.platform}</p>
                            <p className="text-[12px] md:text-[13px] text-[#6b7d5e] truncate mt-0.5">{link.url}</p>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-[#8aab6e] group-hover:text-[#3d5a28] group-hover:-translate-x-1 transition-all flex-shrink-0" />
                        </motion.a>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Products Section ── */}
      {hasProducts && activeTab === 'products' && (
        <div id="products" className="w-full px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1c1a14] flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1c1a14] leading-tight">المنتجات</h2>
                    <p className="text-[12px] text-[#b0a898]">{products.length} منتج</p>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              {productCategories.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium transition-all',
                      !selectedCategory
                        ? 'bg-[#1c1a14] text-white'
                        : 'bg-[#f5f3f0] text-[#6e6658] hover:text-[#1c1a14]',
                    )}
                  >
                    الكل
                  </button>
                  {productCategories.map((cat) => {
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        className={cn(
                          'shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium transition-all',
                          selectedCategory === cat.id
                            ? 'bg-[#1c1a14] text-white'
                            : 'bg-[#f5f3f0] text-[#6e6658] hover:text-[#1c1a14]',
                        )}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6 items-start">
                {filteredProducts.map((product, index) => (
                  <PortfolioProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onClick={() => setSelectedProduct(product)}
                    onAddToCart={product.hasVariants ? () => setSelectedProduct(product) : () => handleAddToCart(product)}
                  />
                ))}
              </div>

              {/* No results after filter */}
              {filteredProducts.length === 0 && products.length > 0 && (
                <div className="text-center py-12">
                  <ShoppingBag className="w-10 h-10 text-[#c9b18a]/40 mx-auto mb-3" />
                  <p className="font-medium text-sm text-[#6e6658]">لا توجد منتجات في هذا التصنيف</p>
                  <button onClick={() => setSelectedCategory(null)} className="mt-2 text-xs text-[#90795a] hover:underline">عرض جميع المنتجات</button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Forms Section ── */}
      {hasForms && activeTab === 'forms' && (
        <div id="forms" className="w-full px-4 sm:px-6 mt-6 sm:mt-8 pb-12">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#1c1a14]/5 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-[#6e6658]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1c1a14]">النماذج</h2>
                  <p className="text-xs text-[#8c8478]">{forms.length} نموذج</p>
                </div>
              </div>

              {/* Forms Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-[20px] gap-y-[30px] justify-center items-start">
                {forms.map((form, index) => {
                  const typeStyle = FORM_TYPE_STYLES[form.type] || FORM_TYPE_STYLES.OTHER;
                  const TypeIcon = typeStyle.icon;
                  const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();
                  return (
                    <motion.a
                      key={form.id}
                      href={`/f/${form.slug}`}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.06 }}
                      className="rounded-xl bg-white p-2 pb-2.5 group shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Image/Icon */}
                      <div className="relative aspect-square rounded-3xl overflow-hidden bg-[#f5f5f5]">
                        {form.coverImage ? (
                          <img
                            src={form.coverImage}
                            alt={form.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <TypeIcon className={cn('w-8 h-8', typeStyle.color)} />
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="pt-2 px-0.5">
                        <p className="text-[16px] font-bold text-[#000] mb-0.5">
                          {FORM_TYPE_LABELS[form.type] || 'نموذج'}
                        </p>
                        <h3 className="text-[12px] text-[#555] line-clamp-1 leading-relaxed truncate">{form.title}</h3>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Product Detail Modal ── */}
      <AnimatePresence mode="wait">
      {selectedProduct && (
        <motion.div
          key="product-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className='fixed inset-0 z-[140] flex items-end md:items-center justify-center p-0 md:p-6'
        >
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-[3px]'
            onClick={() => setSelectedProduct(null)}
          />

          {/* ═══ Mobile Bottom Sheet ═══ */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
            drag="y"
            dragControls={productSheetDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            dragTransition={{ bounceStiffness: 300, bounceDamping: 25 }}
            onDragEnd={(_: any, info: PanInfo) => {
              if (info.offset.y > 80 || info.velocity.y > 300) {
                setSelectedProduct(null);
              }
            }}
            className='relative bg-white z-[141] rounded-t-[24px] w-full max-h-[92vh] flex flex-col md:hidden'
            style={{ willChange: 'transform' }}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-1.5 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => productSheetDragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              <div className="w-9 h-1 rounded-full bg-[#e0e0e0]" />
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain pb-28">
              {/* Product Image */}
              <div className="px-4 pb-3">
                <div className="relative w-full rounded-2xl overflow-hidden bg-[#f5f3f0]" style={{ height: selectedProduct.images.length > 1 ? 'calc(100vw + 60px)' : '100vw', maxHeight: '480px' }}>
                  <ProductImageSlider images={selectedProduct.images} name={selectedProduct.name} />
                </div>
              </div>

              {/* Product Info */}
              <div className="px-5 pt-2">
                {/* Store Name */}
                <p className="text-[12px] font-medium text-[#b0a898] uppercase tracking-wide">{displayName}</p>

                {/* Product Name */}
                <h2 className="mt-1.5 text-[20px] font-bold text-[#1D1D1F] leading-snug">{selectedProduct.name}</h2>

                {/* Category tag */}
                {selectedProduct.category && (
                  <span className="inline-block mt-2 text-[11px] font-medium text-[#8c8478] bg-[#f5f3f0] px-2.5 py-1 rounded-lg">
                    {selectedProduct.category.name}
                  </span>
                )}

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-2">
                  {(() => {
                    const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? Number(selectedProduct.salePrice) : selectedProduct.price);
                    const displayOriginal = selectedVariant ? (selectedVariant.compareAtPrice ?? null) : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? selectedProduct.price : null);
                    const hasDiscount = displayOriginal != null && displayOriginal > displayPrice;
                    return hasDiscount ? (
                      <>
                        <span className="text-[22px] font-bold text-[#1D1D1F]">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                        <span className="line-through text-[14px] text-[#b0a898]">{formatCurrency(displayOriginal, selectedProduct.currency)}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[11px] font-bold">
                          {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%-
                        </span>
                      </>
                    ) : (
                      <span className="text-[22px] font-bold text-[#1D1D1F]">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                    );
                  })()}
                </div>

                {/* Stock & Shipping Info */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {(() => {
                    const displayStock = selectedVariant ? selectedVariant.stock : selectedProduct.stock;
                    return (
                      <>
                        {typeof displayStock === 'number' && displayStock > 0 && displayStock <= 10 && (
                          <span className="flex items-center gap-1 text-[12px] text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            باقي {displayStock} فقط
                          </span>
                        )}
                        {typeof displayStock === 'number' && displayStock > 10 && (
                          <span className="flex items-center gap-1 text-[12px] text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            متوفر في المخزون
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <span className="flex items-center gap-1.5 text-[12px] text-[#8c8478]">
                    <Truck className="w-3.5 h-3.5" />
                    <span>يتم حساب الشحن عند الدفع</span>
                  </span>
                </div>

                {/* ─── Variant Selector ─── */}
                {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (() => {
                  // Group variants by attribute keys
                  const attrKeys = [...new Set(selectedProduct.variants.flatMap(v => Object.keys(v.attributes as Record<string, string>)))];
                  return (
                    <div className="mt-4 pt-4 border-t border-[#f0ede8] space-y-3">
                      {attrKeys.map(key => {
                        const values = [...new Set(selectedProduct.variants!.map(v => (v.attributes as Record<string, string>)[key]).filter(Boolean))];
                        return (
                          <div key={key}>
                            <p className="text-[12px] font-semibold text-[#1D1D1F] mb-2">{key}</p>
                            <div className="flex flex-wrap gap-2">
                              {values.map(val => {
                                const isSelected = selectedVariant?.attributes && (selectedVariant.attributes as Record<string, string>)[key] === val;
                                // Check if this value has any available variant
                                const hasStock = selectedProduct.variants!.some(v => (v.attributes as Record<string, string>)[key] === val && v.stock > 0);
                                return (
                                  <button
                                    key={val}
                                    onClick={() => {
                                      // Find the variant matching this selection
                                      const match = selectedProduct.variants!.find(v => {
                                        const attrs = v.attributes as Record<string, string>;
                                        // If we already have selections for other keys, match those too
                                        if (selectedVariant) {
                                          const currentAttrs = selectedVariant.attributes as Record<string, string>;
                                          return Object.keys(attrs).every(k => k === key ? attrs[k] === val : attrs[k] === currentAttrs[k]);
                                        }
                                        return attrs[key] === val;
                                      });
                                      if (match) {
                                        setSelectedVariant(match);
                                        setModalQty(1);
                                        setShowQtySelector(false);
                                      }
                                    }}
                                    disabled={!hasStock}
                                    className={cn(
                                      'px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-all',
                                      isSelected
                                        ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                        : hasStock
                                          ? 'bg-white text-[#1D1D1F] border-[#e0ddd8] hover:border-[#1D1D1F]'
                                          : 'bg-[#f5f3f0] text-[#ccc] border-[#f0ede8] line-through cursor-not-allowed',
                                    )}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Description */}
                {selectedProduct.description && (
                  <div className="mt-4 pt-4 border-t border-[#f0ede8]">
                    <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-2">وصف المنتج</h3>
                    <p dir="rtl" className="text-[14px] text-[#666] leading-[1.8] text-right whitespace-pre-line">{selectedProduct.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Bottom Bar */}
            <div className="absolute bottom-0 inset-x-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white to-white/0 px-4 pt-3">
              {/* Cart summary bar - shows when cart has items */}
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 8 }}
                    exit={{ opacity: 0, y: 10, height: 0, marginBottom: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); setCartDialogOpen(true); }}
                      className="w-full h-[50px] bg-[#1D1D1F] rounded-2xl flex items-center justify-between px-4"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <ShoppingBag className="w-4 h-4 text-white" />
                          <motion.span
                            key={cartCount}
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5"
                          >{cartCount}</motion.span>
                        </div>
                        <span className="text-[13px] text-white/70">الإجمالي</span>
                        <motion.span
                          key={getCartTotal()}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-[14px] font-bold text-white tabular-nums"
                        >{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] text-white/80 font-medium">عرض السلة</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add to cart row */}
              <div className="flex items-center gap-2.5">
                <AnimatePresence mode="wait">
                  {addedProductId === selectedProduct?.id ? (
                    <motion.div key="added-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                      <div className="h-[48px] rounded-2xl bg-emerald-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-[17px] h-[17px]" />تمت الإضافة
                      </div>
                    </motion.div>
                  ) : selectedProduct.hasVariants && !selectedVariant ? (
                    <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                      <div className="h-[48px] rounded-2xl bg-[#e0ddd8] text-[#8c8478] text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                        اختر الخيارات أولاً
                      </div>
                    </motion.div>
                  ) : showQtySelector ? (
                    <motion.div key="qty-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2.5 flex-1">
                      <div className="flex items-center h-[48px] bg-[#f5f3f0] rounded-2xl shrink-0 overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalQty(q => Math.max(1, q - 1)); }}
                          disabled={modalQty <= 1}
                          className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] active:bg-[#e0ddd8] transition-all disabled:opacity-30"
                        >
                          <Minus className="w-4 h-4 text-[#555]" />
                        </button>
                        <motion.span
                          key={modalQty}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="text-[16px] font-bold min-w-[32px] text-center tabular-nums text-[#1D1D1F]"
                        >{modalQty}</motion.span>
                        <button
                          onClick={(e) => { e.stopPropagation(); const maxStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); setModalQty(q => Math.min(q + 1, maxStock)); }}
                          disabled={modalQty >= (selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999))}
                          className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] active:bg-[#e0ddd8] transition-all disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4 text-[#555]" />
                        </button>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(selectedProduct, modalQty, selectedVariant); setShowQtySelector(false); }}
                        className="flex-1 h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex flex-col items-center justify-center gap-0 transition-colors shadow-sm"
                      >
                        <span className="text-[10px] font-medium text-emerald-100/80 leading-none">حدد الكمية ثم أكد</span>
                        <span className="text-[15px] flex items-center gap-1.5 leading-snug">
                          <CheckCircle2 className="w-[15px] h-[15px]" />تأكيد الإضافة ({modalQty})
                        </span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div key="add-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={(e) => { e.stopPropagation(); const effectiveStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); if (effectiveStock !== 0) { setModalQty(1); setShowQtySelector(true); } }}
                        disabled={(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0}
                        className="w-full h-[48px] rounded-2xl bg-[#1D1D1F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0 ? (
                          <span>نفذ المخزون</span>
                        ) : (
                          <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* ═══ Desktop Modal ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className='relative max-h-[85vh] bg-white z-[141] rounded-3xl w-full max-w-[780px] hidden md:flex flex-col overflow-hidden shadow-2xl'>

            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 z-30 h-9 w-9 rounded-full bg-black/5 flex items-center justify-center transition-all hover:bg-black/10 hover:rotate-90 duration-200"
            >
              <X className="w-4 h-4 text-[#555]" />
            </button>

            {/* Two-column layout */}
            <div className='flex flex-row flex-1 min-h-0'>

              {/* Left: Product Image */}
              <div className="w-[360px] shrink-0 bg-[#f5f3f0]">
                <div className="w-full h-full" style={{ minHeight: selectedProduct.images.length > 1 ? '440px' : '360px' }}>
                  <ProductImageSlider images={selectedProduct.images} name={selectedProduct.name} desktop />
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-7 pt-7 pb-4 scrollbar-hide">
                  {/* Store Name */}
                  <p className="text-[12px] font-medium text-[#b0a898] uppercase tracking-wide">{displayName}</p>

                  {/* Product Name */}
                  <h2 className="mt-2 text-[22px] font-bold text-[#1D1D1F] leading-snug">{selectedProduct.name}</h2>

                  {/* Category */}
                  {selectedProduct.category && (
                    <span className="inline-block mt-2.5 text-[11px] font-medium text-[#8c8478] bg-[#f5f3f0] px-2.5 py-1 rounded-lg">
                      {selectedProduct.category.name}
                    </span>
                  )}

                  {/* Price with discount badge */}
                  <div className="mt-4">
                    {(() => {
                      const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? Number(selectedProduct.salePrice) : selectedProduct.price);
                      const displayOriginal = selectedVariant ? (selectedVariant.compareAtPrice ?? null) : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? selectedProduct.price : null);
                      const hasDiscount = displayOriginal != null && displayOriginal > displayPrice;
                      return hasDiscount ? (
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-[26px] font-bold text-[#1D1D1F]">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                          <span className="line-through text-[15px] text-[#ccc]">{formatCurrency(displayOriginal, selectedProduct.currency)}</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[11px] font-bold">
                            {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%-
                          </span>
                        </div>
                      ) : (
                        <span className="text-[26px] font-bold text-[#1D1D1F]">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                      );
                    })()}
                  </div>

                  {/* Stock & Shipping Info */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {(() => {
                      const displayStock = selectedVariant ? selectedVariant.stock : selectedProduct.stock;
                      return (
                        <>
                          {typeof displayStock === 'number' && displayStock > 0 && displayStock <= 10 && (
                            <span className="flex items-center gap-1.5 text-[12px] text-amber-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              باقي {displayStock} فقط
                            </span>
                          )}
                          {typeof displayStock === 'number' && displayStock > 10 && (
                            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              متوفر في المخزون
                            </span>
                          )}
                        </>
                      );
                    })()}
                    <span className="flex items-center gap-1.5 text-[12px] text-[#8c8478]">
                      <Truck className="w-3.5 h-3.5" />
                      <span>يتم حساب الشحن عند الدفع</span>
                    </span>
                  </div>

                  {/* ─── Variant Selector (Desktop) ─── */}
                  {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (() => {
                    const attrKeys = [...new Set(selectedProduct.variants.flatMap(v => Object.keys(v.attributes as Record<string, string>)))];
                    return (
                      <div className="mt-4 pt-4 border-t border-[#f0ede8] space-y-3">
                        {attrKeys.map(key => {
                          const values = [...new Set(selectedProduct.variants!.map(v => (v.attributes as Record<string, string>)[key]).filter(Boolean))];
                          return (
                            <div key={key}>
                              <p className="text-[12px] font-semibold text-[#1D1D1F] mb-2">{key}</p>
                              <div className="flex flex-wrap gap-2">
                                {values.map(val => {
                                  const isSelected = selectedVariant?.attributes && (selectedVariant.attributes as Record<string, string>)[key] === val;
                                  const hasStock = selectedProduct.variants!.some(v => (v.attributes as Record<string, string>)[key] === val && v.stock > 0);
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => {
                                        const match = selectedProduct.variants!.find(v => {
                                          const attrs = v.attributes as Record<string, string>;
                                          if (selectedVariant) {
                                            const currentAttrs = selectedVariant.attributes as Record<string, string>;
                                            return Object.keys(attrs).every(k => k === key ? attrs[k] === val : attrs[k] === currentAttrs[k]);
                                          }
                                          return attrs[key] === val;
                                        });
                                        if (match) {
                                          setSelectedVariant(match);
                                          setModalQty(1);
                                          setShowQtySelector(false);
                                        }
                                      }}
                                      disabled={!hasStock}
                                      className={cn(
                                        'px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-all',
                                        isSelected
                                          ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                          : hasStock
                                            ? 'bg-white text-[#1D1D1F] border-[#e0ddd8] hover:border-[#1D1D1F]'
                                            : 'bg-[#f5f3f0] text-[#ccc] border-[#f0ede8] line-through cursor-not-allowed',
                                      )}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Description */}
                  {selectedProduct.description && (
                    <div className="mt-5 pt-5 border-t border-[#f0ede8]">
                      <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-2">وصف المنتج</h3>
                      <p dir="rtl" className="text-[14px] leading-[1.8] text-[#777] text-right whitespace-pre-line">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Add To Cart - Desktop */}
                <div className="shrink-0 border-t border-[#f0ede8]">
                  {/* Cart summary bar */}
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="overflow-hidden"
                      >
                        <motion.button
                          whileTap={{ scale: 0.99 }}
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); setCartDialogOpen(true); }}
                          className="w-full h-[48px] bg-[#1D1D1F] rounded-2xl mx-auto flex items-center justify-between px-7 hover:bg-[#2a2a2a] transition-colors"
                          style={{ width: 'calc(100% - 40px)', margin: '12px 20px 0' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <ShoppingBag className="w-4 h-4 text-white" />
                              <motion.span
                                key={cartCount}
                                initial={{ scale: 0.5 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5"
                              >{cartCount}</motion.span>
                            </div>
                            <span className="text-[13px] text-white/70">الإجمالي</span>
                            <motion.span
                              key={getCartTotal()}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="text-[14px] font-bold text-white tabular-nums"
                            >{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] text-white/80 font-medium">عرض السلة</span>
                            <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
                          </div>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="px-7 py-5 flex items-center gap-3">
                    <AnimatePresence mode="wait">
                      {addedProductId === selectedProduct?.id ? (
                        <motion.div key="added-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                          <div className="h-[46px] rounded-2xl bg-emerald-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-[17px] h-[17px]" />تمت الإضافة
                          </div>
                        </motion.div>
                      ) : selectedProduct.hasVariants && !selectedVariant ? (
                        <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                          <div className="h-[46px] rounded-2xl bg-[#e0ddd8] text-[#8c8478] text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                            اختر الخيارات أولاً
                          </div>
                        </motion.div>
                      ) : showQtySelector ? (
                        <motion.div key="qty-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3 flex-1">
                          <div className="flex items-center h-[46px] bg-[#f5f3f0] rounded-2xl shrink-0 overflow-hidden">
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalQty(q => Math.max(1, q - 1)); }}
                              disabled={modalQty <= 1}
                              className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] active:bg-[#e0ddd8] transition-all disabled:opacity-30"
                            >
                              <Minus className="w-4 h-4 text-[#555]" />
                            </button>
                            <motion.span
                              key={modalQty}
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              className="text-[16px] font-bold min-w-[32px] text-center tabular-nums text-[#1D1D1F]"
                            >{modalQty}</motion.span>
                            <button
                              onClick={(e) => { e.stopPropagation(); const maxStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); setModalQty(q => Math.min(q + 1, maxStock)); }}
                              disabled={modalQty >= (selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999))}
                              className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] active:bg-[#e0ddd8] transition-all disabled:opacity-30"
                            >
                              <Plus className="w-4 h-4 text-[#555]" />
                            </button>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(selectedProduct, modalQty, selectedVariant); setShowQtySelector(false); }}
                            className="flex-1 h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex flex-col items-center justify-center gap-0 transition-colors shadow-sm"
                          >
                            <span className="text-[10px] font-medium text-emerald-100/80 leading-none">حدد الكمية ثم أكد</span>
                            <span className="text-[15px] flex items-center gap-1.5 leading-snug">
                              <CheckCircle2 className="w-[15px] h-[15px]" />تأكيد الإضافة ({modalQty})
                            </span>
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div key="add-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ backgroundColor: '#333' }}
                            onClick={(e) => { e.stopPropagation(); const effectiveStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); if (effectiveStock !== 0) { setModalQty(1); setShowQtySelector(true); } }}
                            disabled={(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0}
                            className="w-full h-[46px] rounded-2xl bg-[#1D1D1F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0 ? (
                              <span>نفذ المخزون</span>
                            ) : (
                              <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>
                            )}
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Modals ── */}
      {sharedModals}

      {/* ── Cart Dialog ── */}
      <CartDialog open={cartDialogOpen} onClose={() => setCartDialogOpen(false)} />

      {/* ── Floating Cart Badge ── */}
      <AnimatePresence>
        {cartCount > 0 && hasProducts && (
          <motion.button
            key="cart-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCartDialogOpen(true)}
            className="fixed bottom-6 left-6 z-[100] w-[52px] h-[52px] bg-[#1D1D1F] text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35)] hover:bg-[#333] transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 rounded-full text-[11px] font-bold flex items-center justify-center px-1">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className="w-full mt-16 pb-10">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="border-t border-[#e6e0d6]/60 pt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-5 sm:gap-6">
            {/* Store owner info */}
            <div className="flex items-center gap-3">
              {profile.avatar && (
                <img src={profile.avatar} alt={displayName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-[#e6e0d6]" />
              )}
              <div>
                <p className="text-[13px] sm:text-[14px] font-semibold text-[#1c1a14]">{displayName}</p>
                {profile.user?.email && (
                  <p className="text-[11px] sm:text-[12px] text-[#b0a898] mt-0.5">{profile.user.email}</p>
                )}
                {profile.location && (
                  <p className="text-[11px] sm:text-[12px] text-[#b0a898] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Rukny branding */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-[12px] sm:text-[14px] text-[#8c8478] font-medium">Made by</span>
              <a href="https://rukny.io" target="_blank" rel="noopener noreferrer">
                <img src="/ruknylogo.svg" alt="Rukny" className="h-5 sm:h-6 opacity-60 hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}



// ─── Product Card (matches HoverPreviewProductCard from page.tsx) ────────────

function PortfolioProductCard({ product, index, onClick, onAddToCart }: { product: PublicProduct; index: number; onClick: () => void; onAddToCart?: (e: React.MouseEvent) => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const images = product.images ?? [];
  const hasSale =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice < product.price;
  const isOutOfStock = typeof product.stock === 'number' && product.stock === 0;
  const discountPercent = hasSale
    ? Math.round(((product.price - Number(product.salePrice)) / product.price) * 100)
    : 0;

  const stopImageRotation = () => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
  };

  const handleHoverStart = () => {
    if (images.length <= 1) return;
    stopImageRotation();
    rotationIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1800);
  };

  const handleHoverEnd = () => {
    stopImageRotation();
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    return () => stopImageRotation();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'group cursor-pointer',
        isOutOfStock && 'opacity-60',
      )}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#f3f1ee]">
        {images[currentImageIndex] ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={`${product.id}-${currentImageIndex}`}
                src={images[currentImageIndex]}
                alt={product.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>

            {/* Image dots */}
            {images.length > 1 && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {images.map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={cn(
                      'block rounded-full transition-all duration-300',
                      dotIndex === currentImageIndex ? 'h-1.5 w-1.5 bg-white shadow-sm' : 'h-1 w-1 bg-white/50',
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-[#d4cdc2]/40" />
          </div>
        )}

        {/* Discount badge */}
        {hasSale && discountPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-bold">
              %{discountPercent}-
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="px-3 py-1.5 rounded-xl bg-black/60 text-white text-[11px] font-semibold backdrop-blur-sm">
              نفذت الكمية
            </span>
          </div>
        )}

        {/* Quick add button - appears on hover */}
        {!isOutOfStock && onAddToCart && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (justAdded) return;
              setJustAdded(true);
              onAddToCart(e);
              setTimeout(() => setJustAdded(false), 1200);
            }}
            aria-label="إضافة إلى السلة"
            className={cn(
              'absolute bottom-2.5 right-2.5 z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0',
              justAdded
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 backdrop-blur-sm text-[#1D1D1F] hover:bg-white',
            )}
          >
            {justAdded ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </motion.button>
        )}
      </div>

      {/* Info */}
      <div className="pt-2.5 px-0.5">
        {product.category && (
          <span className="text-[10px] font-medium text-[#b0a898] mb-0.5 block truncate">
            {product.category.name}
          </span>
        )}
        <h3 className="text-[13px] font-medium text-[#1D1D1F] line-clamp-1 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 mt-1">
          {hasSale ? (
            <>
              <span className="text-[14px] font-bold text-[#1D1D1F]">
                {formatCurrency(Number(product.salePrice), product.currency)}
              </span>
              <span className="text-[11px] line-through text-[#b0a898]">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-[14px] font-bold text-[#1D1D1F]">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Link Icon Helper ────────────────────────────────────────────────────────

function LinkIcon({
  platformKey,
  brand,
  localIconPath,
  domain,
  thumbnail,
  size = 36,
}: {
  platformKey: string;
  brand: any;
  localIconPath: string | null;
  domain: string | null;
  thumbnail?: string | null;
  size?: number;
}) {
  const iconSize = size;
  if (thumbnail) {
    return (
      <div className="rounded-xl shrink-0 overflow-hidden bg-[#f6f3ee]" style={{ width: iconSize, height: iconSize }}>
        <img src={thumbnail} alt={platformKey} className="w-full h-full object-cover" />
      </div>
    );
  }
  if (localIconPath) {
    return (
      <div className="rounded-xl flex items-center justify-center bg-white border border-[#e6e0d6] shrink-0" style={{ width: iconSize, height: iconSize }}>
        <img src={localIconPath} alt={platformKey} className="w-6 h-6" />
      </div>
    );
  }
  if (brand) {
    return (
      <div className="rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}`, width: iconSize, height: iconSize }}>
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-6 h-6 text-white"><path d={brand.path} /></svg>
      </div>
    );
  }
  if (domain) {
    return (
      <div className="rounded-xl flex items-center justify-center bg-white border border-[#e6e0d6] shrink-0 overflow-hidden" style={{ width: iconSize, height: iconSize }}>
        <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
      </div>
    );
  }
  return (
    <div className="rounded-xl flex items-center justify-center bg-[#1c1a14]/5 shrink-0" style={{ width: iconSize, height: iconSize }}>
      <Link2 className="w-6 h-6 text-[#6e6658]" />
    </div>
  );
}


// ─── Product Image Slider for Modal ─────────────────────────────────────────

function ProductImageSlider({ images, name, desktop }: { images: string[]; name: string; desktop?: boolean }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className="relative w-full aspect-square flex items-center justify-center">
        <ShoppingBag className="w-16 h-16 text-[#c9b18a]/30" />
      </div>
    );
  }

  const scrollToIndex = (idx: number) => {
    setCurrent(idx);
    const container = scrollRef.current;
    if (container) {
      const child = container.children[idx] as HTMLElement;
      if (child) {
        container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
      }
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const children = Array.from(container.children) as HTMLElement[];
    let closestIdx = 0;
    let closestDist = Infinity;
    children.forEach((child, idx) => {
      const dist = Math.abs(child.offsetLeft - scrollLeft);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    if (closestIdx !== current) setCurrent(closestIdx);
  };

  const hasThumbnails = images.length > 1;

  return (
    <div className="flex-1 h-full bg-white sticky top-0">
      {/* Horizontal scrollable images */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'flex overflow-x-auto bg-white scrollbar-hide snap-x snap-mandatory',
          hasThumbnails ? 'flex-1 min-h-0' : 'h-full'
        )}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-full h-1/1 rounded-[14px] snap-start flex items-center justify-center p-2"
            style={{ width: images.length === 1 ? '100%' : '80%', marginRight: idx < images.length - 1 ? 10 : 0 }}
          >
            <img
              src={img}
              alt={`${name} ${idx + 1}`}
              className="max-w-full max-h-full object-contain rounded-[20px]"
              draggable={false}
            />
          </div>
        ))}
      </div>
      {/* Thumbnails */}
      {hasThumbnails && (
        <div className="shrink-0 h-[72px] bg-white flex items-center px-2">
          <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide w-full">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={cn(
                  'relative flex-shrink-0 w-[56px] h-[56px] rounded-[10px] overflow-hidden transition-all duration-200',
                  idx === current ? 'ring-2 ring-black ring-offset-1' : 'opacity-60 hover:opacity-90'
                )}
                aria-label={`عرض صورة رقم ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover rounded-[10px]"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}