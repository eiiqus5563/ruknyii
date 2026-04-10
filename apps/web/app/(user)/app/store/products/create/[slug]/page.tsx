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
  Tag,
  DollarSign,
  Layers,
  Info,
  Upload,
  Eye,
  EyeOff,
  Settings2,
  Shuffle,
} from 'lucide-react';
import {
  Button,
  Spinner,
} from '@heroui/react';
import { api } from '@/lib/api';
import { getApiClient } from '@/lib/api/client';
import { toast } from '@/components/toast-provider';
import { cn } from '@/lib/utils';
import { isValidFormSlug } from '@/lib/utils/generateFormSlug';
import {
  ProductVariantsEditor,
  type VariantAttribute,
  type ProductVariant,
} from '@/components/(app)/store/ProductVariantsEditor';
import {
  DynamicAttributesForm,
  type TemplateField,
} from '@/components/(app)/store/DynamicAttributesForm';

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

interface ImagePreview {
  file: File;
  url: string;
  isPrimary: boolean;
}

type ProductStatus = 'ACTIVE' | 'INACTIVE';

interface StoreTemplateFields {
  hasVariants?: boolean;
  variantAttributes?: VariantAttribute[];
  productAttributes?: TemplateField[];
}

// ─── Constants ──────────────────────────────────────────────────
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function CreateProductSlugPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Validate slug ──────────────────────────────────────────
  useEffect(() => {
    if (!slug || !isValidFormSlug(slug)) {
      router.replace('/app/store/products/create');
    }
  }, [slug, router]);

  // ─── Form State ─────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [trackInventory, setTrackInventory] = useState(true);
  const [isDigital, setIsDigital] = useState(false);

  // ─── Images ─────────────────────────────────────────────────
  const [images, setImages] = useState<ImagePreview[]>([]);

  // ─── Digital File ───────────────────────────────────────────
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [digitalPreviewFile, setDigitalPreviewFile] = useState<File | null>(null);
  const digitalFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Categories ─────────────────────────────────────────────
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ─── Template Fields (from store category) ──────────────────
  const [templateFields, setTemplateFields] = useState<StoreTemplateFields | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

  // ─── Submit ─────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Auto-calculate quantity from variant stocks ────────────
  useEffect(() => {
    if (templateFields?.hasVariants && variants.length > 0) {
      const total = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      setQuantity(String(total));
    }
  }, [templateFields?.hasVariants, variants]);

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

  // ─── Load store template fields ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ store_categories?: { templateFields?: StoreTemplateFields } }>(
          '/stores/my-store',
        );
        const tf = res.data?.store_categories?.templateFields;
        if (tf) setTemplateFields(tf);
      } catch {
        // template fields are optional
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

      const valid: ImagePreview[] = [];

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
          file,
          url: URL.createObjectURL(file),
          isPrimary: images.length === 0 && valid.length === 0,
        });
      }

      setImages((prev) => [...prev, ...valid]);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [images.length],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Revoke the removed URL
      URL.revokeObjectURL(prev[index].url);
      // If removed image was primary, make first item primary
      if (prev[index].isPrimary && next.length > 0) {
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
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Validation
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
      // Step 1: Create product
      const payload: Record<string, unknown> = {
        name: name.trim(),
        nameAr: name.trim(),
        price: priceNum,
        status,
        trackInventory,
        currency: 'IQD',
      };

      if (description.trim()) payload.description = description.trim();
      if (salePrice) {
        const sp = parseFloat(salePrice);
        if (!isNaN(sp) && sp >= 0) payload.salePrice = sp;
      }
      // When product has variants, quantity = sum of variant stocks
      if (templateFields?.hasVariants && variants.length > 0) {
        payload.quantity = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      } else if (quantity) {
        const q = parseInt(quantity, 10);
        if (!isNaN(q) && q >= 0) payload.quantity = q;
      }
      if (categoryId) payload.categoryId = categoryId;
      if (isDigital) payload.isDigital = true;

      // Variants
      if (templateFields?.hasVariants && variants.length > 0) {
        payload.hasVariants = true;
        payload.variants = variants.map((v) => ({
          price: priceNum,
          stock: parseInt(v.stock, 10) || 0,
          attributes: v.attributes,
          isActive: true,
        }));
      }

      // Product attributes
      const attrEntries = Object.entries(attributeValues).filter(
        ([, val]) => val.trim() !== '',
      );
      if (attrEntries.length > 0) {
        payload.productAttributes = attrEntries.map(([key, value]) => ({
          key,
          value,
        }));
      }

      const res = await api.post<{ id: string }>('/products', payload);
      const productId = res.data?.id;

      if (!productId) {
        toast.error('فشل إنشاء المنتج');
        return;
      }

      // Step 2: Upload images (if any)
      if (images.length > 0) {
        try {
          const formData = new FormData();
          // Add primary image first for correct ordering
          const sorted = [...images].sort((a, b) =>
            a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1,
          );
          sorted.forEach((img) =>
            formData.append('files', img.file, img.file.name),
          );

          const client = getApiClient();
          await client.upload(`/products/${productId}/images`, formData);
        } catch {
          toast.warning('تم إنشاء المنتج لكن فشل رفع بعض الصور');
        }
      }

      // Step 3: Upload digital file (if digital product)
      if (isDigital && digitalFile) {
        try {
          const formData = new FormData();
          formData.append('file', digitalFile, digitalFile.name);
          const client = getApiClient();
          await client.upload(`/products/${productId}/digital-file`, formData);
        } catch {
          toast.warning('تم إنشاء المنتج لكن فشل رفع الملف الرقمي');
        }
      }

      // Step 4: Upload preview file (if provided)
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

      toast.success('تم إنشاء المنتج بنجاح');
      router.push('/app/store/products');
    } catch (err: any) {
      toast.error(err?.message || 'فشل إنشاء المنتج');
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
    router,
    templateFields,
    variants,
    attributeValues,
  ]);

  return (
    <div
      className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 gap-4 m-2 md:ms-0"
      dir="rtl"
    >
      <div className="flex flex-col flex-1 min-w-0 bg-card overflow-hidden rounded-2xl border border-border/50">
        {/* ─── Scrollable Content ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-4 sm:p-6 space-y-4 pb-28">
            {/* ─── Header ───────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground leading-tight">
                    منتج جديد
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    إضافة منتج جديد إلى متجرك
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
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  صور المنتج
                </h2>
                <span className="text-[10px] text-muted-foreground mr-auto tabular-nums bg-muted/60 px-1.5 py-0.5 rounded-md">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {images.map((img, i) => (
                  <div
                    key={img.url}
                    className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-muted/20 transition-colors ${img.isPrimary ? 'border-emerald-500' : 'border-border/50'}`}
                  >
                    <img
                      src={img.url}
                      alt={`صورة ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                        رئيسية
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
                    className="aspect-square rounded-xl border-2 border-dashed border-border/60 bg-muted/10 hover:bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Upload className="w-4 h-4" />
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  يمكنك رفع حتى {MAX_IMAGES} صور (JPEG, PNG, WebP). الحد الأقصى
                  5MB لكل صورة.
                </p>
              )}
            </motion.section>

            {/* ─── Basic Info ───────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  المعلومات الأساسية
                </h2>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="product-name" className="text-[13px] font-medium text-foreground">
                  اسم المنتج <span className="text-destructive">*</span>
                </label>
                <input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: هاتف سامسونج S24"
                  dir="rtl"
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="product-desc" className="text-[13px] font-medium text-foreground">
                  الوصف{' '}
                  <span className="text-muted-foreground font-normal text-xs">
                    (اختياري)
                  </span>
                </label>
                <textarea
                  id="product-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف تفصيلي للمنتج..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  dir="rtl"
                />
              </div>
            </motion.section>

            {/* ─── Pricing & Inventory ──────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  التسعير والمخزون
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="product-price" className="text-[13px] font-medium text-foreground">
                    السعر (IQD) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="25,000"
                    min={0}
                    step={250}
                    dir="ltr"
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-left"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="product-sale-price" className="text-[13px] font-medium text-foreground">
                    سعر التخفيض{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      (اختياري)
                    </span>
                  </label>
                  <input
                    id="product-sale-price"
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="20,000"
                    min={0}
                    step={250}
                    dir="ltr"
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-left"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="product-quantity" className="text-[13px] font-medium text-foreground">
                    الكمية
                  </label>
                  <input
                    id="product-quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    min={0}
                    dir="ltr"
                    disabled={isDigital || !!(templateFields?.hasVariants && variants.length > 0)}
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {isDigital ? (
                    <p className="text-[11px] text-muted-foreground mt-1">المنتجات الرقمية لا تحتاج كمية</p>
                  ) : templateFields?.hasVariants && variants.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">يتم حساب الكمية تلقائياً من مخزون المتغيرات</p>
                  ) : null}
                </div>

                {!isDigital && (
                <div className="flex items-end pb-2">
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
            </motion.section>

            {/* ─── Category & Status ────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  التصنيف والحالة
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* ─── Category Select ─── */}
                <div className="space-y-1.5">
                  <label htmlFor="product-category" className="text-[13px] font-medium text-foreground">
                    التصنيف
                  </label>
                  {categoriesLoading ? (
                    <div className="h-11 rounded-xl bg-muted/40 animate-pulse" />
                  ) : categories.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => router.push('/app/store/categories')}
                      className="flex items-center gap-1.5 w-full h-11 px-3.5 rounded-xl border border-dashed border-border bg-background text-[13px] text-primary hover:bg-muted/30 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      أنشئ تصنيفاً أولاً
                    </button>
                  ) : (
                    <select
                      id="product-category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'left 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingLeft: '2.5rem' }}
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
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">
                    الحالة
                  </label>
                  <div className="flex h-11 rounded-xl border border-border bg-background p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setStatus('ACTIVE')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all',
                        status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>نشط</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('INACTIVE')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all',
                        status === 'INACTIVE'
                          ? 'bg-muted text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>مخفي</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ─── Digital Product ──────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground">
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
                    ارفع ملفك الرقمي (PDF, EPUB, ZIP, MP3...) — حتى 100MB. سيتمكن المشتري من تحميله بعد الدفع.
                  </p>

                  {/* Digital File Upload */}
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
                          {(digitalFile.size / 1024 / 1024).toFixed(2)} MB — انقر لتغيير الملف
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

                  {/* Preview File (optional) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-medium">
                      ملف معاينة (اختياري) — أول صفحات أو عينة مجانية
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
                      الملف محمي — لن يتمكن أحد من تحميله إلا بعد الشراء. كل مشتري يحصل على 5 تحميلات كحد أقصى، صالحة لمدة 30 يوماً.
                    </p>
                  </div>
                </div>
              )}
            </motion.section>

            {/* ─── Variant Options (if category supports) ───── */}
            {templateFields?.hasVariants && templateFields.variantAttributes && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground">
                    المتغيرات (الأحجام والألوان)
                  </h2>
                </div>

                <ProductVariantsEditor
                  variantAttributes={templateFields.variantAttributes}
                  variants={variants}
                  onVariantsChange={setVariants}
                />
              </motion.section>
            )}

            {/* ─── Dynamic Product Attributes ───────────────── */}
            {templateFields?.productAttributes && templateFields.productAttributes.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-border/40 p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground">
                    خصائص المنتج
                  </h2>
                </div>

                <DynamicAttributesForm
                  fields={templateFields.productAttributes}
                  values={attributeValues}
                  onValuesChange={setAttributeValues}
                />
              </motion.section>
            )}
          </div>
        </div>

        {/* ─── Floating Bottom Bar ─────────────────────────────── */}
        <div className="shrink-0 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/80 backdrop-blur-xl px-4 py-3"
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
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  إنشاء المنتج
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
