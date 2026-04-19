'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Package,
  ImagePlus,
  X,
  Star,
  Layers,
  Info,
  Upload,
  Eye,
  EyeOff,
  Settings2,
  Shuffle,
  CircleCheck,
} from 'lucide-react';
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

// ─── Shared input class ─────────────────────────────────────────
const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all';

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

const STEPS = [
  { id: 1, title: 'المعلومات الأساسية' },
  { id: 2, title: 'التسعير والمخزون' },
  { id: 3, title: 'خيارات إضافية' },
] as const;
const TOTAL_STEPS = STEPS.length;

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
  const [currentStep, setCurrentStep] = useState(1);
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

  // ─── Step navigation ─────────────────────────────────────────
  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 = !!price && !isNaN(parseFloat(price)) && parseFloat(price) >= 0;
  const isLastStep = currentStep === TOTAL_STEPS;

  const handleNext = useCallback(() => {
    if (currentStep === 1 && !canProceedStep1) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }
    if (currentStep === 2 && !canProceedStep2) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [currentStep, canProceedStep1, canProceedStep2, isLastStep, handleSubmit]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  return (
    <div className="relative flex h-full flex-1 min-w-0 bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* ─── Top Bar ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 z-20"
        >
          <Link
            href="/app/store/products"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-background/60 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all duration-200 text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-medium">العودة للمنتجات</span>
          </Link>
        </motion.div>

        <div className="p-3 sm:p-5 pt-14 sm:pt-5">
          <div className="max-w-xl w-full mx-auto">
            {/* ─── Step Progress Dots ──────────────────────── */}
            <div className="flex items-center justify-center mb-8 mt-4">
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={false}
                    animate={{
                      width: step.id === currentStep ? 24 : 6,
                      opacity: step.id <= currentStep ? 1 : 0.3,
                    }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={cn(
                      'h-1.5 rounded-full',
                      step.id <= currentStep ? 'bg-foreground' : 'bg-muted-foreground/30',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums mr-2">
                {currentStep}/{TOTAL_STEPS}
              </span>
            </div>

            {/* ─── Step Content ─────────────────────────────── */}
            <div className="px-1 sm:px-4">
              <AnimatePresence mode="wait">
                {/* ═══ Step 1: Basic Info + Images ═══ */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Step Header */}
                    <div>
                      <p className="text-xs bg-primary/10 text-primary font-medium px-3 py-1 rounded-full mb-3 inline-block">
                        الخطوة 1 من {TOTAL_STEPS}
                      </p>
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
                        المعلومات الأساسية
                      </h2>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        أدخل اسم المنتج ووصفه وأضف الصور
                      </p>
                    </div>

                    {/* Product Name */}
                    <div className="space-y-2">
                      <label htmlFor="product-name" className="text-sm font-medium text-foreground">
                        اسم المنتج <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="product-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: هاتف سامسونج S24"
                        dir="rtl"
                        className={inputClass}
                        autoFocus
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label htmlFor="product-desc" className="text-sm font-medium text-foreground">
                        الوصف{' '}
                        <span className="text-muted-foreground font-normal text-xs">(اختياري)</span>
                      </label>
                      <textarea
                        id="product-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="وصف تفصيلي للمنتج..."
                        rows={3}
                        className={cn(inputClass, 'h-auto py-3 resize-none')}
                        dir="rtl"
                      />
                    </div>

                    {/* Images */}
                    <div className="rounded-2xl bg-muted/30 p-5 space-y-4">
                      <div className="flex items-center gap-2.5">
                        <ImagePlus className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">صور المنتج</h3>
                        <span className="text-[11px] text-muted-foreground mr-auto tabular-nums bg-background/60 px-2 py-0.5 rounded-lg border border-border/30">
                          {images.length}/{MAX_IMAGES}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {images.map((img, i) => (
                          <div
                            key={img.url}
                            className={cn(
                              'relative group aspect-square rounded-xl overflow-hidden border-2 bg-muted/30 transition-all',
                              img.isPrimary
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'border-transparent hover:border-border',
                            )}
                          >
                            <img
                              src={img.url}
                              alt={`صورة ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {img.isPrimary && (
                              <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                                رئيسية
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {!img.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(i)}
                                  className="p-1.5 rounded-lg bg-white/90 text-foreground hover:bg-white transition-colors shadow-sm"
                                  title="تعيين كرئيسية"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="p-1.5 rounded-lg bg-white/90 text-red-600 hover:bg-white transition-colors shadow-sm"
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
                            className="aspect-square rounded-xl border-2 border-dashed border-border/50 bg-background/50 hover:bg-background hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Upload className="w-5 h-5" />
                            <span className="text-[11px] font-medium">إضافة</span>
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
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          يمكنك رفع حتى {MAX_IMAGES} صور (JPEG, PNG, WebP). الحد الأقصى 5MB لكل صورة.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ═══ Step 2: Pricing, Inventory, Category & Status ═══ */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Step Header */}
                    <div>
                      <p className="text-xs bg-primary/10 text-primary font-medium px-3 py-1 rounded-full mb-3 inline-block">
                        الخطوة 2 من {TOTAL_STEPS}
                      </p>
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
                        التسعير والمخزون
                      </h2>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        حدد سعر المنتج والكمية المتوفرة والتصنيف
                      </p>
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="product-price" className="text-sm font-medium text-foreground">
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
                          className={cn(inputClass, 'text-left')}
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="product-sale-price" className="text-sm font-medium text-foreground">
                          سعر التخفيض{' '}
                          <span className="text-muted-foreground font-normal text-xs">(اختياري)</span>
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
                          className={cn(inputClass, 'text-left')}
                        />
                      </div>
                    </div>

                    {/* Quantity + Track Inventory */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="product-quantity" className="text-sm font-medium text-foreground">
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
                          className={cn(inputClass, 'text-left disabled:opacity-50 disabled:cursor-not-allowed')}
                        />
                        {isDigital ? (
                          <p className="text-xs text-muted-foreground">المنتجات الرقمية لا تحتاج كمية</p>
                        ) : templateFields?.hasVariants && variants.length > 0 ? (
                          <p className="text-xs text-muted-foreground">يتم حساب الكمية تلقائياً من مخزون المتغيرات</p>
                        ) : null}
                      </div>

                      {!isDigital && (
                        <div className="flex items-end pb-1.5">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={trackInventory}
                              onClick={() => setTrackInventory(!trackInventory)}
                              className={cn(
                                'relative w-10 h-[22px] rounded-full transition-colors shrink-0',
                                trackInventory ? 'bg-emerald-500' : 'bg-muted-foreground/25',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                                  trackInventory ? 'right-[3px]' : 'right-[21px]',
                                )}
                              />
                            </button>
                            <span className="text-sm font-medium text-foreground">تتبع المخزون</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Category & Status */}
                    <div className="rounded-2xl bg-muted/30 p-5 space-y-5">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">التصنيف والحالة</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="product-category" className="text-sm font-medium text-foreground">
                            التصنيف
                          </label>
                          {categoriesLoading ? (
                            <div className="h-11 rounded-xl bg-muted/50 animate-pulse" />
                          ) : categories.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => router.push('/app/store/categories')}
                              className="flex items-center gap-2 w-full h-11 px-3.5 rounded-xl border border-dashed border-border/60 bg-background text-sm text-primary hover:bg-muted/30 transition-colors"
                            >
                              <Layers className="w-4 h-4" />
                              أنشئ تصنيفاً أولاً
                            </button>
                          ) : (
                            <select
                              id="product-category"
                              value={categoryId}
                              onChange={(e) => setCategoryId(e.target.value)}
                              className={cn(inputClass, 'appearance-none cursor-pointer pe-3')}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'left 0.75rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.25em 1.25em',
                                paddingLeft: '2.5rem',
                              }}
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

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">الحالة</label>
                          <div className="flex h-11 rounded-xl border border-border/60 bg-background p-1 gap-1">
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
                              نشط
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
                              مخفي
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ═══ Step 3: Digital, Variants, Attributes ═══ */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Step Header */}
                    <div>
                      <p className="text-xs bg-primary/10 text-primary font-medium px-3 py-1 rounded-full mb-3 inline-block">
                        الخطوة 3 من {TOTAL_STEPS}
                      </p>
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
                        خيارات إضافية
                      </h2>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        أضف خيارات المنتج الرقمي والمتغيرات والخصائص (اختياري)
                      </p>
                    </div>

                    {/* Digital Product */}
                    <div className="rounded-2xl bg-muted/30 p-5 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-foreground">منتج رقمي</h3>
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <button
                            type="button"
                            onClick={() => setIsDigital(!isDigital)}
                            className={cn(
                              'relative w-10 h-[22px] rounded-full transition-colors',
                              isDigital ? 'bg-primary' : 'bg-muted-foreground/25',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                                isDigital ? 'right-[3px]' : 'right-[21px]',
                              )}
                            />
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {isDigital ? 'مفعّل' : 'معطّل'}
                          </span>
                        </label>
                      </div>

                      {isDigital && (
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            ارفع ملفك الرقمي (PDF, EPUB, ZIP, MP3...) — حتى 100MB.
                          </p>

                          <div
                            onClick={() => digitalFileInputRef.current?.click()}
                            className={cn(
                              'flex flex-col items-center justify-center gap-2.5 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                              digitalFile
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border/50 hover:border-primary/30 hover:bg-background/50',
                            )}
                          >
                            {digitalFile ? (
                              <>
                                <div className="flex items-center gap-2.5 text-primary">
                                  <Package className="w-5 h-5" />
                                  <span className="text-sm font-medium">{digitalFile.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {(digitalFile.size / 1024 / 1024).toFixed(2)} MB — انقر لتغيير الملف
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">اضغط لرفع الملف الرقمي</span>
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

                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground font-medium">
                              ملف معاينة (اختياري) — أول صفحات أو عينة مجانية
                            </label>
                            <input
                              type="file"
                              className="w-full text-xs text-muted-foreground file:me-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-background file:text-foreground file:text-xs file:font-medium file:cursor-pointer file:shadow-sm"
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

                          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                              الملف محمي — لن يتمكن أحد من تحميله إلا بعد الشراء. كل مشتري يحصل على 5 تحميلات كحد أقصى، صالحة لمدة 30 يوماً.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variants */}
                    {templateFields?.hasVariants && templateFields.variantAttributes && (
                      <div className="rounded-2xl bg-muted/30 p-5 space-y-5">
                        <div className="flex items-center gap-2.5">
                          <Shuffle className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-foreground">
                            المتغيرات (الأحجام والألوان)
                          </h3>
                        </div>
                        <ProductVariantsEditor
                          variantAttributes={templateFields.variantAttributes}
                          variants={variants}
                          onVariantsChange={setVariants}
                        />
                      </div>
                    )}

                    {/* Dynamic Attributes */}
                    {templateFields?.productAttributes && templateFields.productAttributes.length > 0 && (
                      <div className="rounded-2xl bg-muted/30 p-5 space-y-5">
                        <div className="flex items-center gap-2.5">
                          <Settings2 className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-foreground">خصائص المنتج</h3>
                        </div>
                        <DynamicAttributesForm
                          fields={templateFields.productAttributes}
                          values={attributeValues}
                          onValuesChange={setAttributeValues}
                        />
                      </div>
                    )}

                    {/* Empty state when no extra options */}
                    {!isDigital && !templateFields?.hasVariants && (!templateFields?.productAttributes || templateFields.productAttributes.length === 0) && (
                      <div className="rounded-2xl bg-muted/20 p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          يمكنك تفعيل المنتج الرقمي أعلاه، أو المتابعة لإنشاء المنتج مباشرة.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Bottom Navigation ───────────────────────── */}
            <div className="mt-10 mb-8">
              <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-full max-w-md mx-auto">
                  <motion.div
                    className="flex items-center gap-2"
                    animate={{
                      justifyContent: currentStep > 1 ? 'space-between' : 'stretch',
                    }}
                  >
                    {currentStep > 1 && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, width: 0, scale: 0.8 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 15,
                          mass: 0.8,
                          bounce: 0.25,
                          duration: 0.6,
                          opacity: { duration: 0.2 },
                        }}
                        onClick={handleBack}
                        disabled={isSubmitting}
                        className="px-6 py-3 text-foreground flex items-center justify-center gap-2 bg-muted/50 font-medium rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="h-4 w-4" />
                        <span className="text-sm">السابق</span>
                      </motion.button>
                    )}

                    <motion.button
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      animate={{
                        flex: currentStep > 1 ? 'initial' : 1,
                      }}
                      className={cn(
                        'px-6 py-3 rounded-full text-background bg-foreground font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
                        currentStep > 1 ? 'flex-1' : 'w-full',
                      )}
                    >
                      <div className="flex items-center font-medium justify-center gap-2 text-sm">
                        {isLastStep && !isSubmitting && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 15,
                              mass: 0.5,
                              bounce: 0.4,
                            }}
                          >
                            <CircleCheck className="h-4 w-4" />
                          </motion.div>
                        )}
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full"
                            />
                            جاري الإنشاء...
                          </span>
                        ) : isLastStep ? (
                          'إنشاء المنتج'
                        ) : (
                          'التالي'
                        )}
                      </div>
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
