'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Package,
  ImagePlus,
  X,
  Star,
  Loader2,
  Tag,
  DollarSign,
  Layers,
  Info,
  Upload,
  Save,
  Eye,
  EyeOff,
  Shuffle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Input,
  Spinner,
} from '@heroui/react';
import { api } from '@/lib/api';
import { getApiClient } from '@/lib/api/client';
import { toast } from '@/components/toast-provider';
import { useStore } from '@/lib/hooks/useStore';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// ─── Types ──────────────────────────────────────────────────────
interface ProductCategory {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  icon?: string;
  color: string;
  isActive: boolean;
  productsCount: number;
}

interface ImageItem {
  url: string;
  isNew: boolean;
  file?: File;
  isPrimary: boolean;
}

interface DigitalAssetInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  hasPreview: boolean;
}

type ProductStatus = 'ACTIVE' | 'INACTIVE';

// ─── Constants ──────────────────────────────────────────────────
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getProductBySlug, updateProduct } = useStore();

  // ─── Loading State ──────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [productId, setProductId] = useState('');

  // ─── Form State ─────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [trackInventory, setTrackInventory] = useState(true);
  const [isDigital, setIsDigital] = useState(false);

  // ─── Images ─────────────────────────────────────────────────
  const [images, setImages] = useState<ImageItem[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  // ─── Digital File ───────────────────────────────────────────
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [digitalPreviewFile, setDigitalPreviewFile] = useState<File | null>(null);
  const [existingDigitalAsset, setExistingDigitalAsset] = useState<DigitalAssetInfo | null>(null);
  const digitalFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Categories ─────────────────────────────────────────────
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ─── Variants ───────────────────────────────────────────────
  interface EditVariant {
    id?: string;
    attributes: Record<string, string>;
    stock: string;
    isActive: boolean;
  }
  const [hasVariants, setHasVariants] = useState(false);
  const [editVariants, setEditVariants] = useState<EditVariant[]>([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');

  // ─── Auto-calculate quantity from variant stocks ────────────
  useEffect(() => {
    if (hasVariants && editVariants.length > 0) {
      const total = editVariants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      setQuantity(String(total));
    }
  }, [hasVariants, editVariants]);

  // ─── Submit ─────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Load product data ──────────────────────────────────────
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const product = await getProductBySlug(slug);
        if (!product) {
          toast.error('المنتج غير موجود');
          router.replace('/app/store/products');
          return;
        }

        setProductId(product.id);
        setName(product.name);
        setDescription(product.description || '');
        setPrice(String(product.price));
        setSalePrice(product.compareAtPrice ? String(product.compareAtPrice) : '');
        setQuantity(String(product.stock));
        setCategoryId(product.categoryId || '');
        setStatus(product.isActive ? 'ACTIVE' : 'INACTIVE');
        setIsDigital(!!product.isDigital);

        // Load existing digital asset info
        if (product.isDigital) {
          try {
            const assetRes = await api.get<DigitalAssetInfo>(`/products/${product.id}/digital-file`);
            if (assetRes.data) setExistingDigitalAsset(assetRes.data);
          } catch { /* no digital file yet */ }
        }

        // Load existing variants
        if (product.hasVariants && product.variants?.length) {
          setHasVariants(true);
          setEditVariants(
            product.variants.map((v) => ({
              id: v.id,
              attributes: v.attributes,
              stock: String(v.stock),
              isActive: v.isActive !== false,
            }))
          );
        }

        // Load existing images
        if (product.images?.length) {
          setImages(
            product.images.map((url, i) => ({
              url,
              isNew: false,
              isPrimary: i === 0,
            }))
          );
        }
      } catch {
        toast.error('فشل تحميل بيانات المنتج');
        router.replace('/app/store/products');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [slug, getProductBySlug, router]);

  // ─── Load categories ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ProductCategory[]>('/stores/my-store/categories');
        const list = Array.isArray(res.data) ? res.data : [];
        setCategories(list.filter((c) => c.isActive));
      } catch {
        // ignore — categories are optional
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  // ─── Image handling ─────────────────────────────────────────
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast.error(`الحد الأقصى ${MAX_IMAGES} صور`);
        return;
      }

      const valid: ImageItem[] = [];

      for (const file of files.slice(0, remaining)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: نوع الملف غير مدعوم`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: حجم الملف يتجاوز 5MB`);
          continue;
        }
        valid.push({
          url: URL.createObjectURL(file),
          file,
          isNew: true,
          isPrimary: images.length === 0 && valid.length === 0,
        });
      }

      setImages((prev) => [...prev, ...valid]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [images.length],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);

      // Track removed existing images
      if (!removed.isNew) {
        setRemovedImageUrls((r) => [...r, removed.url]);
      } else {
        URL.revokeObjectURL(removed.url);
      }

      // If removed image was primary, make first item primary
      if (removed.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }, []);

  const setPrimaryImage = useCallback((index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index })),
    );
  }, []);

  // ─── Cleanup object URLs on unmount ─────────────────────────
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.isNew) URL.revokeObjectURL(img.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!productId) return;
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum < 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Update product data
      const payload: Record<string, unknown> = {
        name: name.trim(),
        nameAr: name.trim(),
        price: priceNum,
        status,
        trackInventory,
        currency: 'IQD',
      };

      if (description.trim()) {
        payload.description = description.trim();
      } else {
        payload.description = '';
      }
      if (salePrice) {
        const sp = parseFloat(salePrice);
        if (!isNaN(sp) && sp >= 0) payload.salePrice = sp;
      } else {
        payload.salePrice = null;
      }
      // When product has variants, quantity = sum of variant stocks
      if (hasVariants && editVariants.length > 0) {
        payload.quantity = editVariants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      } else if (quantity) {
        const q = parseInt(quantity, 10);
        if (!isNaN(q) && q >= 0) payload.quantity = q;
      }
      if (categoryId) {
        payload.categoryId = categoryId;
      } else {
        payload.categoryId = null;
      }
      payload.isDigital = isDigital;

      // Keep existing non-removed image URLs
      const existingImages = images
        .filter((img) => !img.isNew)
        .map((img) => img.url);
      payload.images = existingImages;

      // Variants
      if (hasVariants && editVariants.length > 0) {
        payload.hasVariants = true;
        payload.variants = editVariants
          .filter((v) => Object.keys(v.attributes).length > 0)
          .map((v) => ({
            price: priceNum,
            stock: parseInt(v.stock, 10) || 0,
            attributes: v.attributes,
            isActive: v.isActive,
          }));
      } else if (!hasVariants) {
        payload.hasVariants = false;
        payload.variants = [];
      }

      const success = await updateProduct(productId, payload);

      if (!success) {
        toast.error('فشل تحديث المنتج');
        return;
      }

      // Step 2: Upload new images (if any)
      const newImages = images.filter((img) => img.isNew && img.file);
      if (newImages.length > 0) {
        try {
          const formData = new FormData();
          newImages.forEach((img) =>
            formData.append('files', img.file!, img.file!.name),
          );

          const client = getApiClient();
          await client.upload(`/products/${productId}/images`, formData);
        } catch {
          toast.warning('تم تحديث المنتج لكن فشل رفع بعض الصور الجديدة');
        }
      }

      // Step 3: Upload digital file (if changed)
      if (isDigital && digitalFile) {
        try {
          const formData = new FormData();
          formData.append('file', digitalFile, digitalFile.name);
          const client = getApiClient();
          await client.upload(`/products/${productId}/digital-file`, formData);
        } catch {
          toast.warning('فشل رفع الملف الرقمي');
        }
      }

      // Step 4: Upload preview file (if changed)
      if (isDigital && digitalPreviewFile) {
        try {
          const formData = new FormData();
          formData.append('file', digitalPreviewFile, digitalPreviewFile.name);
          const client = getApiClient();
          await client.upload(`/products/${productId}/digital-preview`, formData);
        } catch {
          toast.warning('فشل رفع ملف المعاينة');
        }
      }

      toast.success('تم تحديث المنتج بنجاح');
      router.push('/app/store/products');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث المنتج');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    description,
    price,
    salePrice,
    quantity,
    categoryId,
    status,
    trackInventory,
    isDigital,
    digitalFile,
    digitalPreviewFile,
    images,
    hasVariants,
    editVariants,
    productId,
    updateProduct,
    router,
  ]);

  // ─── Page Loading State ─────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 bg-card m-2 md:ms-0 overflow-hidden" dir="rtl">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 gap-4 m-2 md:ms-0"
      dir="rtl"
    >
      <div className="flex flex-col flex-1 min-w-0 bg-card overflow-hidden rounded-2xl border border-border/50">
        {/* ─── Scrollable Content ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-5 sm:p-7 space-y-7 pb-28">
            {/* ─── Header ───────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500 shadow-sm">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-0.5">
                  <h1 className="text-lg font-bold text-foreground leading-tight">
                    تحرير المنتج
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    تعديل بيانات المنتج
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                isIconOnly
                onPress={() => router.back()}
                aria-label="رجوع"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>

            {/* ─── Images Section ───────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <ImagePlus className="w-[18px] h-[18px] text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                  صور المنتج
                </h2>
                <span className="text-[11px] text-muted-foreground mr-auto tabular-nums bg-muted/50 px-2 py-0.5 rounded-md">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3.5">
                {images.map((img, i) => (
                  <div
                    key={img.url}
                    className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-background transition-colors ${img.isPrimary ? 'border-emerald-500' : 'border-border'}`}
                  >
                    <img
                      src={img.url}
                      alt={`صورة ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        رئيسية
                      </span>
                    )}
                    {img.isNew && (
                      <span className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        جديدة
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(i)}
                          className="p-1.5 rounded-lg bg-background/90 text-foreground hover:bg-background transition-colors"
                          title="تعيين كرئيسية"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="p-1.5 rounded-lg bg-background/90 text-red-600 hover:bg-background transition-colors"
                        title="حذف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border bg-background hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] font-medium">إضافة صورة</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {images.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  يمكنك رفع حتى {MAX_IMAGES} صور (JPEG, PNG, WebP). الحد الأقصى
                  5MB لكل صورة.
                </p>
              )}
            </motion.div>

            {/* ─── Basic Info ───────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-[18px] h-[18px] text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                  المعلومات الأساسية
                </h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-name" className="text-[13px] font-medium text-foreground">
                  اسم المنتج <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: هاتف سامسونج S24"
                  dir="rtl"
                  fullWidth
                  className="[&_input]:placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-desc" className="text-[13px] font-medium text-foreground">
                  الوصف{' '}
                  <span className="text-muted-foreground font-normal">
                    (اختياري)
                  </span>
                </Label>
                <textarea
                  id="product-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف تفصيلي للمنتج..."
                  rows={3}
                  className="input w-full px-3.5 py-2.5 rounded-xl text-sm resize-none placeholder:text-muted-foreground/60"
                  dir="rtl"
                />
              </div>
            </motion.div>

            {/* ─── Pricing & Inventory ──────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-[18px] h-[18px] text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                  التسعير والمخزون
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-price" className="text-[13px] font-medium text-foreground">
                    السعر (IQD) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="product-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    min={0}
                    step={250}
                    dir="ltr"
                    fullWidth
                    className="[&_input]:placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-sale-price" className="text-[13px] font-medium text-foreground">
                    سعر التخفيض{' '}
                    <span className="text-muted-foreground font-normal">
                      (اختياري)
                    </span>
                  </Label>
                  <Input
                    id="product-sale-price"
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0"
                    min={0}
                    step={250}
                    dir="ltr"
                    fullWidth
                    className="[&_input]:placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-quantity" className="text-[13px] font-medium text-foreground">
                    الكمية
                  </Label>
                  <Input
                    id="product-quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    min={0}
                    dir="ltr"
                    fullWidth
                    disabled={isDigital || (hasVariants && editVariants.length > 0)}
                    className="[&_input]:placeholder:text-muted-foreground/60"
                  />
                  {isDigital ? (
                    <p className="text-[11px] text-muted-foreground mt-1">المنتجات الرقمية لا تحتاج كمية</p>
                  ) : hasVariants && editVariants.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">يتم حساب الكمية تلقائياً من مخزون المتغيرات</p>
                  ) : null}
                </div>

                {!isDigital && (
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={trackInventory}
                      onClick={() => setTrackInventory(!trackInventory)}
                      className={cn(
                        'relative w-9 h-5 rounded-full transition-colors shrink-0',
                        trackInventory ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                          trackInventory ? 'right-0.5' : 'right-[18px]',
                        )}
                      />
                    </button>
                    <span className="text-[13px] font-medium text-foreground">تتبع المخزون</span>
                  </label>
                </div>
                )}
              </div>
            </motion.div>

            {/* ─── Variants Editor ──────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shuffle className="w-[18px] h-[18px] text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                    المتغيرات (الأحجام والألوان)
                  </h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasVariants}
                    onClick={() => setHasVariants(!hasVariants)}
                    className={cn(
                      'relative w-8 h-[18px] rounded-full transition-colors shrink-0',
                      hasVariants ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform',
                        hasVariants ? 'right-[2px]' : 'right-[16px]',
                      )}
                    />
                  </button>
                  <span className="text-[12px] text-muted-foreground">{hasVariants ? 'مفعّل' : 'معطّل'}</span>
                </label>
              </div>

              {hasVariants && (
                <div className="space-y-4">
                  {/* Existing variants */}
                  {editVariants.length > 0 && (
                    <div className="space-y-2.5">
                      {editVariants.map((variant, idx) => {
                        const attrLabel = Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ');
                        return (
                          <div
                            key={variant.id || idx}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                              variant.isActive ? 'bg-card border-border/50' : 'bg-muted/50 border-border/30 opacity-60',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate">{attrLabel || 'متغير بدون خصائص'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">الكمية:</span>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditVariants((prev) => prev.map((v, i) => i === idx ? { ...v, stock: val } : v));
                                  }}
                                  min={0}
                                  className="w-16 h-8 px-2 rounded-lg border border-border bg-background text-[12px] text-center"
                                  dir="ltr"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditVariants((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add new variant */}
                  <div className="rounded-xl border border-dashed border-border/60 p-3.5 space-y-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">إضافة متغير جديد</p>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-muted-foreground">الخاصية (مثل: اللون)</label>
                        <input
                          type="text"
                          value={newAttrKey}
                          onChange={(e) => setNewAttrKey(e.target.value)}
                          placeholder="اللون"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[12px] placeholder:text-muted-foreground/50"
                          dir="rtl"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-muted-foreground">القيمة (مثل: أحمر)</label>
                        <input
                          type="text"
                          value={newAttrVal}
                          onChange={(e) => setNewAttrVal(e.target.value)}
                          placeholder="أحمر"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[12px] placeholder:text-muted-foreground/50"
                          dir="rtl"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newAttrKey.trim() || !newAttrVal.trim()) return;
                          setEditVariants((prev) => [
                            ...prev,
                            { attributes: { [newAttrKey.trim()]: newAttrVal.trim() }, stock: '0', isActive: true },
                          ]);
                          setNewAttrKey('');
                          setNewAttrVal('');
                        }}
                        disabled={!newAttrKey.trim() || !newAttrVal.trim()}
                        className="shrink-0 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-40 disabled:pointer-events-none hover:bg-primary/90 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      يمكنك إضافة عدة متغيرات مثل: اللون/أحمر، المقاس/كبير، إلخ.
                    </p>
                  </div>

                  {editVariants.length === 0 && (
                    <p className="text-[12px] text-muted-foreground text-center py-2">
                      لا توجد متغيرات حالياً. أضف متغيراً جديداً أعلاه.
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* ─── Category & Status ────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-[18px] h-[18px] text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                  التصنيف والحالة
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* ─── Category Select ─── */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">
                    التصنيف
                  </label>
                  {categoriesLoading ? (
                    <div className="h-11 rounded-xl bg-muted animate-pulse" />
                  ) : categories.length === 0 ? (
                    <div className="h-11 flex items-center px-1">
                      <button
                        type="button"
                        onClick={() => router.push('/app/store/categories')}
                        className="text-[13px] text-primary hover:underline"
                      >
                        أنشئ تصنيفاً أولاً
                      </button>
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-[13px] text-foreground cursor-pointer hover:bg-muted/30 transition-colors appearance-none"
                      dir="rtl"
                    >
                      <option value="">بدون تصنيف</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr || c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* ─── Status Toggle ─── */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">
                    الحالة
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('ACTIVE' as ProductStatus)}
                      className={cn(
                        'flex-1 h-11 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-2 transition-colors',
                        status === 'ACTIVE'
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      نشط
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('INACTIVE' as ProductStatus)}
                      className={cn(
                        'flex-1 h-11 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-2 transition-colors',
                        status === 'INACTIVE'
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-600'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      مخفي
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ─── Digital Product ──────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl bg-muted/30 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-[18px] h-[18px] text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
                    منتج رقمي
                  </h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIsDigital(!isDigital)}
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors',
                      isDigital ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-transform',
                        isDigital ? 'right-[2px]' : 'right-[18px]',
                      )}
                    />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {isDigital ? 'مفعّل' : 'معطّل'}
                  </span>
                </label>
              </div>

              {isDigital && (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    ارفع ملفك الرقمي (PDF, EPUB, ZIP, MP3...) — حتى 100MB.
                  </p>

                  {/* Existing file info */}
                  {existingDigitalAsset && !digitalFile && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                      <Package className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{existingDigitalAsset.fileName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {(existingDigitalAsset.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => digitalFileInputRef.current?.click()}
                        className="text-[11px] text-primary hover:underline shrink-0"
                      >
                        تغيير
                      </button>
                    </div>
                  )}

                  {/* Upload area */}
                  {(!existingDigitalAsset || digitalFile) && (
                    <div
                      onClick={() => digitalFileInputRef.current?.click()}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                        digitalFile
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/60 hover:border-primary/30 hover:bg-muted/30',
                      )}
                    >
                      {digitalFile ? (
                        <>
                          <div className="flex items-center gap-2 text-primary">
                            <Package className="w-5 h-5" />
                            <span className="text-[13px] font-medium">{digitalFile.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {(digitalFile.size / 1024 / 1024).toFixed(2)} MB — انقر لتغيير
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-[12px] text-muted-foreground">
                            اضغط لرفع الملف الرقمي
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={digitalFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.epub,.zip,.mp3,.mp4,.docx,.xlsx,.pptx,.wav"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 100 * 1024 * 1024) {
                          toast.error('الحد الأقصى للملف 100MB');
                          return;
                        }
                        setDigitalFile(file);
                      }
                    }}
                  />

                  {/* Preview file */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-medium">
                      ملف معاينة (اختياري)
                      {existingDigitalAsset?.hasPreview && ' — يوجد ملف معاينة حالي'}
                    </label>
                    <input
                      type="file"
                      className="w-full text-[12px] text-muted-foreground file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-muted file:text-foreground file:text-[11px] file:font-medium file:cursor-pointer"
                      accept=".pdf,.epub,.mp3"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('الحد الأقصى لملف المعاينة 10MB');
                            return;
                          }
                          setDigitalPreviewFile(file);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                      الملف محمي — كل مشتري يحصل على 5 تحميلات كحد أقصى، صالحة لمدة 30 يوماً.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ─── Floating Bottom Bar ─────────────────────────────── */}
        <div className="shrink-0 p-3.5 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-between gap-4 rounded-2xl bg-muted/30 backdrop-blur-xl px-5 py-3.5"
          >
            <Button
              variant="ghost"
              onPress={() => router.back()}
              isDisabled={isSubmitting}
            >
              إلغاء
            </Button>

            <Button
              variant="primary"
              onPress={handleSubmit}
              isDisabled={isSubmitting || !name.trim() || !price}
              isPending={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
