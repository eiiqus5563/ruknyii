'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Layers,
  GripVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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

// ─── Types ────────────────────────────────────────────────────────
export interface ProductCategory {
  id: string;
  storeId: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color: string;
  order: number;
  isActive: boolean;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryCardProps {
  category: ProductCategory;
  onEdit?: (category: ProductCategory) => void;
  onDelete?: (category: ProductCategory) => void;
  onToggleActive?: (category: ProductCategory) => void;
  onClick?: (category: ProductCategory) => void;
  iconResolver?: (iconName?: string | null) => LucideIcon;
}

function CategoryCardComponent({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  onClick,
  iconResolver,
}: CategoryCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const displayName = category.nameAr || category.name;
  const IconComp = iconResolver ? iconResolver(category.icon) : Layers;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-2xl border border-border/60 p-3 group cursor-pointer hover:shadow-lg hover:border-border transition-all duration-300"
      onClick={() => onClick?.(category)}
    >
      {/* Icon/Color Section */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${category.color}15, ${category.color}08)`,
          }}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              'shadow-md group-hover:scale-110 transition-transform duration-300',
            )}
            style={{
              backgroundColor: `${category.color}20`,
              boxShadow: `0 4px 14px ${category.color}15`,
            }}
          >
            <IconComp className="w-8 h-8" style={{ color: category.color }} />
          </div>
        </div>

        {/* Active Status Badge - Top Right */}
        <span
          className={cn(
            'absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold',
            'backdrop-blur-md shadow-sm',
            category.isActive
              ? 'bg-emerald-500/15 text-emerald-600'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {category.isActive ? 'نشط' : 'مخفي'}
        </span>

        {/* Order Badge - Top Left */}
        <span
          className={cn(
            'absolute top-2.5 left-2.5 w-7 h-7 rounded-lg flex items-center justify-center',
            'bg-background/90 backdrop-blur-sm shadow-sm text-[10px] font-bold text-muted-foreground',
          )}
        >
          {category.order + 1}
        </span>

        {/* Products Count Badge - Bottom Left */}
        <span
          className={cn(
            'absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg flex items-center gap-1',
            'bg-background/90 backdrop-blur-sm shadow-sm',
          )}
        >
          <Package className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-foreground/80">
            {category.productsCount}
          </span>
        </span>

        {/* Actions Menu - Bottom Right */}
        <div className="absolute bottom-2.5 right-2.5 z-30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center',
                  'bg-background/90 backdrop-blur-sm shadow-sm',
                  'text-muted-foreground hover:text-foreground hover:bg-background',
                  'opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100',
                  'transition-all duration-200',
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(category);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  تحرير
                </DropdownMenuItem>
              )}
              {onToggleActive && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive(category);
                  }}
                >
                  {category.isActive ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {category.isActive ? 'إخفاء' : 'تفعيل'}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteOpen(true);
                    }}
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
      <div className="text-right px-1">
        {/* Name & Color Badge Row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-foreground text-[13px] sm:text-sm leading-tight line-clamp-1 flex-1 min-w-0">
            {displayName}
          </h3>
          <span
            className="w-5 h-5 rounded-md shrink-0 border border-border/60"
            style={{ backgroundColor: category.color }}
          />
        </div>

        {/* Description */}
        <p className="text-[11px] sm:text-[12px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {category.description || 'بدون وصف'}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {category.productsCount} منتج
          </span>

          <span className="w-px h-3 bg-border" />

          <span className="flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            ترتيب {category.order + 1}
          </span>

          <span className="w-px h-3 bg-border" />

          <span className="flex items-center gap-1 truncate" dir="ltr">
            {category.slug}
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
              <DialogTitle>حذف التصنيف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف - {displayName}
                <br />
                {category.productsCount > 0 ? (
                  <span className="text-destructive font-medium">
                    لا يمكن حذف التصنيف لأنه يحتوي على {category.productsCount}{' '}
                    منتج
                  </span>
                ) : (
                  'لا يمكن التراجع عن هذا الإجراء'
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:justify-center">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">
                  إلغاء
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={category.productsCount > 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(false);
                  onDelete(category);
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

export function CategoryCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-3 animate-pulse">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/60 to-muted rounded-xl mb-3" />
      <div className="text-right px-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="h-4 bg-muted rounded-md w-3/4" />
          <div className="w-5 h-5 bg-muted rounded-md" />
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="h-3 bg-muted/60 rounded-md w-full" />
          <div className="h-3 bg-muted/60 rounded-md w-2/3" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 bg-muted/60 rounded-md" />
          <div className="h-3 w-px bg-border" />
          <div className="h-3 w-14 bg-muted/60 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CategoriesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

export const CategoryCard = memo(CategoryCardComponent);
