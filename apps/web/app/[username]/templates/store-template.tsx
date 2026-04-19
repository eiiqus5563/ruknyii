import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo, useDragControls } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  X,
  Twitter,
  Linkedin,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
  SlidersHorizontal,
  ArrowUpDown,
  Flame,
  Sparkles,
  MapPin,
  Search,
  Settings2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  addToCart,
  getCart,
  getCartCount,
  getCartTotal,
  getCartCurrency,
  type CartItem,
} from '@/lib/cart-store';
import { CartDialog } from '@/components/cart-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  createdAt?: string;
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
  heroSettings?: any;
  createdAt: string;
  user: { id: string; email?: string; name?: string };
  socialLinks: any[];
  _count?: { followers: number; following: number };
}

export interface StoreTemplateProps {
  profile: PublicProfile;
  products: PublicProduct[];
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

// ─── Sort Options ────────────────────────────────────────────────────────────

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'newest';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'الافتراضي' },
  { key: 'newest', label: 'الأحدث' },
  { key: 'price-asc', label: 'السعر: الأقل' },
  { key: 'price-desc', label: 'السعر: الأعلى' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function StoreTemplate({
  profile,
  products,
  storeId,
  isOwnProfile,
  onShowShare,
  onShowQR,
  showQRModal,
  showShareModal,
  onCloseQR,
  onCloseShare,
  copied,
  onCopyLink,
  profileUrl,
}: StoreTemplateProps) {
  const displayName = profile.name || profile.user?.name || profile.username;

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const [cartCount, setCartCount] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const cart = getCart();
      setCartCount(cart && cart.storeUsername === profile.username ? getCartCount() : 0);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [profile.username]);

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
      ...(variant ? { variantId: variant.id, variantName, variantAttributes: variant.attributes } : {}),
      ...(product.isDigital ? { isDigital: true } : {}),
    });
    setCartCount(getCartCount());
    window.dispatchEvent(new Event('storage'));
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1800);
  }, [storeId, profile.username]);

  // ─── Filters & Sorting ────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    let result = [...products];

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category?.id === selectedCategory);
    }

    // In-stock filter
    if (inStockOnly) {
      result = result.filter((p) => typeof p.stock !== 'number' || p.stock > 0);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case 'newest':
        result.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
        break;
    }

    return result;
  }, [products, selectedCategory, sortBy, inStockOnly, searchQuery]);

  // ─── Product Detail ───────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [showQtySelector, setShowQtySelector] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const productSheetDragControls = useDragControls();

  useEffect(() => {
    if (selectedProduct) {
      setModalQty(1);
      setShowQtySelector(false);
      setSelectedVariant(null);
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (selectedProduct) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = orig; };
    }
  }, [selectedProduct]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showSortMenu]);

  // ─── Banner Slider ────────────────────────────────────────────────────────
  const [currentBanner, setCurrentBanner] = useState(0);
  const hasBanners = !!profile.banners && profile.banners.length > 0;

  useEffect(() => {
    if (!profile?.banners || profile.banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [profile?.banners]);

  // ─── Scrolled Header ─────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ─── Shared Modals ────────────────────────────────────────────────────────
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
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#1D1D1F]">مشاركة المتجر</h3>
                <button onClick={onCloseQR} className="p-2 hover:bg-[#f5f3f0] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#999]" />
                </button>
              </div>
              <div className="flex justify-center p-6 bg-[#fafaf8] rounded-2xl">
                <QRCodeSVG value={profileUrl} size={200} level="H" includeMargin fgColor="#1D1D1F" />
              </div>
              <p className="text-center text-sm text-[#999] mt-4">امسح الكود للوصول للمتجر</p>
              <button onClick={onCopyLink} className="w-full mt-4 py-3 px-4 bg-[#f5f3f0] hover:bg-[#ebe8e4] rounded-xl font-medium text-[#1D1D1F] flex items-center justify-center gap-2 transition-colors">
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
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl"
            >
              <div className="w-12 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-[#1D1D1F] mb-5">مشاركة</h3>
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
                    <span className="text-xs text-[#999]">{item.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={onCloseShare} className="w-full mt-6 py-3 text-[#999] font-medium hover:text-[#1D1D1F] transition-colors">إلغاء</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* ═══ Premium Sticky Header ═══ */}
      <header className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-white/85 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-b border-[#f0ede8]/80'
          : 'bg-white/60 backdrop-blur-xl',
      )}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex items-center justify-between h-[56px] sm:h-[60px]">
            {/* Store Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                animate={{ scale: scrolled ? 0.92 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative shrink-0"
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={displayName}
                    className={cn(
                      'rounded-[14px] object-cover transition-all duration-300 ring-2 ring-white shadow-sm',
                      scrolled ? 'w-8 h-8' : 'w-10 h-10 sm:w-11 sm:h-11',
                    )}
                  />
                ) : (
                  <div className={cn(
                    'rounded-[14px] bg-gradient-to-br from-[#1D1D1F] to-[#3a3a3c] flex items-center justify-center transition-all duration-300 ring-2 ring-white shadow-sm',
                    scrolled ? 'w-8 h-8' : 'w-10 h-10 sm:w-11 sm:h-11',
                  )}>
                    <span className={cn('text-white font-bold', scrolled ? 'text-xs' : 'text-sm')}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <span className={cn(
                  'absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-400 ring-2 ring-white transition-all',
                  scrolled ? 'w-2.5 h-2.5' : 'w-3 h-3',
                )} />
              </motion.div>
              <div className="min-w-0">
                <motion.h1
                  animate={{ fontSize: scrolled ? '14px' : '16px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="font-bold text-[#1D1D1F] truncate leading-tight"
                >
                  {displayName}
                </motion.h1>
                <AnimatePresence>
                  {!scrolled && profile.bio && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[11px] text-[#999] line-clamp-1 leading-tight mt-0.5"
                    >
                      {profile.bio}
                    </motion.p>
                  )}
                </AnimatePresence>
                {scrolled && profile.location && (
                  <p className="text-[10px] text-[#b0a898] flex items-center gap-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Customize button - owner only */}
              {isOwnProfile && (
                <a
                  href="/app/links/customize"
                  className="h-8 sm:h-9 px-3 rounded-xl bg-[#f5f3f0] flex items-center gap-1.5 text-[#666] hover:bg-[#ebe8e4] transition-all text-[12px] font-medium"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تخصيص</span>
                </a>
              )}

              <button
                onClick={onShowShare}
                className="h-8 sm:h-9 w-8 sm:w-9 rounded-xl bg-[#f5f3f0] flex items-center justify-center text-[#666] hover:bg-[#ebe8e4] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Cart button */}
              <motion.button
                onClick={() => setCartDialogOpen(true)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'relative h-8 sm:h-9 rounded-xl flex items-center gap-1.5 transition-all',
                  cartCount > 0
                    ? 'bg-[#1D1D1F] text-white px-3 sm:px-3.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]'
                    : 'bg-[#1D1D1F] text-white w-8 sm:w-9 justify-center',
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {cartCount > 0 && (
                  <motion.div
                    key={cartCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-[12px] font-bold tabular-nums">{cartCount}</span>
                    <span className="text-[10px] text-white/50 font-medium tabular-nums hidden sm:inline">
                      {formatCurrency(getCartTotal(), getCartCurrency())}
                    </span>
                  </motion.div>
                )}
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white"
                  />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Banner Slider ═══ */}
      {hasBanners && (
        <div className="w-full px-4 sm:px-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-[1200px]"
          >
            <div className="rounded-[20px] sm:rounded-[24px] overflow-hidden relative group bg-[#f3f1ee]">
              <div
                className="relative h-40 sm:h-56 md:h-72 cursor-grab active:cursor-grabbing touch-pan-y"
                onTouchStart={(e) => {
                  (e.currentTarget as any)._touchX = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  const startX = (e.currentTarget as any)._touchX;
                  if (startX == null) return;
                  const endX = e.changedTouches[0].clientX;
                  const diff = startX - endX;
                  if (Math.abs(diff) > 40 && profile.banners && profile.banners.length > 1) {
                    if (diff > 0) setCurrentBanner((p) => (p === profile.banners!.length - 1 ? 0 : p + 1));
                    else setCurrentBanner((p) => (p === 0 ? profile.banners!.length - 1 : p - 1));
                  }
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentBanner}
                    src={profile.banners![currentBanner]}
                    alt={`Banner ${currentBanner + 1}`}
                    className="w-full h-full object-cover absolute inset-0 select-none pointer-events-none"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    draggable={false}
                  />
                </AnimatePresence>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                {/* Navigation Arrows */}
                {profile.banners!.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentBanner((p) => (p === profile.banners!.length - 1 ? 0 : p + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/30 shadow-lg"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentBanner((p) => (p === 0 ? profile.banners!.length - 1 : p - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/30 shadow-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {profile.banners!.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/15 backdrop-blur-md">
                    {profile.banners!.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBanner(idx)}
                        className={cn(
                          'rounded-full transition-all duration-300',
                          idx === currentBanner
                            ? 'bg-white w-5 h-1.5 shadow-sm'
                            : 'bg-white/50 hover:bg-white/70 w-1.5 h-1.5',
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

      {/* ═══ Cover Background (fallback when no banners) ═══ */}
      {!hasBanners && profile.coverImage && (
        <div className="w-full px-4 sm:px-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-[1200px]"
          >
            <div className="rounded-[20px] sm:rounded-[24px] overflow-hidden relative h-36 sm:h-48 md:h-60 bg-[#f3f1ee]">
              <img
                src={profile.coverImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Filters Bar ═══ */}
      <div className="sticky top-[56px] sm:top-[60px] z-30 bg-white/80 backdrop-blur-xl border-b border-[#f0ede8]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex items-center gap-2.5 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0a898]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="h-9 w-32 sm:w-44 pr-9 pl-3 rounded-xl bg-[#f5f3f0] border-0 text-[13px] text-[#1D1D1F] placeholder:text-[#c4beb4] focus:outline-none focus:ring-1 focus:ring-[#1D1D1F]/20 transition-all"
              />
            </div>

            {/* Sort */}
            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); }}
                className={cn(
                  'h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-[13px] font-medium transition-all',
                  sortBy !== 'default'
                    ? 'bg-[#1D1D1F] text-white'
                    : 'bg-[#f5f3f0] text-[#666] hover:bg-[#ebe8e4]',
                )}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ترتيب</span>
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 right-0 bg-white rounded-xl shadow-xl border border-[#f0ede8] p-1.5 min-w-[160px] z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                        className={cn(
                          'w-full text-right px-3 py-2 rounded-lg text-[13px] transition-colors',
                          sortBy === opt.key
                            ? 'bg-[#1D1D1F] text-white font-medium'
                            : 'text-[#666] hover:bg-[#f5f3f0]',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In Stock */}
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={cn(
                'h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-[13px] font-medium transition-all shrink-0',
                inStockOnly
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#f5f3f0] text-[#666] hover:bg-[#ebe8e4]',
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>متوفر</span>
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-[#e0ddd8] shrink-0" />

            {/* Hot Sale badge */}
            {products.some((p) => p.salePrice != null && p.salePrice < p.price) && (
              <button
                onClick={() => {
                  setSortBy('default');
                  setSelectedCategory(null);
                  setInStockOnly(false);
                  // Will filter via a separate approach
                }}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-l from-rose-500 to-orange-500 text-white flex items-center gap-1.5 text-[13px] font-bold shrink-0 shadow-sm"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>تخفيضات</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Categories ═══ */}
      {productCategories.length > 0 && (
        <div className="bg-white border-b border-[#f0ede8]">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex items-center gap-2 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all border',
                  !selectedCategory
                    ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                    : 'bg-white text-[#666] border-[#e0ddd8] hover:border-[#1D1D1F] hover:text-[#1D1D1F]',
                )}
              >
                الكل
              </button>
              {productCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={cn(
                    'shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all border',
                    selectedCategory === cat.id
                      ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                      : 'bg-white text-[#666] border-[#e0ddd8] hover:border-[#1D1D1F] hover:text-[#1D1D1F]',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Products Grid ═══ */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] text-[#b0a898]">
            {filteredProducts.length === products.length
              ? `${products.length} منتج`
              : `${filteredProducts.length} من ${products.length} منتج`}
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6 items-start">
            {filteredProducts.map((product, index) => (
              <StoreProductCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => setSelectedProduct(product)}
                onAddToCart={product.hasVariants ? () => setSelectedProduct(product) : () => handleAddToCart(product)}
                isAdded={addedProductId === product.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-[#e0ddd8] mx-auto mb-4" />
            <p className="font-semibold text-[15px] text-[#666] mb-1">لا توجد منتجات</p>
            <p className="text-[13px] text-[#b0a898]">
              {searchQuery ? 'جرب كلمات بحث مختلفة' : 'لا توجد منتجات في هذا التصنيف'}
            </p>
            {(selectedCategory || searchQuery || inStockOnly || sortBy !== 'default') && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(''); setInStockOnly(false); setSortBy('default'); }}
                className="mt-3 text-[13px] text-[#1D1D1F] font-medium hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}
      </main>

      {/* ═══ Product Detail Modal ═══ */}
      <AnimatePresence mode="wait">
        {selectedProduct && (
          <motion.div
            key="product-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[140] flex items-end md:items-center justify-center p-0 md:p-6"
          >
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
              onClick={() => setSelectedProduct(null)}
            />

            {/* ─── Mobile Bottom Sheet ─── */}
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
                if (info.offset.y > 80 || info.velocity.y > 300) setSelectedProduct(null);
              }}
              className="relative bg-white z-[141] rounded-t-[24px] w-full max-h-[92vh] flex flex-col md:hidden"
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
                <div className="px-4 pb-3">
                  <div className="relative w-full rounded-2xl overflow-hidden bg-[#f5f3f0]" style={{ height: selectedProduct.images.length > 1 ? 'calc(100vw + 60px)' : '100vw', maxHeight: '480px' }}>
                    <ProductImageSlider images={selectedProduct.images} name={selectedProduct.name} />
                  </div>
                </div>

                <div className="px-5 pt-2">
                  <p className="text-[12px] font-medium text-[#b0a898] uppercase tracking-wide">{displayName}</p>
                  <h2 className="mt-1.5 text-[20px] font-bold text-[#1D1D1F] leading-snug">{selectedProduct.name}</h2>

                  {selectedProduct.category && (
                    <span className="inline-block mt-2 text-[11px] font-medium text-[#8c8478] bg-[#f5f3f0] px-2.5 py-1 rounded-lg">
                      {selectedProduct.category.name}
                    </span>
                  )}

                  <ProductPriceDisplay product={selectedProduct} variant={selectedVariant} />
                  <ProductStockInfo product={selectedProduct} variant={selectedVariant} />
                  <VariantSelector
                    product={selectedProduct}
                    selectedVariant={selectedVariant}
                    onSelectVariant={(v) => { setSelectedVariant(v); setModalQty(1); setShowQtySelector(false); }}
                  />

                  {selectedProduct.description && (
                    <div className="mt-4 pt-4 border-t border-[#f0ede8]">
                      <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-2">وصف المنتج</h3>
                      <p dir="rtl" className="text-[14px] text-[#666] leading-[1.8] text-right whitespace-pre-line">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Bottom Bar */}
              <ProductModalBottomBar
                product={selectedProduct}
                variant={selectedVariant}
                qty={modalQty}
                setQty={setModalQty}
                showQtySelector={showQtySelector}
                setShowQtySelector={setShowQtySelector}
                addedProductId={addedProductId}
                cartCount={cartCount}
                onAddToCart={handleAddToCart}
                onViewCart={() => { setSelectedProduct(null); setCartDialogOpen(true); }}
                displayName={displayName}
                currency={selectedProduct.currency}
              />
            </motion.div>

            {/* ─── Desktop Modal ─── */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-h-[85vh] bg-white z-[141] rounded-3xl w-full max-w-[780px] hidden md:flex flex-col overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-5 right-5 z-30 h-9 w-9 rounded-full bg-black/5 flex items-center justify-center transition-all hover:bg-black/10 hover:rotate-90 duration-200"
              >
                <X className="w-4 h-4 text-[#555]" />
              </button>

              <div className="flex flex-row flex-1 min-h-0">
                <div className="w-[360px] shrink-0 bg-[#f5f3f0]">
                  <div className="w-full h-full" style={{ minHeight: selectedProduct.images.length > 1 ? '440px' : '360px' }}>
                    <ProductImageSlider images={selectedProduct.images} name={selectedProduct.name} desktop />
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto px-7 pt-7 pb-4 scrollbar-hide">
                    <p className="text-[12px] font-medium text-[#b0a898] uppercase tracking-wide">{displayName}</p>
                    <h2 className="mt-2 text-[22px] font-bold text-[#1D1D1F] leading-snug">{selectedProduct.name}</h2>

                    {selectedProduct.category && (
                      <span className="inline-block mt-2.5 text-[11px] font-medium text-[#8c8478] bg-[#f5f3f0] px-2.5 py-1 rounded-lg">
                        {selectedProduct.category.name}
                      </span>
                    )}

                    <ProductPriceDisplay product={selectedProduct} variant={selectedVariant} desktop />
                    <ProductStockInfo product={selectedProduct} variant={selectedVariant} />
                    <VariantSelector
                      product={selectedProduct}
                      selectedVariant={selectedVariant}
                      onSelectVariant={(v) => { setSelectedVariant(v); setModalQty(1); setShowQtySelector(false); }}
                    />

                    {selectedProduct.description && (
                      <div className="mt-5 pt-5 border-t border-[#f0ede8]">
                        <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-2">وصف المنتج</h3>
                        <p dir="rtl" className="text-[14px] leading-[1.8] text-[#777] text-right whitespace-pre-line">{selectedProduct.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Desktop bottom bar */}
                  <div className="shrink-0 border-t border-[#f0ede8]">
                    <DesktopAddToCart
                      product={selectedProduct}
                      variant={selectedVariant}
                      qty={modalQty}
                      setQty={setModalQty}
                      showQtySelector={showQtySelector}
                      setShowQtySelector={setShowQtySelector}
                      addedProductId={addedProductId}
                      cartCount={cartCount}
                      onAddToCart={handleAddToCart}
                      onViewCart={() => { setSelectedProduct(null); setCartDialogOpen(true); }}
                      currency={selectedProduct.currency}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {sharedModals}

      <CartDialog open={cartDialogOpen} onClose={() => setCartDialogOpen(false)} />

      {/* Floating Cart Badge */}
      <AnimatePresence>
        {cartCount > 0 && (
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

      {/* Footer */}
      <footer className="w-full mt-12 pb-10">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="border-t border-[#f0ede8] pt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              {profile.avatar && (
                <img src={profile.avatar} alt={displayName} className="w-9 h-9 rounded-full object-cover border border-[#e0ddd8]" />
              )}
              <div>
                <p className="text-[13px] font-semibold text-[#1D1D1F]">{displayName}</p>
                {profile.location && (
                  <p className="text-[11px] text-[#b0a898] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{profile.location}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[12px] text-[#b0a898] font-medium">Made by</span>
              <a href="https://rukny.io" target="_blank" rel="noopener noreferrer">
                <img src="/ruknylogo.svg" alt="Rukny" className="h-5 opacity-60 hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ProductPriceDisplay({ product, variant, desktop }: { product: PublicProduct; variant: ProductVariant | null; desktop?: boolean }) {
  const displayPrice = variant ? variant.price : (product.salePrice != null && product.salePrice < product.price ? Number(product.salePrice) : product.price);
  const displayOriginal = variant ? (variant.compareAtPrice ?? null) : (product.salePrice != null && product.salePrice < product.price ? product.price : null);
  const hasDiscount = displayOriginal != null && displayOriginal > displayPrice;
  const size = desktop ? 'text-[26px]' : 'text-[22px]';

  return (
    <div className="mt-3 flex items-baseline gap-2">
      {hasDiscount ? (
        <>
          <span className={cn(size, 'font-bold text-[#1D1D1F]')}>{formatCurrency(displayPrice, product.currency)}</span>
          <span className="line-through text-[14px] text-[#b0a898]">{formatCurrency(displayOriginal, product.currency)}</span>
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[11px] font-bold">
            {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%-
          </span>
        </>
      ) : (
        <span className={cn(size, 'font-bold text-[#1D1D1F]')}>{formatCurrency(displayPrice, product.currency)}</span>
      )}
    </div>
  );
}

function ProductStockInfo({ product, variant }: { product: PublicProduct; variant: ProductVariant | null }) {
  const displayStock = variant ? variant.stock : product.stock;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
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
      <span className="flex items-center gap-1.5 text-[12px] text-[#8c8478]">
        <Truck className="w-3.5 h-3.5" />
        <span>يتم حساب الشحن عند الدفع</span>
      </span>
    </div>
  );
}

function VariantSelector({ product, selectedVariant, onSelectVariant }: {
  product: PublicProduct;
  selectedVariant: ProductVariant | null;
  onSelectVariant: (v: ProductVariant) => void;
}) {
  if (!product.hasVariants || !product.variants || product.variants.length === 0) return null;

  const attrKeys = [...new Set(product.variants.flatMap(v => Object.keys(v.attributes as Record<string, string>)))];

  return (
    <div className="mt-4 pt-4 border-t border-[#f0ede8] space-y-3">
      {attrKeys.map(key => {
        const values = [...new Set(product.variants!.map(v => (v.attributes as Record<string, string>)[key]).filter(Boolean))];
        return (
          <div key={key}>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mb-2">{key}</p>
            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = selectedVariant?.attributes && (selectedVariant.attributes as Record<string, string>)[key] === val;
                const hasStock = product.variants!.some(v => (v.attributes as Record<string, string>)[key] === val && v.stock > 0);
                return (
                  <button
                    key={val}
                    onClick={() => {
                      const match = product.variants!.find(v => {
                        const attrs = v.attributes as Record<string, string>;
                        if (selectedVariant) {
                          const cur = selectedVariant.attributes as Record<string, string>;
                          return Object.keys(attrs).every(k => k === key ? attrs[k] === val : attrs[k] === cur[k]);
                        }
                        return attrs[key] === val;
                      });
                      if (match) onSelectVariant(match);
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
}

// ─── Add-to-cart Bottom Bars ─────────────────────────────────────────────────

interface CartBarProps {
  product: PublicProduct;
  variant: ProductVariant | null;
  qty: number;
  setQty: (fn: (q: number) => number) => void;
  showQtySelector: boolean;
  setShowQtySelector: (v: boolean) => void;
  addedProductId: string | null;
  cartCount: number;
  onAddToCart: (p: PublicProduct, qty: number, v?: ProductVariant | null) => void;
  onViewCart: () => void;
  currency?: string;
  displayName?: string;
}

function ProductModalBottomBar(props: CartBarProps) {
  const { product, variant, qty, setQty, showQtySelector, setShowQtySelector, addedProductId, cartCount, onAddToCart, onViewCart } = props;
  const effectiveStock = variant ? variant.stock : (product.stock ?? 999);
  const isOutOfStock = effectiveStock === 0;

  return (
    <div className="absolute bottom-0 inset-x-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white to-white/0 px-4 pt-3">
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
              onClick={(e) => { e.stopPropagation(); onViewCart(); }}
              className="w-full h-[50px] bg-[#1D1D1F] rounded-2xl flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <motion.span key={cartCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">{cartCount}</motion.span>
                </div>
                <span className="text-[13px] text-white/70">الإجمالي</span>
                <motion.span key={getCartTotal()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[14px] font-bold text-white tabular-nums">{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-white/80 font-medium">عرض السلة</span>
                <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2.5">
        <AnimatePresence mode="wait">
          {addedProductId === product.id ? (
            <motion.div key="added" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <div className="h-[48px] rounded-2xl bg-emerald-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-[17px] h-[17px]" />تمت الإضافة
              </div>
            </motion.div>
          ) : product.hasVariants && !variant ? (
            <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <div className="h-[48px] rounded-2xl bg-[#e0ddd8] text-[#8c8478] text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                اختر الخيارات أولاً
              </div>
            </motion.div>
          ) : showQtySelector ? (
            <motion.div key="qty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2.5 flex-1">
              <div className="flex items-center h-[48px] bg-[#f5f3f0] rounded-2xl shrink-0 overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }} disabled={qty <= 1} className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] transition-all disabled:opacity-30">
                  <Minus className="w-4 h-4 text-[#555]" />
                </button>
                <motion.span key={qty} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="text-[16px] font-bold min-w-[32px] text-center tabular-nums text-[#1D1D1F]">{qty}</motion.span>
                <button onClick={(e) => { e.stopPropagation(); setQty(q => Math.min(q + 1, effectiveStock)); }} disabled={qty >= effectiveStock} className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] transition-all disabled:opacity-30">
                  <Plus className="w-4 h-4 text-[#555]" />
                </button>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onAddToCart(product, qty, variant); setShowQtySelector(false); }} className="flex-1 h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex flex-col items-center justify-center transition-colors">
                <span className="text-[10px] font-medium text-emerald-100/80 leading-none">حدد الكمية ثم أكد</span>
                <span className="text-[15px] flex items-center gap-1.5 leading-snug"><CheckCircle2 className="w-[15px] h-[15px]" />تأكيد ({qty})</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="add" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) { setQty(() => 1); setShowQtySelector(true); } }}
                disabled={isOutOfStock}
                className="w-full h-[48px] rounded-2xl bg-[#1D1D1F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isOutOfStock ? 'نفذ المخزون' : <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DesktopAddToCart(props: Omit<CartBarProps, 'displayName'>) {
  const { product, variant, qty, setQty, showQtySelector, setShowQtySelector, addedProductId, cartCount, onAddToCart, onViewCart } = props;
  const effectiveStock = variant ? variant.stock : (product.stock ?? 999);
  const isOutOfStock = effectiveStock === 0;

  return (
    <>
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
              onClick={(e) => { e.stopPropagation(); onViewCart(); }}
              className="w-full h-[48px] bg-[#1D1D1F] rounded-2xl flex items-center justify-between px-7 hover:bg-[#2a2a2a] transition-colors"
              style={{ width: 'calc(100% - 40px)', margin: '12px 20px 0' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <motion.span key={cartCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">{cartCount}</motion.span>
                </div>
                <span className="text-[13px] text-white/70">الإجمالي</span>
                <motion.span key={getCartTotal()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[14px] font-bold text-white tabular-nums">{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
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
          {addedProductId === product.id ? (
            <motion.div key="added" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <div className="h-[46px] rounded-2xl bg-emerald-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-[17px] h-[17px]" />تمت الإضافة
              </div>
            </motion.div>
          ) : product.hasVariants && !variant ? (
            <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <div className="h-[46px] rounded-2xl bg-[#e0ddd8] text-[#8c8478] text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                اختر الخيارات أولاً
              </div>
            </motion.div>
          ) : showQtySelector ? (
            <motion.div key="qty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3 flex-1">
              <div className="flex items-center h-[46px] bg-[#f5f3f0] rounded-2xl shrink-0 overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }} disabled={qty <= 1} className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] transition-all disabled:opacity-30">
                  <Minus className="w-4 h-4 text-[#555]" />
                </button>
                <motion.span key={qty} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[16px] font-bold min-w-[32px] text-center tabular-nums text-[#1D1D1F]">{qty}</motion.span>
                <button onClick={(e) => { e.stopPropagation(); setQty(q => Math.min(q + 1, effectiveStock)); }} disabled={qty >= effectiveStock} className="w-11 h-full flex items-center justify-center hover:bg-[#ebe8e4] transition-all disabled:opacity-30">
                  <Plus className="w-4 h-4 text-[#555]" />
                </button>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onAddToCart(product, qty, variant); setShowQtySelector(false); }} className="flex-1 h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex flex-col items-center justify-center transition-colors">
                <span className="text-[10px] font-medium text-emerald-100/80 leading-none">حدد الكمية ثم أكد</span>
                <span className="text-[15px] flex items-center gap-1.5 leading-snug"><CheckCircle2 className="w-[15px] h-[15px]" />تأكيد ({qty})</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="add" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ backgroundColor: '#333' }}
                onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) { setQty(() => 1); setShowQtySelector(true); } }}
                disabled={isOutOfStock}
                className="w-full h-[46px] rounded-2xl bg-[#1D1D1F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isOutOfStock ? 'نفذ المخزون' : <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Store Product Card ──────────────────────────────────────────────────────

function StoreProductCard({ product, index, onClick, onAddToCart, isAdded }: {
  product: PublicProduct;
  index: number;
  onClick: () => void;
  onAddToCart?: (e: React.MouseEvent) => void;
  isAdded?: boolean;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const images = product.images ?? [];
  const hasSale = product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price;
  const isOutOfStock = typeof product.stock === 'number' && product.stock === 0;
  const discountPercent = hasSale ? Math.round(((product.price - Number(product.salePrice)) / product.price) * 100) : 0;

  const stopRotation = () => { if (rotationRef.current) { clearInterval(rotationRef.current); rotationRef.current = null; } };

  useEffect(() => { setCurrentImageIndex(0); }, [product.id]);
  useEffect(() => () => stopRotation(), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('group cursor-pointer', isOutOfStock && 'opacity-60')}
      onMouseEnter={() => {
        if (images.length <= 1) return;
        stopRotation();
        rotationRef.current = setInterval(() => setCurrentImageIndex(p => (p + 1) % images.length), 1800);
      }}
      onMouseLeave={() => { stopRotation(); setCurrentImageIndex(0); }}
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

            {images.length > 1 && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {images.map((_, i) => (
                  <span key={i} className={cn('block rounded-full transition-all duration-300', i === currentImageIndex ? 'h-1.5 w-1.5 bg-white shadow-sm' : 'h-1 w-1 bg-white/50')} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-[#d4cdc2]/40" />
          </div>
        )}

        {/* Badges */}
        {hasSale && discountPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-bold">
              %{discountPercent}-
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="px-3 py-1.5 rounded-xl bg-black/60 text-white text-[11px] font-semibold">نفذت الكمية</span>
          </div>
        )}

        {/* Quick add */}
        {!isOutOfStock && onAddToCart && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (justAdded || isAdded) return;
              setJustAdded(true);
              onAddToCart(e);
              setTimeout(() => setJustAdded(false), 1200);
            }}
            aria-label="إضافة إلى السلة"
            className={cn(
              'absolute bottom-2.5 right-2.5 z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0',
              justAdded || isAdded
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 backdrop-blur-sm text-[#1D1D1F] hover:bg-white',
            )}
          >
            {justAdded || isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Info */}
      <div className="pt-2.5 px-0.5">
        {product.category && (
          <span className="text-[10px] font-medium text-[#b0a898] mb-0.5 block truncate">{product.category.name}</span>
        )}
        <h3 className="text-[13px] font-medium text-[#1D1D1F] line-clamp-1 leading-snug">{product.name}</h3>
        <div className="flex items-baseline gap-1.5 mt-1">
          {hasSale ? (
            <>
              <span className="text-[14px] font-bold text-[#1D1D1F]">{formatCurrency(Number(product.salePrice), product.currency)}</span>
              <span className="text-[11px] line-through text-[#b0a898]">{formatCurrency(product.price, product.currency)}</span>
            </>
          ) : (
            <span className="text-[14px] font-bold text-[#1D1D1F]">{formatCurrency(product.price, product.currency)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Product Image Slider ────────────────────────────────────────────────────

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
      if (child) container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
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
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });
    if (closestIdx !== current) setCurrent(closestIdx);
  };

  const hasThumbnails = images.length > 1;

  return (
    <div className="flex-1 h-full bg-white sticky top-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn('flex overflow-x-auto bg-white scrollbar-hide snap-x snap-mandatory', hasThumbnails ? 'flex-1 min-h-0' : 'h-full')}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-full h-1/1 rounded-[14px] snap-start flex items-center justify-center p-2"
            style={{ width: images.length === 1 ? '100%' : '80%', marginRight: idx < images.length - 1 ? 10 : 0 }}
          >
            <img src={img} alt={`${name} ${idx + 1}`} className="max-w-full max-h-full object-contain rounded-[20px]" draggable={false} />
          </div>
        ))}
      </div>
      {hasThumbnails && (
        <div className="shrink-0 h-[72px] bg-white flex items-center px-2">
          <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide w-full">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={cn(
                  'relative flex-shrink-0 w-[56px] h-[56px] rounded-[10px] overflow-hidden transition-all duration-200',
                  idx === current ? 'ring-2 ring-black ring-offset-1' : 'opacity-60 hover:opacity-90',
                )}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-[10px]" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
