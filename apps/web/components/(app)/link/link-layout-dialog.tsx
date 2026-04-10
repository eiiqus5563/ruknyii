'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface LinkLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLayout: 'classic' | 'featured';
  thumbnail?: string | null;
  title?: string;
  url?: string;
  onLayoutChange: (layout: 'classic' | 'featured') => void;
}

export function LinkLayoutDialog({
  open,
  onOpenChange,
  currentLayout,
  thumbnail,
  title,
  url,
  onLayoutChange,
}: LinkLayoutDialogProps) {
  const [selected, setSelected] = useState<'classic' | 'featured'>(currentLayout);

  const handleSelect = (layout: 'classic' | 'featured') => {
    setSelected(layout);
    onLayoutChange(layout);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-2xl" dir="rtl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-center text-sm font-semibold">طريقة العرض</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 px-4 sm:px-5 pb-5">
          {/* ── Classic ── */}
          <button
            type="button"
            onClick={() => handleSelect('classic')}
            className={cn(
              'relative flex flex-col rounded-xl border p-3 transition-all',
              selected === 'classic'
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-border hover:bg-accent',
            )}
          >
            {selected === 'classic' && (
              <div className="absolute -top-1.5 -start-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
            )}

            {/* Preview */}
            <div className="w-full rounded-lg border border-border/30 bg-background p-2.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 shrink-0 rounded-md bg-muted flex items-center justify-center">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" className="h-full w-full rounded-md object-cover" />
                  ) : (
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-1.5 w-4/5 rounded-full bg-foreground/12" />
                  <div className="h-1 w-3/5 rounded-full bg-foreground/6" />
                </div>
              </div>
            </div>

            {/* Label */}
            <p className={cn(
              'text-xs font-semibold mt-2.5 text-center',
              selected === 'classic' ? 'text-primary' : 'text-foreground',
            )}>كلاسيكي</p>
          </button>

          {/* ── Featured ── */}
          <button
            type="button"
            onClick={() => handleSelect('featured')}
            className={cn(
              'relative flex flex-col rounded-xl border p-3 transition-all',
              selected === 'featured'
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-border hover:bg-accent',
            )}
          >
            {selected === 'featured' && (
              <div className="absolute -top-1.5 -start-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
            )}

            {/* Preview */}
            <div className="w-full overflow-hidden rounded-lg border border-border/30 bg-background">
              <div className="h-16 bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                )}
              </div>
              <div className="px-2.5 py-2 space-y-1.5">
                <div className="h-1.5 w-3/5 rounded-full bg-foreground/12" />
                <div className="h-1 w-2/5 rounded-full bg-foreground/6" />
              </div>
            </div>

            {/* Label */}
            <p className={cn(
              'text-xs font-semibold mt-2.5 text-center',
              selected === 'featured' ? 'text-primary' : 'text-foreground',
            )}>عصري</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
