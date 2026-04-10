'use client';

import React, { useState } from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import {
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  GripVertical,
  Share2,
  Image,
  Star,
  BarChart3,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getBrandByKey,
  getLocalIconPathByKey,
  extractDomain,
  getFaviconUrl,
  type BrandInfo,
} from '@/lib/brand-icons';
import { Switch } from '@/components/ui/switch';
import { LinkLayoutDialog } from './link-layout-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ------------------------------------------------------------------ */
/*  Brand SVG Icon component                                           */
/* ------------------------------------------------------------------ */

function BrandIcon({
  brand,
  className,
}: {
  brand: BrandInfo;
  className?: string;
}) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={brand.title}
      className={className}
    >
      <path d={brand.path} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  LinkCard                                                           */
/* ------------------------------------------------------------------ */

interface LinkCardProps {
  reorderValue?: unknown;
  id: string;
  platform: string;
  url: string;
  title?: string;
  thumbnail?: string | null;
  layout?: 'classic' | 'featured';
  status?: 'active' | 'hidden';
  isFeatured?: boolean;
  totalClicks?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string, status: string) => void;
  onToggleFeatured?: (id: string, featured: boolean) => void;
  onLayoutChange?: (id: string, layout: 'classic' | 'featured') => void;
  onShare?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}

export function LinkCard({
  reorderValue,
  id,
  platform,
  url,
  title,
  thumbnail,
  layout = 'classic',
  status = 'active',
  isFeatured = false,
  totalClicks = 0,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  onLayoutChange,
  onShare,
  onDragStart: parentOnDragStart,
  onDragEnd: parentOnDragEnd,
}: LinkCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLocalFeatured, setIsLocalFeatured] = useState(isFeatured);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const brand = getBrandByKey(platform);
  const localIconPath = getLocalIconPathByKey(platform);
  const domain = (!localIconPath && !brand) ? extractDomain(url) : null;
  const displayTitle = title || brand?.title || platform;
  const isHidden = status === 'hidden';
  const dragControls = useDragControls();

  const handleToggleFeatured = () => {
    const newFeaturedState = !isLocalFeatured;
    setIsLocalFeatured(newFeaturedState);
    onToggleFeatured?.(id, newFeaturedState);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenUrl = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Reorder.Item
      value={reorderValue ?? id}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        setIsDragging(true);
        parentOnDragStart?.(id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        parentOnDragEnd?.();
      }}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.03 : 1,
        boxShadow: isDragging
          ? '0 12px 28px -4px rgba(0,0,0,0.15), 0 4px 10px -2px rgba(0,0,0,0.08)'
          : '0 0px 0px 0px rgba(0,0,0,0)',
      }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      whileDrag={{
        scale: 1.03,
        boxShadow: '0 12px 28px -4px rgba(0,0,0,0.15), 0 4px 10px -2px rgba(0,0,0,0.08)',
        cursor: 'grabbing',
      }}
      style={{
        position: 'relative',
        zIndex: isDragging ? 50 : 'auto',
      }}
      className={cn(
        'group rounded-2xl border p-3 sm:p-4 cursor-default outline-none select-none',
        'transition-[border-color,background-color,opacity] duration-200',
        isHidden
          ? 'border-border/40 bg-muted/25 opacity-70'
          : 'border-border/60 bg-card',
        isLocalFeatured && !isHidden && 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20',
        isDragging && 'border-primary/40 bg-card',
      )}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              onPointerDown={(e: React.PointerEvent) => {
                e.preventDefault();
                dragControls.start(e);
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'mt-0.5 h-8 w-6 shrink-0 text-muted-foreground/50 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center touch-none p-1 -m-1 rounded-lg hover:bg-muted hover:text-foreground',
                isDragging && 'text-primary cursor-grabbing',
              )}
            >
              <GripVertical className="h-4 w-4" />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="right">اسحب لإعادة الترتيب</TooltipContent>
        </Tooltip>

          <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {thumbnail ? (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt={displayTitle} className="w-full h-full object-cover" />
              </div>
            ) : localIconPath ? (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-white dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localIconPath}
                  alt={displayTitle}
                  width={18}
                  height={18}
                  className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                />
              </div>
            ) : brand ? (
              <div
                className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `#${brand.hex}` }}
              >
                <BrandIcon brand={brand} className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white" />
              </div>
            ) : domain ? (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFaviconUrl(domain, 64)}
                  alt={domain}
                  width={18}
                  height={18}
                  className="h-4 w-4 sm:h-[18px] sm:w-[18px] object-contain"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    el.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>';
                  }}
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
            )}

            <p className="min-w-0 flex-1 truncate text-sm sm:text-[18px] leading-tight font-semibold text-foreground">
              {displayTitle}
            </p>

            {onEdit && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onEdit(id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>تعديل العنوان</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2 ps-10 sm:ps-11">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-xs sm:text-[15px] leading-tight text-foreground/90 hover:text-foreground"
              dir="ltr"
              title={url}
            >
              {url}
            </a>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopyUrl}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isCopied ? 'تم النسخ' : 'نسخ الرابط'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ps-10 sm:ps-11 text-muted-foreground">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground"
                    onClick={handleOpenUrl}
                  >
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>فتح الرابط</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40"
                    onClick={() => setLayoutDialogOpen(true)}
                  >
                    <Image className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تخصيص المظهر</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleToggleFeatured}
                    className={cn(
                      'flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg transition-colors',
                      isLocalFeatured
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-500'
                        : 'hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Star className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5', isLocalFeatured && 'fill-current')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isLocalFeatured ? 'إلغاء التثبيت' : 'تثبيت الرابط'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="ms-1 inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-border/50 bg-muted/35 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-foreground/85">
              <MousePointerClick className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
              <span>{totalClicks}</span>
              <span className="text-muted-foreground">نقرة</span>
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="flex min-h-[80px] sm:min-h-[92px] flex-col items-center justify-between gap-1.5 sm:gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => onShare?.(id)}
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>مشاركة</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onToggleStatus && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={!isHidden}
                      onCheckedChange={(checked) =>
                        onToggleStatus(id, checked ? 'active' : 'hidden')
                      }
                      aria-label={isHidden ? 'إظهار الرابط' : 'إخفاء الرابط'}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{isHidden ? 'إظهار' : 'إخفاء'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onDelete && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDelete(id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>حذف</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <LinkLayoutDialog
        open={layoutDialogOpen}
        onOpenChange={setLayoutDialogOpen}
        currentLayout={layout}
        thumbnail={thumbnail}
        title={displayTitle}
        url={url}
        onLayoutChange={(newLayout) => onLayoutChange?.(id, newLayout)}
      />
    </Reorder.Item>
    );
  }
