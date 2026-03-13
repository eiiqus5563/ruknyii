'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsesByQuestionProps {
  fields: any[];
  submissions: any[];
}

const DECORATIVE_TYPES = ['HEADING', 'PARAGRAPH', 'DIVIDER', 'TITLE', 'LABEL', 'IMAGE', 'VIDEO', 'AUDIO', 'EMBED'];

export function ResponsesByQuestion({ fields, submissions }: ResponsesByQuestionProps) {
  const dataFields = useMemo(
    () => (fields || [])
      .filter(f => !DECORATIVE_TYPES.includes(f.type))
      .sort((a, b) => a.order - b.order),
    [fields]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentField = dataFields[currentIndex];

  const answers = useMemo(() => {
    if (!currentField) return [];
    return submissions
      .map(sub => {
        const data = sub.data as Record<string, any>;
        const val = data[currentField.label] ?? data[currentField.id];
        return {
          id: sub.id,
          value: val,
          user: sub.user?.profile?.name || sub.user?.email || 'مجهول',
          date: sub.completedAt || sub.createdAt,
        };
      })
      .filter(a => a.value !== undefined && a.value !== null && a.value !== '');
  }, [currentField, submissions]);

  if (dataFields.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/30 p-10 text-center">
        <MessageSquareText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">لا توجد أسئلة</h3>
        <p className="text-[13px] text-muted-foreground">هذا النموذج لا يحتوي على أسئلة بعد</p>
      </div>
    );
  }

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, dataFields.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  return (
    <div className="space-y-4">
      {/* Question navigator */}
      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        {/* Selector + Pagination */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          {/* Dropdown selector */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors min-w-[180px]"
            >
              <span className="truncate flex-1 text-right">{currentField?.label}</span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full mt-1 right-0 z-50 w-64 max-h-60 overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-lg">
                  {dataFields.map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setCurrentIndex(i);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full text-right px-3.5 py-2.5 text-[13px] transition-colors hover:bg-muted/60',
                        i === currentIndex ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                      )}
                    >
                      {f.label}
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
              {currentIndex + 1} <span className="text-muted-foreground/50">من</span> {dataFields.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === dataFields.length - 1}
              className="flex items-center justify-center size-8 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Question title + answers */}
      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-primary mb-4">{currentField?.label}</h3>

        {answers.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-6">لا توجد ردود لهذا السؤال</p>
        ) : (
          <div className="space-y-2">
            {answers.map((answer) => (
              <div
                key={answer.id}
                className="rounded-xl bg-background/60 border border-border/20 px-4 py-3"
              >
                <p className="text-[13px] text-foreground">
                  {Array.isArray(answer.value)
                    ? answer.value.join('، ')
                    : typeof answer.value === 'boolean'
                    ? answer.value ? 'نعم' : 'لا'
                    : typeof answer.value === 'object'
                    ? JSON.stringify(answer.value)
                    : String(answer.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-4">
          {answers.length} من {submissions.length} رد
        </p>
      </div>
    </div>
  );
}
