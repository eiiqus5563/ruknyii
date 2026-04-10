'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Image,
  Package,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIQD } from '@/lib/currency';
import { Product, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_CONFIG } from '@/lib/hooks/useStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onView?: (product: Product) => void;
  onToggleStatus?: (product: Product) => void;
}

function ProductCardComponent({
  product,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}: ProductCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusKey = product.isActive ? 'active' : 'draft';
  const statusConfig = PRODUCT_STATUS_CONFIG[statusKey];
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const images = product.images ?? [];
  const mainImage = images[currentImageIndex] ?? images[0];

  const stopImageRotation = () => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
  };

  const handleImageHoverStart = () => {
    if (images.length <= 1) return;

    stopImageRotation();
    rotationIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1800);
  };

  const handleImageHoverEnd = () => {
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
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-2xl border border-border/60 p-3 group cursor-pointer hover:shadow-lg hover:border-border transition-all duration-300 h-full flex flex-col"
      onClick={() => onView?.(product)}
      onMouseEnter={handleImageHoverStart}
      onMouseLeave={handleImageHoverEnd}
    >
      {/* Image/Icon Section */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 shrink-0">
        {mainImage ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={`${product.id}-${currentImageIndex}`}
                src={mainImage}
                alt={product.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm z-20">
                {images.map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      'block rounded-full transition-all duration-300',
                      index === currentImageIndex ? 'h-1.5 w-4 bg-white' : 'h-1.5 w-1.5 bg-white/60'
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-gradient-to-br from-muted/50 via-card to-muted"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              "bg-card shadow-md",
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Status Badge - Top Right */}
        <span className={cn(
          "absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold",
          "backdrop-blur-md shadow-sm",
          statusConfig.bg,
          statusConfig.color,
        )}>
          {PRODUCT_STATUS_LABELS[statusKey]}
        </span>

        {/* Discount Badge - Top Left */}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/90 backdrop-blur-md text-white shadow-sm">
            خصم
          </span>
        )}

        {/* Stock Warning Badge - Bottom Left */}
        {product.stock <= 5 && product.stock > 0 && (
          <span className={cn(
            "absolute bottom-2.5 left-2.5 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm",
            "bg-amber-400/90 backdrop-blur-md"
          )}>
            <span className="text-[9px] font-bold text-white">{product.stock}</span>
          </span>
        )}
        {product.stock === 0 && (
          <span className={cn(
            "absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm",
            "bg-red-500/90 backdrop-blur-md text-white"
          )}>
            نفذ
          </span>
        )}

        {/* Actions Menu - Bottom Right */}
        <div className="absolute bottom-2.5 right-2.5 z-30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center",
                  "bg-background/90 backdrop-blur-sm shadow-sm",
                  "text-muted-foreground hover:text-foreground hover:bg-background",
                  "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
                  "transition-all duration-200"
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={4}
              className="min-w-[130px] rounded-xl p-1"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                  <Edit2 className="w-3.5 h-3.5" />
                  تحرير
                </DropdownMenuItem>
              )}
              {onToggleStatus && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(product); }}>
                  {product.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {product.isActive ? 'إخفاء' : 'نشر'}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Section */}
      <div className="text-right px-1 flex flex-col">
        {/* Name & Price Badge Row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-foreground text-[14px] leading-tight line-clamp-1 flex-1 min-w-0">
            {product.name}
          </h3>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap border shrink-0",
            hasDiscount
              ? "text-rose-500 bg-rose-500/10 border-rose-500/15"
              : "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
          )}>
            {formatIQD(product.price)}
          </span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
          {product.description || 'بدون وصف'}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
          {/* Price with discount */}
          {hasDiscount ? (
            <span className="flex items-center gap-1 text-rose-500 font-medium">
              <Tag className="w-3 h-3" />
              <span className="line-through text-muted-foreground/60">{formatIQD(product.compareAtPrice!)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {product.category?.name || 'بدون تصنيف'}
            </span>
          )}

          <span className="w-px h-3 bg-border" />

          {/* Stock */}
          <span className={cn(
            "flex items-center gap-1",
            product.stock <= 5 && product.stock > 0 && "text-amber-500 font-medium",
            product.stock === 0 && "text-red-500 font-medium"
          )}>
            <ShoppingCart className="w-3 h-3" />
            {product.stock}
          </span>

          <span className="w-px h-3 bg-border" />

          {/* Images count */}
          <span className="flex items-center gap-1">
            <Image className="w-3 h-3" />
            {product.images?.length || 0}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent
            showCloseButton={false}
            onClick={(e) => e.stopPropagation()}
            className="text-center"
          >
            <DialogHeader className="items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle>حذف المنتج</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف - {product.name}
                <br />
                لا يمكن التراجع عن هذا الإجراء
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:justify-center">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">إلغاء</Button>
              </DialogClose>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(false);
                  onDelete(product);
                }}
              >
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-3 animate-pulse">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/60 to-muted rounded-xl mb-3" />
      <div className="text-right px-1">
        <div className="h-4 bg-muted rounded-md w-3/4 mb-1.5" />
        <div className="space-y-1.5 mb-3">
          <div className="h-3 bg-muted/60 rounded-md w-full" />
          <div className="h-3 bg-muted/60 rounded-md w-2/3" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded-md" />
          <div className="h-3 w-8 bg-muted/60 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ProductsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);
