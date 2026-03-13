'use client';

import Link from 'next/link';
import { ArrowLeft, Download, FileSpreadsheet, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResponsesTab } from '@/app/(user)/app/forms/[slug]/responses/page';

const tabs: { key: ResponsesTab; label: string }[] = [
  { key: 'summary', label: 'الملخص' },
  { key: 'question', label: 'حسب السؤال' },
  { key: 'individual', label: 'الردود الفردية' },
];

interface ResponsesHeaderProps {
  formTitle: string;
  formSlug: string;
  formId: string;
  totalSubmissions: number;
  activeTab: ResponsesTab;
  onTabChange: (tab: ResponsesTab) => void;
  onExport: () => void;
}

export function ResponsesHeader({
  formTitle,
  formSlug,
  formId,
  totalSubmissions,
  activeTab,
  onTabChange,
  onExport,
}: ResponsesHeaderProps) {
  const [copied, setCopied] = useState(false);

  const formUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/f/${formSlug}`
    : `/f/${formSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">

      {/* Card: Title + count + export + tabs */}
      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        {/* Count + export row */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground">
            {totalSubmissions} <span className="text-lg font-normal text-muted-foreground">رد</span>
          </h1>

          <button
            onClick={onExport}
            disabled={totalSubmissions === 0}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors',
              'border border-border/50 hover:bg-muted/60 text-foreground',
              totalSubmissions === 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <FileSpreadsheet className="size-4 text-green-600" />
            <span>تصدير</span>
            <Download className="size-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border/40">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              )}
            >
              {tab.label}
              {tab.key === 'summary' && (
                <span className={cn(
                  'mr-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[20px]',
                  activeTab === 'summary'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {totalSubmissions}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
