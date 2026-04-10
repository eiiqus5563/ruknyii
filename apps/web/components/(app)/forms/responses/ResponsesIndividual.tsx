'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, Trash2, ChevronsUpDown, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

const DECORATIVE_TYPES = ['HEADING', 'PARAGRAPH', 'DIVIDER', 'TITLE', 'LABEL', 'IMAGE', 'VIDEO', 'AUDIO', 'EMBED'];

interface ResponsesIndividualProps {
  fields: any[];
  submissions: any[];
  onDelete: (submissionId: string) => Promise<boolean>;
}

export function ResponsesIndividual({ fields, submissions, onDelete }: ResponsesIndividualProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dataFields = useMemo(
    () => (fields || [])
      .filter(f => !DECORATIVE_TYPES.includes(f.type))
      .sort((a, b) => a.order - b.order),
    [fields]
  );

  const currentSubmission = submissions[currentIndex];

  if (!submissions.length) {
    return (
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-10 text-center">
        <MessageSquareText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">لا توجد ردود بعد</h3>
        <p className="text-[13px] text-muted-foreground">ستظهر الردود الفردية هنا عند استلامها</p>
      </div>
    );
  }

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, submissions.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!currentSubmission || isDeleting) return;
    if (!confirm('هل أنت متأكد من حذف هذا الرد؟')) return;
    setIsDeleting(true);
    const success = await onDelete(currentSubmission.id);
    if (success) {
      if (currentIndex >= submissions.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    setIsDeleting(false);
  };

  const formatValue = (value: any): string => {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) return value.join('، ');
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation bar */}
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Response selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors min-w-[140px]"
              >
                <span className="truncate flex-1 text-right">الرد {currentIndex + 1}</span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-full mt-1 right-0 z-50 w-48 max-h-60 overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-lg">
                    {submissions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentIndex(i);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-right px-3.5 py-2.5 text-[13px] transition-colors hover:bg-muted/60',
                          i === currentIndex ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                        )}
                      >
                        الرد {i + 1}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="flex items-center justify-center size-8 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
              <span className="text-[13px] text-muted-foreground min-w-[80px] text-center">
                {currentIndex + 1} <span className="text-muted-foreground/50">من</span> {submissions.length}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex === submissions.length - 1}
                className="flex items-center justify-center size-8 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center size-8 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors"
              title="طباعة"
            >
              <Printer className="size-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center justify-center size-8 rounded-lg border border-border/50 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="حذف الرد"
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Response content */}
      {currentSubmission && (
        <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6 space-y-0.5 print:shadow-none">
          {/* Response metadata */}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-5 pb-4 border-b border-border/30">
            {currentSubmission.user && (
              <span>{currentSubmission.user.profile?.name || currentSubmission.user.email || 'مجهول'}</span>
            )}
            {(currentSubmission.completedAt || currentSubmission.createdAt) && (
              <>
                <span className="text-border/50">•</span>
                <span>{formatDate(currentSubmission.completedAt || currentSubmission.createdAt)}</span>
              </>
            )}
            {currentSubmission.timeToComplete && (
              <>
                <span className="text-border/50">•</span>
                <span>{Math.round(currentSubmission.timeToComplete / 60)} دقيقة</span>
              </>
            )}
          </div>

          {/* Field-value pairs */}
          {dataFields.map((field) => {
            const data = currentSubmission.data as Record<string, any>;
            const value = data[field.label] ?? data[field.id];

            return (
              <div key={field.id} className="py-3.5 border-b border-border/15 last:border-0">
                <p className="text-[12px] text-muted-foreground mb-1">{field.label}</p>
                <p className="text-[13px] text-foreground">{formatValue(value)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
