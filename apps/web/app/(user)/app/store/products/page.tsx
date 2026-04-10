'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, RefreshCw, Plus } from 'lucide-react';
import {
  ProductCard,
  ProductsGridSkeleton,
  StoreFiltersBar,
  ProductDetailsDialog,
} from '@/components/(app)/store';
import {
  useStore,
  Product,
  ProductsFilters,
  ProductsSortOption,
  filterProducts,
  sortProducts,
} from '@/lib/hooks/useStore';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/toast-provider';
import { generateFormSlug } from '@/lib/utils/generateFormSlug';

export default function ProductsPage() {
  const router = useRouter();
  const { getProducts, deleteProduct, toggleProductStatus, isLoading } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductsFilters>({});
  const [sortBy, setSortBy] = useState<ProductsSortOption>('newest');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    const data = await getProducts();
    setProducts(data);
  }, [getProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const filtered = filterProducts(products, filters);
    return sortProducts(filtered, sortBy);
  }, [products, filters, sortBy]);

  const handleCreateProduct = useCallback(() => {
    const slug = generateFormSlug();
    router.push(`/app/store/products/create/${slug}?new=true`);
  }, [router]);

  const handleViewProduct = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      setDetailsOpen(true);
    },
    []
  );

  const handleEditProduct = useCallback(
    (product: Product) => {
      router.push(`/app/store/products/${product.slug}`);
    },
    [router]
  );

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      const success = await deleteProduct(product.id);
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        toast.success('تم حذف المنتج بنجاح');
      } else {
        toast.error('فشل حذف المنتج');
      }
    },
    [deleteProduct]
  );

  const handleToggleStatus = useCallback(
    async (product: Product) => {
      const newStatus = !product.isActive;
      const success = await toggleProductStatus(product.id, newStatus);
      if (success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isActive: newStatus } : p
          )
        );
        toast.success(newStatus ? 'تم نشر المنتج' : 'تم إخفاء المنتج');
      } else {
        toast.error('فشل تحديث حالة المنتج');
      }
    },
    [toggleProductStatus]
  );

  return (
    <div
      className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 gap-4 m-2 md:ms-0"
      dir="rtl"
    >
      <div className="flex-1 min-w-0 bg-card overflow-hidden">
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-4 sm:p-6 space-y-5">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">المنتجات</h1>
                    <p className="text-sm text-muted-foreground">
                      إنشاء وإدارة المنتجات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadProducts}
                    disabled={isLoading}
                    aria-label="تحديث"
                    className={`p-2 sm:p-2.5 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none ${isLoading ? 'animate-spin' : ''}`}
                  >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateProduct}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>منتج جديد</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            {products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StoreFiltersBar
                  filters={filters}
                  onFiltersChange={setFilters}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  resultsCount={filteredProducts.length}
                />
              </motion.div>
            )}

            {/* Content */}
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ProductsGridSkeleton count={8} />
                </motion.div>
              ) : products.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl bg-card border border-border/60 p-12 text-center"
                >
                  <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    لا توجد منتجات
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    لم يتم إضافة أي منتجات بعد
                  </p>
                </motion.div>
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl bg-card border border-border/60 p-8 text-center"
                >
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    لا توجد نتائج
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    جرب تغيير معايير البحث
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <ProductCard
                        product={product}
                        onView={handleViewProduct}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onToggleStatus={handleToggleStatus}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ProductDetailsDialog
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
