'use client';

import Link from 'next/link';
import {
  ArrowLeft, Download, FileSpreadsheet, Copy, Check, ExternalLink,
  ChevronDown, FileText, Link2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ResponsesTab } from '@/app/(user)/app/forms/[slug]/responses/page';

const tabs: { key: ResponsesTab; label: string }[] = [
  { key: 'summary', label: 'الملخص' },
  { key: 'question', label: 'حسب السؤال' },
  { key: 'individual', label: 'الردود الفردية' },
  { key: 'integrations', label: 'التكاملات' },
];

interface ResponsesHeaderProps {
  formTitle: string;
  formSlug: string;
  formId: string;
  totalSubmissions: number;
  activeTab: ResponsesTab;
  onTabChange: (tab: ResponsesTab) => void;
  onExport: (format?: 'csv') => void;
  sheetsConnected?: boolean;
  spreadsheetUrl?: string;
  onConnectSheets?: () => void;
}

export function ResponsesHeader({
  formTitle,
  formSlug,
  formId,
  totalSubmissions,
  activeTab,
  onTabChange,
  onExport,
  sheetsConnected,
  spreadsheetUrl,
}: ResponsesHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const formUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/f/${formSlug}`
    : `/f/${formSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  return (
    <div className="space-y-4">

      {/* Card: Title + count + export + tabs */}
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6">
        {/* Count + export row */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground">
            {totalSubmissions} <span className="text-lg font-normal text-muted-foreground">رد</span>
          </h1>

          <div className="flex items-center gap-2">
            {/* View Sheet button */}
            {sheetsConnected && spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors',
                  'border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-700 dark:text-green-400'
                )}
              >
                <FileSpreadsheet className="size-4" />
                <span>عرض الشيت</span>
                <ExternalLink className="size-3" />
              </a>
            )}

            {/* Create Sheet button - when connected but no sheet yet */}
            {sheetsConnected && !spreadsheetUrl && (
              <button
                onClick={() => onTabChange('integrations')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors',
                  'border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-700 dark:text-green-400'
                )}
              >
                <FileSpreadsheet className="size-4" />
                <span>إنشاء شيت</span>
              </button>
            )}

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={totalSubmissions === 0}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors',
                'border border-border/50 hover:bg-muted/60 text-foreground',
                totalSubmissions === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <FileSpreadsheet className="size-4 text-green-600" />
              <span>تصدير</span>
              <ChevronDown className={cn('size-3.5 transition-transform', exportOpen && 'rotate-180')} />
            </button>

            {exportOpen && totalSubmissions > 0 && (
              <div className="absolute top-full mt-1.5 left-0 z-50 w-52 rounded-xl border border-border/50 bg-popover shadow-lg overflow-hidden">
                <button
                  onClick={() => { onExport('csv'); setExportOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                >
                  <FileText className="size-4 text-blue-500" />
                  تصدير CSV
                </button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border/40 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
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
              {tab.key === 'integrations' && sheetsConnected && (
                <span className="mr-1 inline-block size-2 rounded-full bg-green-500" />
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
