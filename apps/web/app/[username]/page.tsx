'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, type PanInfo, useDragControls } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Link2,
  Share2,
  QrCode,
  CalendarDays,
  Users,
  CheckCircle2,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Globe,
  Mail,
  Phone,
  MessageCircle,
  ClipboardList,
  Clock,
  ArrowLeft,
  ExternalLink,
  Heart,
  UserPlus,
  UserCheck,
  Star,
  ShoppingBag,
  ShoppingCart,
  HelpCircle,
  FormInput,
  Eye,
  MessageSquare,
  Plus,
  Minus,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { AuthClient } from '@/lib/auth/auth-client';
import { getCsrfToken } from '@/lib/api/client';
import { toast } from '@/components/toast-provider';
import { API_URL } from '@/lib/config';
import { getBrandByKey, getLocalIconPathByKey, extractDomain, getFaviconUrl } from '@/lib/brand-icons';
import { getPublicInstagramData, type InstagramBlock, type InstagramMedia } from '@/lib/api/instagram';
import { getPublicLinkedInData, type LinkedInBlock, type LinkedInConnection } from '@/lib/api/linkedin';
import { trackLinkClick } from '@/lib/api/social-links';
import { formatCurrency } from '@/lib/currency';
import { getTemplate } from '@/lib/profile-templates';
import { PortfolioTemplate } from './templates/portfolio-template';
import { StoreTemplate } from './templates/store-template';
import { addToCart as addToCartStore, getCart, getCartCount, getCartTotal, getCartCurrency, syncCartStock } from '@/lib/cart-store';
import { CartDialog } from '@/components/cart-dialog';

// Helper to check if user has valid token
const hasValidToken = (): boolean => {
  if (typeof window === 'undefined') return false;
  const csrfToken = getCsrfToken();
  return !!csrfToken;
};

// Types
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
  category?: {
    id: string;
    name: string;
  } | null;
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
  heroSettings?: {
    headline?: string;
    description?: string;
    buttons?: Array<{ label: string; url: string; variant: 'dark' | 'outline' }>;
    logoCloud?: {
      enabled: boolean;
      logos: Array<{ id: string; src: string; key?: string; alt: string; displayOrder: number }>;
    };
  };
  createdAt: string;
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  socialLinks: SocialLink[];
  _count?: {
    followers: number;
    following: number;
  };
}

// Social Icons Map
const socialIcons: Record<string, any> = {
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  website: Globe,
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  tiktok: Link2,
  form: ClipboardList,
  custom: Link2,
};

const socialColors: Record<string, string> = {
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  x: '#000000',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  github: '#181717',
  whatsapp: '#25D366',
  tiktok: '#000000',
  website: '#6366F1',
  email: '#0EA5E9',
  phone: '#10B981',
  form: '#6366F1',
  custom: '#8B5CF6',
};

// Form type styles matching FormCard
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

const socialGradients: Record<string, string> = {
  instagram: 'from-[#E4405F] to-[#C13584]',
  twitter: 'from-[#1DA1F2] to-[#0C85D0]',
  x: 'from-gray-800 to-black',
  linkedin: 'from-[#0A66C2] to-[#004182]',
  youtube: 'from-[#FF0000] to-[#CC0000]',
  github: 'from-[#181717] to-black',
  whatsapp: 'from-[#25D366] to-[#128C7E]',
  tiktok: 'from-black to-[#EE1D52]',
  website: 'from-indigo-500 to-indigo-600',
  email: 'from-sky-500 to-blue-600',
  phone: 'from-emerald-500 to-green-600',
  form: 'from-indigo-500 to-violet-600',
  custom: 'from-purple-500 to-violet-600',
};

// Helper functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

function HoverPreviewProductCard({ product, index, storeId, storeUsername, onClick }: { product: PublicProduct; index: number; storeId: string; storeUsername: string; onClick?: () => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
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

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // If product has variants, open the modal for variant selection
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      onClick?.();
      return;
    }
    if (addingToCart || isOutOfStock) return;
    setAddingToCart(true);
    const salePrice = product.salePrice != null && product.salePrice < product.price
      ? Number(product.salePrice)
      : null;
    addToCartStore({
      productId: product.id,
      name: product.name,
      price: salePrice ?? product.price,
      originalPrice: product.price,
      currency: product.currency ?? 'IQD',
      image: product.images?.[0] ?? '',
      stock: product.stock ?? 999,
      storeId,
      storeUsername,
      quantity: 1,
      ...(product.isDigital ? { isDigital: true } : {}),
    });
    toast.success('تمت الإضافة إلى السلة');
    // Dispatch storage event so cart count syncs
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => setAddingToCart(false), 800);
  }, [addingToCart, isOutOfStock, product, storeId, storeUsername, onClick]);

  useEffect(() => {
    return () => stopImageRotation();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'rounded-2xl border border-border/40 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-muted/40 hover:border-border/60 transition-colors cursor-pointer group',
        isOutOfStock && 'opacity-75',
      )}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5">
        {images[currentImageIndex] ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={`${product.id}-${currentImageIndex}`}
                src={images[currentImageIndex]}
                alt={product.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </AnimatePresence>
            {images.length > 1 && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/35 px-1.5 py-0.5 backdrop-blur-sm z-10">
                {images.map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={cn(
                      'block rounded-full transition-all duration-300',
                      dotIndex === currentImageIndex ? 'h-1 w-3 bg-white' : 'h-1 w-1 bg-white/60'
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Discount badge */}
        {hasSale && discountPercent > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-rose-500/90 text-white text-[9px] font-bold backdrop-blur-sm z-10">
            {discountPercent}%-
          </span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <span className="px-2.5 py-1 rounded-md bg-black/70 text-white text-[10px] font-bold backdrop-blur-sm">
              نفذت الكمية
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-xs font-semibold text-foreground truncate mb-0.5">{product.name}</p>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] text-muted-foreground tabular-nums min-w-0 truncate">
          {hasSale ? (
            <>
              <span className="text-rose-500 font-semibold">
                {formatCurrency(Number(product.salePrice), product.currency)}
              </span>
              <span className="line-through mr-1.5 opacity-60">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            formatCurrency(product.price, product.currency)
          )}
        </p>
        {!isOutOfStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addingToCart}
            aria-label="إضافة إلى السلة"
            className={cn(
              'shrink-0 p-1.5 rounded-lg transition-colors',
              addingToCart
                ? 'opacity-50 pointer-events-none'
                : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground',
            )}
          >
            <ShoppingCart className={cn('w-3.5 h-3.5', addingToCart && 'animate-pulse')} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Use shared helpers to resolve image URLs (handles presigned URLs and relative keys)

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [featuredForm, setFeaturedForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'products' | 'events' | 'forms'>('links');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [igBlocks, setIgBlocks] = useState<InstagramBlock[]>([]);
  const [igMedia, setIgMedia] = useState<InstagramMedia[]>([]);
  const [liBlocks, setLiBlocks] = useState<LinkedInBlock[]>([]);
  const [liProfile, setLiProfile] = useState<Pick<LinkedInConnection, 'name' | 'email' | 'profilePicUrl' | 'profileUrl'> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [showQtySelector, setShowQtySelector] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const productSheetDragControls = useDragControls();

  // Theme color - Teal/Cyan for profiles
  const themeColor = '#0D9488';

  // Active template based on profile themeKey
  const activeTemplate = getTemplate(profile?.themeKey ?? 'classic');

  // Product categories extracted from products
  const productCategories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach((p) => {
      if (p.category?.id && p.category?.name) {
        cats.set(p.category.id, p.category.name);
      }
    });
    return Array.from(cats, ([id, name]) => ({ id, name }));
  }, [products]);

  // Filtered products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category?.id === selectedCategory);
  }, [products, selectedCategory]);

  // Auto-slide banners every 5 seconds
  useEffect(() => {
    if (!profile?.banners || profile.banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [profile?.banners]);

  // Auto-select first available tab when data loads
  useEffect(() => {
    if (loading) return;
    const linksExist = (profile?.socialLinks?.length ?? 0) > 0 || igBlocks.length > 0 || liBlocks.length > 0;
    const productsExist = products.length > 0;
    const eventsExist = events.length > 0;
    const formsExist = forms.length > 0;

    if (activeTab === 'links' && !linksExist) {
      if (productsExist) setActiveTab('products');
      else if (eventsExist) setActiveTab('events');
      else if (formsExist) setActiveTab('forms');
    } else if (activeTab === 'products' && !productsExist) {
      if (linksExist) setActiveTab('links');
      else if (eventsExist) setActiveTab('events');
      else if (formsExist) setActiveTab('forms');
    } else if (activeTab === 'events' && !eventsExist) {
      if (linksExist) setActiveTab('links');
      else if (productsExist) setActiveTab('products');
      else if (formsExist) setActiveTab('forms');
    } else if (activeTab === 'forms' && !formsExist) {
      if (linksExist) setActiveTab('links');
      else if (productsExist) setActiveTab('products');
      else if (eventsExist) setActiveTab('events');
    }
  }, [loading, profile?.socialLinks, igBlocks, products, events, forms, activeTab]);

  // API_URL imported from @/lib/config

  // Fetch profile data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch profile (public endpoint - no auth required)
        const profileRes = await fetch(`${API_URL}/profiles/${encodeURIComponent(username)}`);
        if (!profileRes.ok) {
          throw new Error('Profile not found');
        }
        const profileData: PublicProfile = await profileRes.json();
        setProfile(profileData);

        // Check if this is the user's own profile and follow status
        // Try to refresh token first if needed, then check auth
        let hasToken = hasValidToken();
        if (!hasToken) {
          // Try to refresh the token
          const refreshed = await AuthClient.refreshTokens();
          hasToken = refreshed && hasValidToken();
        }
        
        if (hasToken) {
          try {
            const response = await api.get<{ id: string }>('/auth/me');
            const currentUser = response.data;
            if (currentUser?.id === profileData.user?.id) {
              setIsOwnProfile(true);
            } else if (currentUser?.id) {
              // Check if following this user
              try {
                const followResponse = await api.get<{ isFollowing: boolean }>(`/follow/${profileData.user.id}/is-following`);
                setIsFollowing(followResponse.data?.isFollowing || false);
              } catch {
                // Ignore follow status errors
              }
            }
          } catch {
            // User not logged in or error checking auth - that's fine
            setIsOwnProfile(false);
          }
        }

        // Fetch user's events - public endpoint
        try {
          const eventsRes = await fetch(`${API_URL}/events?organizerUsername=${encodeURIComponent(username)}&limit=4`);
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            setEvents(eventsData.events || []);
          }
        } catch {
          setEvents([]);
        }

        // Fetch user's active products - public endpoint
        try {
          const productsRes = await fetch(`${API_URL}/stores/${encodeURIComponent(username)}/products?limit=12`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setProducts(productsData.products || []);
            if (productsData.storeId) setStoreId(productsData.storeId);
          } else {
            setProducts([]);
          }
        } catch {
          setProducts([]);
        }

        // Fetch user's public forms
        try {
          const formsRes = await fetch(`${API_URL}/forms/public/user/${encodeURIComponent(username)}?limit=10`);
          if (formsRes.ok) {
            const formsData = await formsRes.json();
            setForms(formsData.forms || []);
            setFeaturedForm(formsData.featured || null);
          }
        } catch {
          setForms([]);
        }

        // Fetch Instagram blocks
        try {
          const igData = await getPublicInstagramData(profileData.user.id);
          setIgBlocks(igData.blocks || []);
          setIgMedia(igData.media?.data || []);
        } catch {
          // ignore
        }

        // Fetch LinkedIn blocks
        try {
          const liData = await getPublicLinkedInData(profileData.user.id);
          setLiBlocks(liData.blocks || []);
          setLiProfile(liData.profile || null);
        } catch {
          // ignore
        }

      } catch (err: any) {
        // Error fetching profile
        setError(err.message || 'Profile not found');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username]);

  // Re-fetch products when page becomes visible (e.g., after checkout)
  useEffect(() => {
    if (!username) return;
    const refetchProducts = async () => {
      try {
        const productsRes = await fetch(`${API_URL}/stores/${encodeURIComponent(username)}/products?limit=12`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const freshProducts = productsData.products || [];
          setProducts(freshProducts);
          if (productsData.storeId) setStoreId(productsData.storeId);
          syncCartStock(freshProducts);
          setCartCount(getCartCount());
        }
      } catch { /* ignore */ }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchProducts();
    };
    const onFocus = () => refetchProducts();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollow = async () => {
    if (!profile?.user?.id || followLoading || isOwnProfile) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/follow/${profile.user.id}`);
        setIsFollowing(false);
        // Update follower count locally
        setProfile({
          ...profile,
          _count: {
            followers: Math.max(0, (profile._count?.followers || 0) - 1),
            following: profile._count?.following || 0
          }
        });
      } else {
        await api.post(`/follow/${profile.user.id}`);
        setIsFollowing(true);
        // Update follower count locally
        setProfile({
          ...profile,
          _count: {
            followers: (profile._count?.followers || 0) + 1,
            following: profile._count?.following || 0
          }
        });
      }
    } catch (err: any) {
      // Error toggling follow
      // Show appropriate error message
      const errorMessage = err?.response?.data?.message || err?.message || 'حدث خطأ';
      if (errorMessage.includes('cannot follow yourself') || errorMessage.includes('You cannot follow yourself')) {
        toast.info('لا يمكنك متابعة نفسك', {
          description: 'هذا هو ملفك الشخصي',
          duration: 3000,
        });
      } else {
        toast.error('حدث خطأ', {
          description: errorMessage,
          duration: 3000,
        });
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // ─── Product detail modal handler ────────────────────────────────────────────
  const handleModalAddToCart = useCallback((product: PublicProduct, quantity = 1, variant?: ProductVariant | null) => {
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

    addToCartStore({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      currency: product.currency ?? 'IQD',
      image: variant?.imageUrl || product.images?.[0] || '',
      stock: effectiveStock,
      storeId,
      storeUsername: profile?.username ?? '',
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
  }, [storeId, profile?.username]);

  // Reset quantity and variant when modal opens
  useEffect(() => {
    if (selectedProduct) {
      setModalQty(1);
      setShowQtySelector(false);
      setSelectedVariant(null);
    }
  }, [selectedProduct?.id]);

  // ─── Cart count sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const sync = () => {
      const cart = getCart();
      setCartCount(cart?.storeUsername === profile.username ? getCartCount() : 0);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero skeleton */}
        <div className="relative h-48 sm:h-56 bg-muted animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex flex-col items-center sm:items-start sm:flex-row gap-4">
            <div className="w-28 h-28 rounded-full bg-muted border-4 border-background animate-pulse" />
            <div className="flex-1 pt-2 space-y-3">
              <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-muted/60 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-muted/40 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
              <div className="h-12 bg-muted rounded-2xl animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-muted rounded-2xl animate-pulse" />
              <div className="h-20 bg-muted rounded-2xl animate-pulse" />
              <div className="h-20 bg-muted rounded-2xl animate-pulse" />
              <div className="h-20 bg-muted rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center">
          <Users className="w-12 h-12 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">الملف الشخصي غير موجود</h1>
          <p className="text-muted-foreground max-w-md">عذراً، لم نتمكن من العثور على هذا الملف الشخصي. تأكد من صحة اسم المستخدم.</p>
        </div>
        <a
          href="/"
          className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          العودة للرئيسية
        </a>
      </div>
    );
  }

  const profileUrl = typeof window !== 'undefined' ? window.location.href : '';
  const displayName = profile.name || profile.user?.name || profile.username;
  const hasLinks = (profile.socialLinks?.filter(l => l.status !== 'hidden')?.length ?? 0) > 0 || igBlocks.length > 0;
  const hasProducts = products.length > 0;
  const hasEvents = events.length > 0;
  const hasForms = forms.length > 0;
  const visibleTabs = [hasLinks, hasProducts, hasEvents, hasForms].filter(Boolean).length;

  // Shared cart UI for non-portfolio templates
  const cartElements = (
    <>
      <CartDialog open={cartDialogOpen} onClose={() => setCartDialogOpen(false)} />
      <AnimatePresence>
        {cartCount > 0 && hasProducts && (
          <motion.button
            key="cart-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCartDialogOpen(true)}
            className="fixed bottom-6 left-6 z-[100] w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:bg-neutral-800 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[11px] font-bold flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );

  // ─── Product Detail Modal (shared across classic/centered/minimal) ───────────
  const productDetailModal = (
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
            className="relative bg-card z-[141] rounded-t-[24px] w-full max-h-[92vh] flex flex-col md:hidden"
            style={{ willChange: 'transform' }}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-1.5 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => productSheetDragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain pb-28">
              {/* Product Image */}
              <div className="px-4 pb-3">
                <div className="relative w-full rounded-2xl overflow-hidden bg-muted" style={{ height: (selectedProduct.images?.length ?? 0) > 1 ? 'calc(100vw + 60px)' : '100vw', maxHeight: '480px' }}>
                  <ProductImageSlider images={selectedProduct.images ?? []} name={selectedProduct.name} />
                </div>
              </div>

              {/* Product Info */}
              <div className="px-5 pt-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{displayName}</p>
                <h2 className="mt-1.5 text-[20px] font-bold text-foreground leading-snug">{selectedProduct.name}</h2>

                {selectedProduct.category && (
                  <span className="inline-block mt-2 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
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
                        <span className="text-[22px] font-bold text-foreground">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                        <span className="line-through text-[14px] text-muted-foreground">{formatCurrency(displayOriginal, selectedProduct.currency)}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[11px] font-bold">
                          {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%-
                        </span>
                      </>
                    ) : (
                      <span className="text-[22px] font-bold text-foreground">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
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
                          <span className="flex items-center gap-1 text-[12px] text-amber-600 dark:text-amber-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            باقي {displayStock} فقط
                          </span>
                        )}
                        {typeof displayStock === 'number' && displayStock > 10 && (
                          <span className="flex items-center gap-1 text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            متوفر في المخزون
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Truck className="w-3.5 h-3.5" />
                    <span>يتم حساب الشحن عند الدفع</span>
                  </span>
                </div>

                {/* ─── Variant Selector ─── */}
                {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (() => {
                  const attrKeys = [...new Set(selectedProduct.variants.flatMap(v => Object.keys(v.attributes as Record<string, string>)))];
                  return (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      {attrKeys.map(key => {
                        const values = [...new Set(selectedProduct.variants!.map(v => (v.attributes as Record<string, string>)[key]).filter(Boolean))];
                        return (
                          <div key={key}>
                            <p className="text-[12px] font-semibold text-foreground mb-2">{key}</p>
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
                                        ? 'bg-foreground text-background border-foreground'
                                        : hasStock
                                          ? 'bg-background text-foreground border-border hover:border-foreground'
                                          : 'bg-muted text-muted-foreground/40 border-border line-through cursor-not-allowed',
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
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <h3 className="text-[13px] font-semibold text-foreground mb-2">وصف المنتج</h3>
                    <p dir="rtl" className="text-[14px] text-muted-foreground leading-[1.8] text-right whitespace-pre-line">{selectedProduct.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Bottom Bar */}
            <div className="absolute bottom-0 inset-x-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-card via-card to-card/0 px-4 pt-3">
              {/* Cart summary bar */}
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
                      className="w-full h-[50px] bg-foreground rounded-2xl flex items-center justify-between px-4"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <ShoppingBag className="w-4 h-4 text-background" />
                          <motion.span key={cartCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">{cartCount}</motion.span>
                        </div>
                        <span className="text-[13px] text-background/70">الإجمالي</span>
                        <motion.span key={getCartTotal()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[14px] font-bold text-background tabular-nums">{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] text-background/80 font-medium">عرض السلة</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-background/50" />
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
                  ) : selectedProduct?.hasVariants && !selectedVariant ? (
                    <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                      <div className="h-[48px] rounded-2xl bg-muted text-muted-foreground text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                        اختر الخيارات أولاً
                      </div>
                    </motion.div>
                  ) : showQtySelector ? (
                    <motion.div key="qty-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2.5 flex-1">
                      <div className="flex items-center h-[48px] bg-muted rounded-2xl shrink-0 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); setModalQty(q => Math.max(1, q - 1)); }} disabled={modalQty <= 1} className="w-11 h-full flex items-center justify-center hover:bg-muted-foreground/10 transition-all disabled:opacity-30">
                          <Minus className="w-4 h-4" />
                        </button>
                        <motion.span key={modalQty} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="text-[16px] font-bold min-w-[32px] text-center tabular-nums">{modalQty}</motion.span>
                        <button onClick={(e) => { e.stopPropagation(); const maxStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); setModalQty(q => Math.min(q + 1, maxStock)); }} disabled={modalQty >= (selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999))} className="w-11 h-full flex items-center justify-center hover:bg-muted-foreground/10 transition-all disabled:opacity-30">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={(e) => { e.stopPropagation(); handleModalAddToCart(selectedProduct, modalQty, selectedVariant); setShowQtySelector(false); }}
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
                        className="w-full h-[48px] rounded-2xl bg-foreground text-background text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0 ? <span>نفذ المخزون</span> : <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>}
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
            className="relative max-h-[85vh] bg-card z-[141] rounded-3xl w-full max-w-[780px] hidden md:flex flex-col overflow-hidden shadow-2xl border border-border/50"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 z-30 h-9 w-9 rounded-full bg-muted flex items-center justify-center transition-all hover:bg-muted-foreground/20 hover:rotate-90 duration-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Two-column layout */}
            <div className="flex flex-row flex-1 min-h-0">
              {/* Left: Product Image */}
              <div className="w-[360px] shrink-0 bg-muted">
                <div className="w-full h-full" style={{ minHeight: (selectedProduct.images?.length ?? 0) > 1 ? '440px' : '360px' }}>
                  <ProductImageSlider images={selectedProduct.images ?? []} name={selectedProduct.name} desktop />
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-7 pt-7 pb-4 scrollbar-hide">
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{displayName}</p>
                  <h2 className="mt-2 text-[22px] font-bold text-foreground leading-snug">{selectedProduct.name}</h2>

                  {selectedProduct.category && (
                    <span className="inline-block mt-2.5 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                      {selectedProduct.category.name}
                    </span>
                  )}

                  {/* Price */}
                  <div className="mt-4">
                    {(() => {
                      const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? Number(selectedProduct.salePrice) : selectedProduct.price);
                      const displayOriginal = selectedVariant ? (selectedVariant.compareAtPrice ?? null) : (selectedProduct.salePrice != null && selectedProduct.salePrice < selectedProduct.price ? selectedProduct.price : null);
                      const hasDiscount = displayOriginal != null && displayOriginal > displayPrice;
                      return hasDiscount ? (
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-[26px] font-bold text-foreground">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                          <span className="line-through text-[15px] text-muted-foreground">{formatCurrency(displayOriginal, selectedProduct.currency)}</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[11px] font-bold">
                            {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%-
                          </span>
                        </div>
                      ) : (
                        <span className="text-[26px] font-bold text-foreground">{formatCurrency(displayPrice, selectedProduct.currency)}</span>
                      );
                    })()}
                  </div>

                  {/* Stock & Shipping */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {(() => {
                      const displayStock = selectedVariant ? selectedVariant.stock : selectedProduct.stock;
                      return (
                        <>
                          {typeof displayStock === 'number' && displayStock > 0 && displayStock <= 10 && (
                            <span className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              باقي {displayStock} فقط
                            </span>
                          )}
                          {typeof displayStock === 'number' && displayStock > 10 && (
                            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              متوفر في المخزون
                            </span>
                          )}
                        </>
                      );
                    })()}
                    <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Truck className="w-3.5 h-3.5" />
                      <span>يتم حساب الشحن عند الدفع</span>
                    </span>
                  </div>

                  {/* ─── Variant Selector ─── */}
                  {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (() => {
                    const attrKeys = [...new Set(selectedProduct.variants.flatMap(v => Object.keys(v.attributes as Record<string, string>)))];
                    return (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                        {attrKeys.map(key => {
                          const values = [...new Set(selectedProduct.variants!.map(v => (v.attributes as Record<string, string>)[key]).filter(Boolean))];
                          return (
                            <div key={key}>
                              <p className="text-[12px] font-semibold text-foreground mb-2">{key}</p>
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
                                          ? 'bg-foreground text-background border-foreground'
                                          : hasStock
                                            ? 'bg-background text-foreground border-border hover:border-foreground'
                                            : 'bg-muted text-muted-foreground/40 border-border line-through cursor-not-allowed',
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
                    <div className="mt-5 pt-5 border-t border-border/50">
                      <h3 className="text-[13px] font-semibold text-foreground mb-2">وصف المنتج</h3>
                      <p dir="rtl" className="text-[14px] leading-[1.8] text-muted-foreground text-right whitespace-pre-line">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>

                {/* Add To Cart - Desktop */}
                <div className="shrink-0 border-t border-border/50">
                  {/* Cart summary bar */}
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="overflow-hidden">
                        <motion.button
                          whileTap={{ scale: 0.99 }}
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); setCartDialogOpen(true); }}
                          className="w-full h-[48px] bg-foreground rounded-2xl mx-auto flex items-center justify-between px-7 hover:opacity-90 transition-opacity"
                          style={{ width: 'calc(100% - 40px)', margin: '12px 20px 0' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <ShoppingBag className="w-4 h-4 text-background" />
                              <motion.span key={cartCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">{cartCount}</motion.span>
                            </div>
                            <span className="text-[13px] text-background/70">الإجمالي</span>
                            <motion.span key={getCartTotal()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[14px] font-bold text-background tabular-nums">{formatCurrency(getCartTotal(), getCartCurrency())}</motion.span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] text-background/80 font-medium">عرض السلة</span>
                            <ChevronLeft className="w-3.5 h-3.5 text-background/50" />
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
                      ) : selectedProduct?.hasVariants && !selectedVariant ? (
                        <motion.div key="select-variant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1">
                          <div className="h-[46px] rounded-2xl bg-muted text-muted-foreground text-[15px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                            اختر الخيارات أولاً
                          </div>
                        </motion.div>
                      ) : showQtySelector ? (
                        <motion.div key="qty-state" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3 flex-1">
                          <div className="flex items-center h-[46px] bg-muted rounded-2xl shrink-0 overflow-hidden">
                            <button onClick={(e) => { e.stopPropagation(); setModalQty(q => Math.max(1, q - 1)); }} disabled={modalQty <= 1} className="w-11 h-full flex items-center justify-center hover:bg-muted-foreground/10 transition-all disabled:opacity-30">
                              <Minus className="w-4 h-4" />
                            </button>
                            <motion.span key={modalQty} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="text-[16px] font-bold min-w-[32px] text-center tabular-nums">{modalQty}</motion.span>
                            <button onClick={(e) => { e.stopPropagation(); const maxStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); setModalQty(q => Math.min(q + 1, maxStock)); }} disabled={modalQty >= (selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999))} className="w-11 h-full flex items-center justify-center hover:bg-muted-foreground/10 transition-all disabled:opacity-30">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleModalAddToCart(selectedProduct, modalQty, selectedVariant); setShowQtySelector(false); }}
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
                            whileHover={{ opacity: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); const effectiveStock = selectedVariant ? selectedVariant.stock : (selectedProduct.stock ?? 999); if (effectiveStock !== 0) { setModalQty(1); setShowQtySelector(true); } }}
                            disabled={(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0}
                            className="w-full h-[46px] rounded-2xl bg-foreground text-background text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                          >
                            {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0 ? <span>نفذ المخزون</span> : <><ShoppingCart className="w-[17px] h-[17px]" />إضافة للسلة</>}
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
  );

  // ─── Shared Modals JSX (used across all templates) ───────────────────────────
  const sharedModals = (
    <>
      <AnimatePresence>
        {showQRModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border/50">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">مشاركة الملف الشخصي</h3>
                <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="flex justify-center p-6 bg-white rounded-2xl border border-border/40">
                <QRCodeSVG value={profileUrl} size={200} level="H" includeMargin fgColor={themeColor} />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">امسح الكود للوصول للملف الشخصي</p>
              <button onClick={handleCopyLink} className="w-full mt-4 py-3 px-4 bg-muted hover:bg-muted/80 rounded-xl font-medium text-foreground flex items-center justify-center gap-2 transition-colors">
                {copied ? <><Check className="w-5 h-5 text-emerald-500" />تم النسخ!</> : <><Copy className="w-5 h-5" />نسخ الرابط</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl border border-border/50">
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-foreground mb-5">مشاركة</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'واتساب', icon: MessageCircle, color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(profileUrl)}` },
                  { name: 'تويتر', icon: Twitter, color: '#1DA1F2', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}` },
                  { name: 'لينكدإن', icon: Linkedin, color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}` },
                  { name: 'نسخ', icon: Copy, color: '#6B7280', onClick: handleCopyLink },
                ].map((item) => (
                  <button key={item.name} onClick={() => { if (item.onClick) { item.onClick(); } else if (item.url) { window.open(item.url, '_blank'); } setShowShareModal(false); }} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-105" style={{ backgroundColor: item.color }}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-full mt-6 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors">إلغاء</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ─── Centered Template ───────────────────────────────────────────────────────
  if ((activeTemplate.key as string) === 'centered') {
    const visibleLinks = profile.socialLinks
      ?.filter(l => l.status !== 'hidden' && l.platform?.toLowerCase() !== 'form')
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) ?? [];
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-4 pt-16 pb-12">
          {/* Avatar + Name centered */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center gap-4 mb-10">
            <Avatar className="w-28 h-28 ring-4 ring-primary/20 shadow-xl">
              {profile.avatar && <AvatarImage src={profile.avatar} alt={displayName} />}
              <AvatarFallback className="text-2xl font-bold text-white bg-gradient-to-br from-primary to-primary/70">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{profile.bio}</p>}
            </div>
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">{formatNumber(profile._count?.followers || 0)}</span>
                <span className="text-muted-foreground">متابع</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">{formatNumber(profile._count?.following || 0)}</span>
                <span className="text-muted-foreground">يتابع</span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowShareModal(true)} className="p-2.5 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all hover:shadow-sm" title="مشاركة">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowQRModal(true)} className="p-2.5 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all hover:shadow-sm" title="QR Code">
                <QrCode className="w-4 h-4" />
              </button>
              {!isOwnProfile && (
                <button onClick={handleFollow} disabled={followLoading} className={cn('px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2', isFollowing ? 'bg-card border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20', followLoading && 'opacity-50 cursor-not-allowed')}>
                  {followLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isFollowing ? <><UserCheck className="w-4 h-4" /><span>متابَع</span></> : <><UserPlus className="w-4 h-4" />متابعة</>}
                </button>
              )}
            </div>
          </motion.div>

          {/* Links - full width centered cards */}
          {visibleLinks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3 mb-8">
              {visibleLinks.map((link, index) => {
                const platformKey = link.platform?.toLowerCase() ?? '';
                const brand = getBrandByKey(platformKey);
                const localIconPath = getLocalIconPathByKey(platformKey);
                const domain = extractDomain(link.url);
                return (
                  <motion.a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(link.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between gap-3 px-5 py-3.5 bg-card rounded-2xl border border-border/50 hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200 group w-full">
                    <div className="flex items-center gap-3">
                      {localIconPath ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={localIconPath} alt={platformKey} className="w-4 h-4" />
                        </div>
                      ) : brand ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}` }}>
                          <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-4 h-4 text-white"><path d={brand.path} /></svg>
                        </div>
                      ) : domain ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                          <Link2 className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="font-medium text-sm text-foreground">{link.title || link.platform}</span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:-translate-x-0.5 transition-all shrink-0" />
                  </motion.a>
                );
              })}
            </motion.div>
          )}

          {/* Products */}
          {hasProducts && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">المنتجات</h2>
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 4).map((product, index) => (
                  <HoverPreviewProductCard key={product.id} product={product} index={index} storeId={storeId} storeUsername={profile.username} onClick={() => setSelectedProduct(product)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Events */}
          {hasEvents && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3 mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">الأحداث</h2>
              {events.slice(0, 3).map((event, index) => (
                <a key={event.id} href={`/events/${event.id}`} className="flex gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="w-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl bg-primary/5 border border-primary/10 p-2">
                    <span className="text-xl font-bold text-primary leading-none">{new Date(event.startDate).getDate()}</span>
                    <span className="text-[10px] font-medium text-primary/70 mt-0.5">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="font-semibold text-foreground line-clamp-1 text-sm group-hover:text-primary transition-colors">{event.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </a>
              ))}
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground/50">
              <span>مدعوم بواسطة</span>
              <a href="/" className="font-bold text-foreground/60 hover:text-primary transition-colors">Rukny</a>
            </div>
          </div>
        </div>
        {productDetailModal}
        {sharedModals}
        {cartElements}
      </div>
    );
  }

  // ─── Minimal Template ────────────────────────────────────────────────────────
  if ((activeTemplate.key as string) === 'minimal') {
    const visibleLinks = profile.socialLinks
      ?.filter(l => l.status !== 'hidden' && l.platform?.toLowerCase() !== 'form')
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) ?? [];
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-6 pt-10 pb-12">
          {/* Header: small avatar + name inline */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 mb-8">
            <Avatar className="w-14 h-14 ring-2 ring-border shadow-sm shrink-0">
              {profile.avatar && <AvatarImage src={profile.avatar} alt={displayName} />}
              <AvatarFallback className="text-base font-bold text-white bg-gradient-to-br from-primary to-primary/70">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{displayName}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowShareModal(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="مشاركة">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowQRModal(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="QR Code">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Bio */}
          {profile.bio && <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{profile.bio}</p>}

          {/* Follow button */}
          {!isOwnProfile && (
            <div className="mb-6">
              <button onClick={handleFollow} disabled={followLoading} className={cn('w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border', isFollowing ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/30' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10', followLoading && 'opacity-50 cursor-not-allowed')}>
                {followLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isFollowing ? <><UserCheck className="w-4 h-4" /><span>متابَع</span></> : <><UserPlus className="w-4 h-4" /><span>متابعة</span></>}
              </button>
            </div>
          )}

          {/* Links - minimal divider list */}
          {visibleLinks.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="divide-y divide-border/40 mb-8">
              {visibleLinks.map((link, index) => {
                const platformKey = link.platform?.toLowerCase() ?? '';
                const brand = getBrandByKey(platformKey);
                const localIconPath = getLocalIconPathByKey(platformKey);
                const domain = extractDomain(link.url);
                return (
                  <motion.a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(link.id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center gap-3 py-3 group hover:text-primary transition-colors">
                    {localIconPath ? (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={localIconPath} alt={platformKey} className="w-3.5 h-3.5" />
                      </div>
                    ) : brand ? (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}` }}>
                        <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-3.5 h-3.5 text-white"><path d={brand.path} /></svg>
                      </div>
                    ) : domain ? (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-3.5 h-3.5" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="flex-1 font-medium text-sm text-foreground group-hover:text-primary truncate transition-colors">{link.title || link.platform}</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0" />
                  </motion.a>
                );
              })}
            </motion.div>
          )}

          {/* Products */}
          {hasProducts && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">المنتجات</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {products.slice(0, 4).map((product, index) => (
                  <HoverPreviewProductCard key={product.id} product={product} index={index} storeId={storeId} storeUsername={profile.username} onClick={() => setSelectedProduct(product)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Events */}
          {hasEvents && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">الأحداث</h2>
              <div className="space-y-2">
                {events.slice(0, 3).map((event) => (
                  <a key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 py-2 hover:text-primary transition-colors group">
                    <div className="w-10 h-10 flex-shrink-0 flex flex-col items-center justify-center rounded-lg bg-muted text-center">
                      <span className="text-base font-bold text-foreground leading-none">{new Date(event.startDate).getDate()}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground/50">
              <span>مدعوم بواسطة</span>
              <a href="/" className="font-bold text-foreground/60 hover:text-primary transition-colors">Rukny</a>
            </div>
          </div>
        </div>
        {productDetailModal}
        {sharedModals}
        {cartElements}
      </div>
    );
  }

  // ─── Store Pro Template ────────────────────────────────────────────────────────
  if (activeTemplate.key === 'store') {
    return (
      <StoreTemplate
        profile={profile}
        storeId={storeId}
        products={products}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollow={handleFollow}
        onShowShare={() => setShowShareModal(true)}
        onShowQR={() => setShowQRModal(true)}
        showQRModal={showQRModal}
        showShareModal={showShareModal}
        onCloseQR={() => setShowQRModal(false)}
        onCloseShare={() => setShowShareModal(false)}
        copied={copied}
        onCopyLink={handleCopyLink}
        profileUrl={profileUrl}
      />
    );
  }

  // ─── Portfolio Template ───────────────────────────────────────────────────────
  if (activeTemplate.key === 'portfolio') {
    return (
      <PortfolioTemplate
        profile={profile}
        storeId={storeId}
        products={products}
        events={events}
        forms={forms}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollow={handleFollow}
        onShowShare={() => setShowShareModal(true)}
        onShowQR={() => setShowQRModal(true)}
        showQRModal={showQRModal}
        showShareModal={showShareModal}
        onCloseQR={() => setShowQRModal(false)}
        onCloseShare={() => setShowShareModal(false)}
        copied={copied}
        onCopyLink={handleCopyLink}
        profileUrl={profileUrl}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO — Full-width Cover + Profile Info                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative">
        {/* Cover Image */}
        <div className="relative h-52 sm:h-64 md:h-72 overflow-hidden">
          {profile.coverImage ? (
            <>
              <img
                src={profile.coverImage}
                alt="Cover"
                className="w-full h-full object-cover scale-[1.02] transition-transform duration-700"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              {/* Darker gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-background">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '28px 28px' }} />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}
          {/* Strong fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Profile Header — overlapping cover */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative -mt-24 z-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
            {/* Avatar with glow */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
              className="relative shrink-0 self-center sm:self-end"
            >
              <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md opacity-70" />
              <Avatar className="relative w-32 h-32 ring-[3px] ring-background shadow-2xl">
                {profile.avatar && <AvatarImage src={profile.avatar} alt={displayName} />}
                <AvatarFallback className="text-3xl font-extrabold text-white bg-gradient-to-br from-primary to-primary/70">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Name + Actions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 min-w-0 pb-1 text-center sm:text-right"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">{displayName}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5 font-medium">@{profile.username}</p>
                  {/* Bio visible on mobile (before sidebar) */}
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2 sm:hidden">{profile.bio}</p>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 sm:mt-0">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-background transition-all hover:shadow-sm"
                    title="مشاركة"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="p-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-background transition-all hover:shadow-sm"
                    title="QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  {!isOwnProfile && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={cn(
                        "px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                        isFollowing
                          ? "bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25",
                        followLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {followLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isFollowing ? (
                        <><UserCheck className="w-4 h-4" /><span>متابَع</span></>
                      ) : (
                        <><UserPlus className="w-4 h-4" />متابعة</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  MAIN CONTENT — Sidebar + Content Area                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-5 pb-12">
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 lg:items-start">

          {/* ─── Sidebar ─── */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:sticky lg:top-20 mb-6 lg:mb-0 space-y-4"
          >
            {/* About Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4 shadow-sm">
              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
              )}

              {/* Meta Info */}
              <div className="space-y-2 text-sm">
                {profile.location && (
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <span className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    </span>
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors group">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    </span>
                    <span className="truncate group-hover:underline">{profile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                <span className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </span>
                  انضم {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-border/40" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center justify-center rounded-xl bg-muted/40 py-3 gap-0.5">
                  <span className="text-lg font-extrabold text-foreground leading-none">{formatNumber(profile._count?.followers || 0)}</span>
                  <span className="text-[11px] text-muted-foreground">متابع</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-muted/40 py-3 gap-0.5">
                  <span className="text-lg font-extrabold text-foreground leading-none">{formatNumber(profile._count?.following || 0)}</span>
                  <span className="text-[11px] text-muted-foreground">يتابع</span>
                </div>
              </div>
            </div>

            {/* LinkedIn Card in Sidebar */}
            {liBlocks.length > 0 && liProfile && (
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-4 h-4" />
                  <p className="text-xs font-semibold text-muted-foreground">لينكدإن</p>
                </div>
                <a
                  href={liProfile.profileUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {liProfile.profilePicUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={liProfile.profilePicUrl} alt={liProfile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                        <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-[#0A66C2] transition-colors">{liProfile.name}</p>
                      {liProfile.email && <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{liProfile.email}</p>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-[#0A66C2] transition-colors shrink-0" />
                  </div>
                </a>
              </div>
            )}
          </motion.aside>

          {/* ─── Content Area ─── */}
          <div className="min-w-0 space-y-6">

            {/* Banners Carousel */}
            {profile.banners && profile.banners.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="rounded-2xl overflow-hidden border border-border/40 relative group">
                  <div
                    className="relative h-44 sm:h-56 md:h-64 cursor-grab active:cursor-grabbing touch-pan-y"
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
                        if (diff > 0) {
                          setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1));
                        } else {
                          setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as any)._mouseStartX = e.clientX;
                      (e.currentTarget as any)._isDragging = true;
                    }}
                    onMouseMove={(e) => {
                      if (!(e.currentTarget as any)._isDragging) return;
                      e.preventDefault();
                    }}
                    onMouseUp={(e) => {
                      const mouseStartX = (e.currentTarget as any)._mouseStartX;
                      if (mouseStartX === undefined || !(e.currentTarget as any)._isDragging) return;
                      (e.currentTarget as any)._isDragging = false;
                      const diff = mouseStartX - e.clientX;
                      if (Math.abs(diff) > 50) {
                        if (diff > 0) {
                          setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1));
                        } else {
                          setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1));
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as any)._isDragging = false;
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentBanner}
                        src={profile.banners[currentBanner]}
                        alt={`Banner ${currentBanner + 1}`}
                        className="w-full h-full object-cover absolute inset-0 select-none pointer-events-none"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        draggable={false}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </AnimatePresence>

                    {/* Navigation Arrows (desktop) */}
                    {profile.banners.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentBanner((prev) => (prev === profile.banners!.length - 1 ? 0 : prev + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentBanner((prev) => (prev === 0 ? profile.banners!.length - 1 : prev - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Dots Indicator */}
                    {profile.banners.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1.5">
                        {profile.banners.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentBanner(idx)}
                            className={cn(
                              'rounded-full transition-all duration-300',
                              idx === currentBanner
                                ? 'bg-white w-5 h-1.5'
                                : 'bg-white/50 hover:bg-white/80 w-1.5 h-1.5'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabs */}
            {visibleTabs > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
              >
                <div className="flex items-center border-b border-border/50 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {hasLinks && (
                    <button
                      onClick={() => setActiveTab('links')}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap border-b-2 -mb-px',
                        activeTab === 'links'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
                      )}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      الروابط
                      {profile.socialLinks?.length > 0 && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                          activeTab === 'links' ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground'
                        )}>
                          {profile.socialLinks.filter(l => l.status !== 'hidden').length}
                        </span>
                      )}
                    </button>
                  )}
                  {hasEvents && (
                    <button
                      onClick={() => setActiveTab('events')}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap border-b-2 -mb-px',
                        activeTab === 'events'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
                      )}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      الأحداث
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                        activeTab === 'events' ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground'
                      )}>
                        {events.length}
                      </span>
                    </button>
                  )}
                  {hasProducts && (
                    <button
                      onClick={() => setActiveTab('products')}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap border-b-2 -mb-px',
                        activeTab === 'products'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
                      )}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      المنتجات
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                        activeTab === 'products' ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground'
                      )}>
                        {products.length}
                      </span>
                    </button>
                  )}
                  {hasForms && (
                    <button
                      onClick={() => setActiveTab('forms')}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap border-b-2 -mb-px',
                        activeTab === 'forms'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
                      )}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      النماذج
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                        activeTab === 'forms' ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground'
                      )}>
                        {forms.length}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Latest Form Card — above links */}
            {forms.length > 0 && activeTab === 'links' && (() => {
              const latestForm = forms[forms.length - 1];
              const typeStyle = FORM_TYPE_STYLES[latestForm.type] || FORM_TYPE_STYLES.OTHER;
              const TypeIcon = typeStyle.icon;
              return (
                <motion.a
                  href={`/f/${latestForm.slug}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="flex items-center gap-3 p-2.5 bg-card rounded-xl border border-border/50 hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {latestForm.coverImage ? (
                      <img src={latestForm.coverImage} alt={latestForm.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/50">
                        <TypeIcon className={cn('w-6 h-6', typeStyle.color)} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{latestForm.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{FORM_TYPE_LABELS[latestForm.type] || 'نموذج'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                    <span>فتح النموذج</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </motion.a>
              );
            })()}

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'links' && (
                <motion.div
                  key="links"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {profile.socialLinks && profile.socialLinks.length > 0 ? (
                    (() => {
                      const activeLinks = profile.socialLinks
                        .filter(l => l.status !== 'hidden' && l.platform?.toLowerCase() !== 'form')
                        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                      const pinnedLinks = activeLinks.filter(l => l.isPinned);
                      const unpinnedLinks = activeLinks.filter(l => !l.isPinned);
                      const featuredLinks = unpinnedLinks.filter(l => l.layout === 'featured' && l.thumbnail);
                      const classicLinks = unpinnedLinks.filter(l => !(l.layout === 'featured' && l.thumbnail));
                      return (
                        <>
                          {/* ── Pinned Links ── */}
                          {pinnedLinks.length > 0 && (
                            <div className="space-y-2">
                              {pinnedLinks.map((link, index) => {
                                const platformKey = link.platform?.toLowerCase() ?? '';
                                const brand = getBrandByKey(platformKey);
                                const localIconPath = getLocalIconPathByKey(platformKey);
                                const domain = extractDomain(link.url);
                                const gradient = socialGradients[platformKey] || socialGradients.custom;
                                const hasThumbnail = link.layout === 'featured' && link.thumbnail;
                                return (
                                  <motion.a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackLinkClick(link.id)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="block overflow-hidden rounded-xl border-2 border-primary/20 bg-card hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group relative"
                                  >
                                    {/* Pinned indicator */}
                                    <div className="absolute top-2 left-2 z-10">
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-medium">
                                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 16 16"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5a.5.5 0 0 1-1 0V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/></svg>
                                        مثبّت
                                      </span>
                                    </div>
                                    {hasThumbnail && (
                                      <div className="p-2 pb-0">
                                        <div className="relative w-full aspect-[3/2] overflow-hidden rounded-lg bg-muted">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={link.thumbnail!} alt={link.title || platformKey} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2.5 p-2.5">
                                      {link.thumbnail && !hasThumbnail ? (
                                        <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-muted">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={link.thumbnail} alt={link.title || platformKey} className="w-full h-full object-cover" />
                                        </div>
                                      ) : localIconPath ? (
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={localIconPath} alt={platformKey} className="w-4 h-4" />
                                        </div>
                                      ) : brand ? (
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}` }}>
                                          <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-4 h-4 text-white"><path d={brand.path} /></svg>
                                        </div>
                                      ) : domain ? (
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0 overflow-hidden">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                                        </div>
                                      ) : (
                                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shrink-0', gradient)}>
                                          <Link2 className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-foreground truncate">{link.title || link.platform}</p>
                                        {!hasThumbnail && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{link.url}</p>}
                                      </div>
                                      <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-x-1 transition-all flex-shrink-0" />
                                    </div>
                                  </motion.a>
                                );
                              })}
                            </div>
                          )}

                          {/* ── Featured Links — grid ── */}
                          {featuredLinks.length > 0 && (
                            <div className="grid grid-cols-1 gap-2.5">
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
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="block overflow-hidden rounded-2xl border border-border/50 bg-card hover:shadow-lg hover:border-border hover:-translate-y-0.5 transition-all duration-200 group"
                                  >
                                    <div className="p-2 pb-0">
                                      <div className="relative w-full aspect-[3/2] overflow-hidden rounded-3xl bg-muted">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={link.thumbnail!} alt={link.title || platformKey} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2.5">
                                      {localIconPath ? (
                                        <div className="w-6 h-6 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={localIconPath} alt={platformKey} className="w-3.5 h-3.5" />
                                        </div>
                                      ) : brand ? (
                                        <div className="w-6 h-6 rounded-3xl flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}` }}>
                                          <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-3.5 h-3.5 text-white"><path d={brand.path} /></svg>
                                        </div>
                                      ) : domain ? (
                                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0 overflow-hidden">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-3.5 h-3.5" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                                        </div>
                                      ) : null}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{link.title || link.platform}</p>
                                      </div>
                                      <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
                                    </div>
                                  </motion.a>
                                );
                              })}
                            </div>
                          )}

                          {/* ── Classic Links ── */}
                          {classicLinks.length > 0 && (
                            <div className="space-y-2">
                              {classicLinks.map((link, index) => {
                                const platformKey = link.platform?.toLowerCase() ?? '';
                                const brand = getBrandByKey(platformKey);
                                const localIconPath = getLocalIconPathByKey(platformKey);
                                const domain = extractDomain(link.url);
                                const gradient = socialGradients[platformKey] || socialGradients.custom;
                                return (
                                  <motion.a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackLinkClick(link.id)}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className="flex items-center gap-2.5 p-2.5 bg-card rounded-xl border border-border/50 hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200 group"
                                  >
                                    {link.thumbnail ? (
                                      <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-muted">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={link.thumbnail} alt={link.title || platformKey} className="w-full h-full object-cover" />
                                      </div>
                                    ) : localIconPath ? (
                                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={localIconPath} alt={platformKey} className="w-4 h-4" />
                                      </div>
                                    ) : brand ? (
                                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `#${brand.hex}` }}>
                                        <svg role="img" viewBox="0 0 24 24" fill="currentColor" aria-label={brand.title} className="w-4 h-4 text-white"><path d={brand.path} /></svg>
                                      </div>
                                    ) : domain ? (
                                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900 border border-border/40 shrink-0 overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getFaviconUrl(domain, 64)} alt={domain} className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                                      </div>
                                    ) : (
                                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shrink-0', gradient)}>
                                        <Link2 className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-foreground truncate">{link.title || link.platform}</p>
                                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{link.url}</p>
                                    </div>
                                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
                                  </motion.a>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : igBlocks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Link2 className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="font-medium">لا توجد روابط</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">لم يضف المستخدم أي روابط بعد</p>
                    </div>
                  ) : null}

                  {/* Instagram Blocks */}
                  {igBlocks.map((block) => {
                    const isGrid = block.type === 'GRID';
                    const mediaItems = isGrid ? igMedia.slice(0, 9) : igMedia.slice(0, 6);
                    if (mediaItems.length === 0) return null;

                    return (
                      <div key={block.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icons/instagram.svg" alt="Instagram" className="w-5 h-5" />
                          <p className="text-sm font-semibold">{isGrid ? 'شبكة إنستغرام' : 'أحدث المنشورات'}</p>
                        </div>
                        <div className="p-2.5">
                          {isGrid ? (
                            <div className="grid grid-cols-3 gap-1">
                              {mediaItems.map((item) => {
                                const gridLink = block.gridLinks.find((gl) => gl.mediaId === item.id);
                                return (
                                  <a key={item.id} href={gridLink?.linkUrl || item.permalink} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.thumbnail_url || item.media_url} alt={item.caption || ''} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                      {gridLink?.linkUrl ? (
                                        <Link2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      ) : (
                                        <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      )}
                                    </div>
                                    {gridLink?.linkUrl && (
                                      <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <Link2 className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    )}
                                    {item.media_type === 'VIDEO' && (
                                      <div className="absolute top-1 left-1 text-white/80">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                      </div>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                              {mediaItems.map((item) => (
                                <a key={item.id} href={item.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 w-32 rounded-xl overflow-hidden border border-border/40 hover:shadow-md transition-shadow group">
                                  <div className="relative aspect-square">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.thumbnail_url || item.media_url} alt={item.caption || ''} className="w-full h-full object-cover" />
                                    {item.media_type === 'VIDEO' && (
                                      <div className="absolute top-1.5 left-1.5 text-white/80">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                      <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                  <div className="p-2">
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{item.caption || 'بدون وصف'}</p>
                                    {item.like_count != null && (
                                      <span className="flex items-center gap-0.5 mt-1 text-[9px] text-muted-foreground/60">
                                        <Heart className="w-2.5 h-2.5" /> {item.like_count}
                                      </span>
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Events Tab */}
              {activeTab === 'events' && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {events.map((event, index) => (
                    <motion.a
                      key={event.id}
                      href={`/events/${event.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="flex gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:shadow-lg hover:border-border hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      {/* Date Badge */}
                      <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center rounded-xl bg-primary/5 border border-primary/10 p-2">
                        <span className="text-2xl font-bold text-primary leading-none">
                          {new Date(event.startDate).getDate()}
                        </span>
                        <span className="text-[10px] font-medium text-primary/70 mt-1">
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      {/* Event Image */}
                      <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0 shadow-sm">
                        {event.coverImage ? (
                          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <CalendarDays className="w-8 h-8 text-primary/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(event.startDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                          {(event.location || event.venue) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.venue || event.location}
                            </span>
                          )}
                          {event._count?.registrations !== undefined && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {event._count.registrations} مشارك
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.a>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="font-medium">لا توجد أحداث قادمة</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Category filter chips */}
                  {productCategories.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                          !selectedCategory
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground',
                        )}
                      >
                        الكل
                        <span className="mr-1 tabular-nums">({products.length})</span>
                      </button>
                      {productCategories.map((cat) => {
                        const count = products.filter((p) => p.category?.id === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                            className={cn(
                              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                              selectedCategory === cat.id
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground',
                            )}
                          >
                            {cat.name}
                            <span className="mr-1 tabular-nums">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Products grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map((product, index) => (
                      <HoverPreviewProductCard key={product.id} product={product} index={index} storeId={storeId} storeUsername={profile.username} onClick={() => setSelectedProduct(product)} />
                    ))}
                  </div>

                  {/* No results after filter */}
                  {filteredProducts.length === 0 && products.length > 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="font-medium text-sm">لا توجد منتجات في هذا التصنيف</p>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        عرض جميع المنتجات
                      </button>
                    </div>
                  )}

                  {/* Empty store */}
                  {products.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="font-medium">لا توجد منتجات متاحة</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Forms Tab */}
              {activeTab === 'forms' && (
                <motion.div
                  key="forms"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {forms.map((form, index) => {
                    const typeStyle = FORM_TYPE_STYLES[form.type] || FORM_TYPE_STYLES.OTHER;
                    const TypeIcon = typeStyle.icon;
                    const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();
                    return (
                      <motion.a
                        key={form.id}
                        href={`/f/${form.slug}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="bg-card rounded-2xl border border-border/50 p-2.5 group cursor-pointer hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {/* Image/Icon Section */}
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5">
                          {form.coverImage ? (
                            <>
                              <img
                                src={form.coverImage}
                                alt={form.title}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/50">
                              <TypeIcon className={cn('w-8 h-8', typeStyle.color)} />
                            </div>
                          )}

                          {/* Status indicator — Top Left */}
                          <span className={cn(
                            'absolute top-1.5 left-1.5 w-2 h-2 rounded-full shadow-sm',
                            isExpired ? 'bg-red-400' : 'bg-emerald-400'
                          )} />
                        </div>

                        {/* Content Section */}
                        <div className="text-right px-0.5 space-y-0.5">
                          <h3 className="font-bold text-foreground text-sm leading-tight truncate">
                            {form.title}
                          </h3>
                          {form.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{form.description}</p>
                          )}
                          <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                            <span>{FORM_TYPE_LABELS[form.type] || 'نموذج'}</span>
                            <span className="text-border">·</span>
                            <span className={cn(
                              'font-medium',
                              isExpired ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                            )}>
                              {isExpired ? 'منتهي' : 'متاح'}
                            </span>
                          </div>
                        </div>
                      </motion.a>
                    );
                  })}
                  {forms.length === 0 && (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <ClipboardList className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="font-medium">لا توجد نماذج متاحة</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>{/* end content column */}
        </div>{/* end grid */}

        {/* Footer */}
        <div className="mt-16 text-center pb-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground/50">
            <span>مدعوم بواسطة</span>
            <a href="/" className="font-bold text-foreground/60 hover:text-primary transition-colors">Rukny</a>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {productDetailModal}
      {sharedModals}
      {cartElements}
    </div>
  );
}

// ─── Product Image Slider (shared helper) ──────────────────────────────────────
function ProductImageSlider({ images, name, desktop }: { images: string[]; name: string; desktop?: boolean }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className="relative w-full aspect-square flex items-center justify-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
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
    <div className="flex-1 h-full bg-card sticky top-0">
      {/* Horizontal scrollable images */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'flex overflow-x-auto bg-card scrollbar-hide snap-x snap-mandatory',
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
        <div className="shrink-0 h-[72px] bg-card flex items-center px-2">
          <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide w-full">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={cn(
                  'relative flex-shrink-0 w-[56px] h-[56px] rounded-[10px] overflow-hidden transition-all duration-200',
                  idx === current ? 'ring-2 ring-foreground ring-offset-1' : 'opacity-60 hover:opacity-90'
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
