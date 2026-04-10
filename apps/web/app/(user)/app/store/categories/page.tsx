'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Layers,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Plus,
  Smartphone,
  Shirt,
  UtensilsCrossed,
  Sparkles,
  Home,
  ShoppingBag,
  Heart,
  BookOpen,
  Dumbbell,
  Baby,
  Car,
  Gamepad2,
  Palette,
  Music,
  Camera,
  Gift,
  Pill,
  Gem,
  Laptop,
  Watch,
  Headphones,
  Dog,
  Flower2,
  Coffee,
  Plane,
  Briefcase,
  Wrench,
  GraduationCap,
  Package,
  Calendar,
  Tag,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton, Pagination } from '@heroui/react';
import { cn } from '@/lib/utils';
import {
  CategoryCard,
} from '@/components/(app)/store/CategoryCard';
import type { ProductCategory } from '@/components/(app)/store/CategoryCard';
import { api } from '@/lib/api';
import { toast } from '@/components/toast-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 12;

// ─── Default colors palette ──────────────────────────────────────
const COLOR_PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f43f5e',
];

// ─── Icon map for dynamic rendering ─────────────────────────────
const CATEGORY_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: 'Layers', icon: Layers, label: 'عام' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'تسوق' },
  { name: 'Smartphone', icon: Smartphone, label: 'إلكترونيات' },
  { name: 'Laptop', icon: Laptop, label: 'حاسوب' },
  { name: 'Headphones', icon: Headphones, label: 'سماعات' },
  { name: 'Watch', icon: Watch, label: 'ساعات' },
  { name: 'Shirt', icon: Shirt, label: 'ملابس' },
  { name: 'Gem', icon: Gem, label: 'مجوهرات' },
  { name: 'Sparkles', icon: Sparkles, label: 'تجميل' },
  { name: 'Heart', icon: Heart, label: 'صحة' },
  { name: 'Pill', icon: Pill, label: 'أدوية' },
  { name: 'Dumbbell', icon: Dumbbell, label: 'رياضة' },
  { name: 'UtensilsCrossed', icon: UtensilsCrossed, label: 'طعام' },
  { name: 'Coffee', icon: Coffee, label: 'مشروبات' },
  { name: 'Home', icon: Home, label: 'منزل' },
  { name: 'Baby', icon: Baby, label: 'أطفال' },
  { name: 'Dog', icon: Dog, label: 'حيوانات' },
  { name: 'Car', icon: Car, label: 'سيارات' },
  { name: 'Gamepad2', icon: Gamepad2, label: 'ألعاب' },
  { name: 'BookOpen', icon: BookOpen, label: 'كتب' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'تعليم' },
  { name: 'Palette', icon: Palette, label: 'فن' },
  { name: 'Music', icon: Music, label: 'موسيقى' },
  { name: 'Camera', icon: Camera, label: 'تصوير' },
  { name: 'Gift', icon: Gift, label: 'هدايا' },
  { name: 'Flower2', icon: Flower2, label: 'زهور' },
  { name: 'Plane', icon: Plane, label: 'سفر' },
  { name: 'Briefcase', icon: Briefcase, label: 'أعمال' },
  { name: 'Wrench', icon: Wrench, label: 'أدوات' },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICONS.map((i) => [i.name, i.icon]),
);

export function getCategoryIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Layers;
  return ICON_MAP[iconName] || Layers;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Create / Edit Dialog ────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Layers',
    color: '#6366f1',
  });
  const [isSaving, setIsSaving] = useState(false);

  // ─── Detail Dialog ───────────────────────────────────────────
  const [detailCategory, setDetailCategory] = useState<ProductCategory | null>(null);

  // ─── Load Categories ─────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<ProductCategory[]>(
        '/stores/my-store/categories',
        { includeInactive: 'true' },
      );
      const data = res.data;
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل التصنيفات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ─── Filtering ───────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    let result = categories;

    if (statusFilter === 'active') {
      result = result.filter((c) => c.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((c) => !c.isActive);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.nameAr?.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [categories, search, statusFilter]);

  // ─── Pagination ──────────────────────────────────────────────
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCategories, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // ─── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive).length;
    const inactive = total - active;
    const totalProducts = categories.reduce((sum, c) => sum + c.productsCount, 0);
    return { total, active, inactive, totalProducts };
  }, [categories]);

  // ─── Dialog Helpers ──────────────────────────────────────────
  const openCreateDialog = useCallback(() => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: 'Layers', color: '#6366f1' });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.nameAr || category.name || '',
      description: category.description || '',
      icon: category.icon || 'Layers',
      color: category.color || '#6366f1',
    });
    setDialogOpen(true);
  }, []);

  const openDetailDialog = useCallback((category: ProductCategory) => {
    setDetailCategory(category);
  }, []);

  // ─── Save (Create or Update) ─────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم التصنيف');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Record<string, string> = {};
      payload.name = formData.name.trim();
      payload.nameAr = formData.name.trim();
      if (formData.description) payload.description = formData.description;
      payload.icon = formData.icon;
      payload.color = formData.color;

      if (editingCategory) {
        const res = await api.put<ProductCategory>(
          `/stores/my-store/categories/${editingCategory.id}`,
          payload,
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? res.data : c)),
        );
        toast.success('تم تحديث التصنيف');
      } else {
        const res = await api.post<ProductCategory>(
          '/stores/my-store/categories',
          payload,
        );
        setCategories((prev) => [...prev, res.data]);
        toast.success('تم إنشاء التصنيف');
      }

      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ التصنيف');
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingCategory]);

  // ─── Toggle Active ────────────────────────────────────────────
  const handleToggleActive = useCallback(async (category: ProductCategory) => {
    try {
      const res = await api.put<ProductCategory>(
        `/stores/my-store/categories/${category.id}/toggle-active`,
      );
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? res.data : c)),
      );
      if (detailCategory?.id === category.id) setDetailCategory(res.data);
      toast.success(res.data.isActive ? 'تم تفعيل التصنيف' : 'تم إخفاء التصنيف');
    } catch {
      toast.error('فشل تغيير حالة التصنيف');
    }
  }, [detailCategory]);

  // ─── Delete ───────────────────────────────────────────────────
  const handleDelete = useCallback(async (category: ProductCategory) => {
    try {
      await api.delete(`/stores/my-store/categories/${category.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      if (detailCategory?.id === category.id) setDetailCategory(null);
      toast.success('تم حذف التصنيف');
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف التصنيف');
    }
  }, [detailCategory]);

  return (
    <div
      className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 gap-4 m-2 md:ms-0"
      dir="rtl"
    >
      <div className="flex-1 min-w-0 bg-card overflow-hidden">
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold text-foreground">التصنيفات</h1>
                  <p className="text-[11px] sm:text-sm text-muted-foreground">
                    تنظيم وتصنيف المنتجات إلى أقسام
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">تصنيف جديد</span>
                </button>

                <button
                  type="button"
                  onClick={loadCategories}
                  disabled={isLoading}
                  aria-label="تحديث"
                  className={cn(
                    'p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                    isLoading && 'animate-spin',
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Section */}
            {!isLoading && categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'إجمالي التصنيفات', value: stats.total, icon: Layers, bg: 'bg-primary/10 dark:bg-primary/5' },
                  { label: 'تصنيفات نشطة', value: stats.active, icon: Eye, bg: 'bg-emerald-500/10 dark:bg-emerald-500/5' },
                  { label: 'تصنيفات مخفية', value: stats.inactive, icon: EyeOff, bg: cn('rounded-2xl', stats.inactive > 0 ? 'bg-amber-500/10 dark:bg-amber-500/5' : 'bg-muted/30 dark:bg-muted/20') },
                  { label: 'إجمالي المنتجات', value: stats.totalProducts, icon: Package, bg: 'bg-indigo-500/10 dark:bg-indigo-500/5' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={`rounded-2xl p-3 sm:p-5 ${s.bg}`}
                  >
                    <p className="text-[11px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">{s.label}</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">{s.value}</h3>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadCategories}
                  disabled={isLoading}
                  className="shrink-0 rounded-xl px-3.5 py-1.5 text-[13px] font-medium bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  إعادة المحاولة
                </button>
              </motion.div>
            )}

            {/* Search & Filter */}
            {!isLoading && categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن تصنيف..."
                    className="w-full h-10 sm:h-11 pr-10 pl-9 rounded-xl bg-muted/30 text-[13px] sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="-mx-1 px-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex gap-1.5 sm:gap-2 w-max sm:w-auto sm:flex-wrap">
                    {[
                      { value: 'all', label: 'الكل', count: categories.length },
                      { value: 'active', label: 'نشط', count: stats.active },
                      { value: 'inactive', label: 'مخفي', count: stats.inactive },
                    ].map((f) => (
                      <motion.button
                        key={f.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setStatusFilter(f.value)}
                        className={cn(
                          'h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all duration-200 select-none whitespace-nowrap flex items-center gap-1.5',
                          statusFilter === f.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/30 dark:bg-muted/20 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {f.label}
                        <span className={cn(
                          'text-[10px] sm:text-[11px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1',
                          statusFilter === f.value ? 'bg-primary-foreground/20' : 'bg-muted/60',
                        )}>
                          {f.count}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Content */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 p-3 space-y-3">
                    <Skeleton className="aspect-[4/3] rounded-xl" />
                    <div className="px-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="w-5 h-5 rounded-md" />
                      </div>
                      <Skeleton className="h-3 w-full rounded-md" />
                      <Skeleton className="h-3 w-2/3 rounded-md" />
                      <div className="flex items-center gap-3 pt-1">
                        <Skeleton className="h-3 w-16 rounded-md" />
                        <Skeleton className="h-3 w-14 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card border border-border/60 p-10 sm:p-14 text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-muted/50 mx-auto mb-4">
                  <Layers className="w-7 h-7 sm:w-9 sm:h-9 text-muted-foreground/30" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
                  لا توجد تصنيفات
                </h3>
                <p className="text-[13px] sm:text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  أضف تصنيفات لتنظيم منتجاتك إلى أقسام مختلفة
                </p>
                <button
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-xs sm:text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة تصنيف جديد
                </button>
              </motion.div>
            ) : filteredCategories.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card border border-border/60 p-8 sm:p-10 text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-3">
                  <Search className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
                  لا توجد نتائج
                </h3>
                <p className="text-[13px] sm:text-sm text-muted-foreground mb-3">
                  جرب تغيير معايير البحث أو التصفية
                </p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  className="text-[13px] text-primary hover:underline font-medium"
                >
                  إعادة تعيين الفلاتر
                </button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {paginatedCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onToggleActive={handleToggleActive}
                        onClick={openDetailDialog}
                        iconResolver={getCategoryIcon}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div dir="ltr">
                    <Pagination size="sm" className="justify-center">
                      <Pagination.Content>
                        <Pagination.Item>
                          <Pagination.Next
                            isDisabled={currentPage === totalPages}
                            onPress={() => setCurrentPage((p) => p + 1)}
                          >
                            <span>التالي</span>
                            <Pagination.NextIcon />
                          </Pagination.Next>
                        </Pagination.Item>
                        {Array.from({ length: totalPages }, (_, i) => totalPages - i).map((p) => (
                          <Pagination.Item key={p}>
                            <Pagination.Link
                              isActive={p === currentPage}
                              onPress={() => setCurrentPage(p)}
                            >
                              {p}
                            </Pagination.Link>
                          </Pagination.Item>
                        ))}
                        <Pagination.Item>
                          <Pagination.Previous
                            isDisabled={currentPage === 1}
                            onPress={() => setCurrentPage((p) => p - 1)}
                          >
                            <Pagination.PreviousIcon />
                            <span>السابق</span>
                          </Pagination.Previous>
                        </Pagination.Item>
                      </Pagination.Content>
                    </Pagination>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Blur */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </div>

      {/* ═══ Category Detail Dialog ═══ */}
      <Dialog open={!!detailCategory} onOpenChange={(open) => !open && setDetailCategory(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden" dir="rtl">
          {detailCategory && (() => {
            const IconComp = getCategoryIcon(detailCategory.icon);
            const displayName = detailCategory.nameAr || detailCategory.name;
            return (
              <>
                <DialogTitle className="sr-only">{displayName}</DialogTitle>
                {/* Hero Header */}
                <div
                  className="relative px-6 pt-8 pb-6"
                  style={{ background: `linear-gradient(135deg, ${detailCategory.color}12, ${detailCategory.color}06)` }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${detailCategory.color}20` }}
                    >
                      <IconComp className="w-7 h-7" style={{ color: detailCategory.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground mb-1 line-clamp-1">
                        {displayName}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            detailCategory.isActive
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {detailCategory.isActive ? 'نشط' : 'مخفي'}
                        </span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          /{detailCategory.slug}
                        </span>
                      </div>
                    </div>
                  </div>
                  {detailCategory.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {detailCategory.description}
                    </p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Products Count */}
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Package className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs text-muted-foreground">المنتجات</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {detailCategory.productsCount}
                      </p>
                    </div>

                    {/* Order */}
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        <span className="text-xs text-muted-foreground">الترتيب</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        #{detailCategory.order + 1}
                      </p>
                    </div>
                  </div>

                  {/* Info List */}
                  <div className="rounded-2xl bg-muted/30 divide-y divide-border/50">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">الرابط المختصر</span>
                      </div>
                      <span className="text-sm font-medium text-foreground" dir="ltr">
                        {detailCategory.slug}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">اللون</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-md border border-border"
                          style={{ backgroundColor: detailCategory.color }}
                        />
                        <span className="text-sm font-medium text-foreground font-mono" dir="ltr">
                          {detailCategory.color}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">تاريخ الإنشاء</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(detailCategory.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">آخر تحديث</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(detailCategory.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        setDetailCategory(null);
                        openEditDialog(detailCategory);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                      تحرير
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => handleToggleActive(detailCategory)}
                    >
                      {detailCategory.isActive ? (
                        <><EyeOff className="w-4 h-4" /> إخفاء</>
                      ) : (
                        <><Eye className="w-4 h-4" /> تفعيل</>
                      )}
                    </Button>
                    {detailCategory.productsCount === 0 && (
                      <Button
                        variant="outline"
                        className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleDelete(detailCategory);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Create / Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'تحرير التصنيف' : 'تصنيف جديد'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'تعديل بيانات التصنيف' : 'إنشاء تصنيف جديد لمنتجاتك'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                اسم التصنيف
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="مثال: إلكترونيات"
                className="w-full mt-2 h-10 px-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                dir="rtl"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                الوصف <span className="text-muted-foreground font-normal">(اختياري)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="وصف مختصر للتصنيف..."
                rows={2}
                className="w-full mt-2 px-3 py-2 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                dir="rtl"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                اللون
              </label>
              <div className="flex mt-2 flex-wrap items-center gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${
                      formData.color === c
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? 'جاري الحفظ...'
                : editingCategory
                  ? 'حفظ التغييرات'
                  : 'إنشاء التصنيف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
