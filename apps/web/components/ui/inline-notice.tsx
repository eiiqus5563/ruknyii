'use client';

import { AlertCircle, BellRing, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface InlineNoticeProps {
  title?: string;
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function InlineNotice({
  title = 'تنبيه',
  message,
  icon: Icon = BellRing,
  className,
}: InlineNoticeProps) {
  return (
    <div
      dir="rtl"
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-[28px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-right shadow-[0_12px_30px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900/80',
        className,
      )}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{message}</p>
      </div>
    </div>
  );
}

export function InlineErrorNotice({
  title = 'تعذر إكمال العملية',
  message,
  className,
}: Omit<InlineNoticeProps, 'icon'>) {
  return (
    <InlineNotice
      title={title}
      message={message}
      icon={AlertCircle}
      className={className}
    />
  );
}