'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, RefreshCw, ExternalLink, Unplug, Loader2,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight, Cloud, HardDrive, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoogleSheets, GoogleSheetsStatus } from '@/lib/hooks/useGoogleSheets';

interface ResponsesIntegrationsProps {
  formId: string;
  formSlug: string;
  totalSubmissions: number;
  onSheetCreated?: (spreadsheetUrl: string) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function ResponsesIntegrations({ formId, formSlug, totalSubmissions, onSheetCreated }: ResponsesIntegrationsProps) {
  const {
    status, isConnected, isSyncing, error, config,
    getStatus, connect, disconnect, sync, toggleAutoSync, reconnect, createSpreadsheet,
  } = useGoogleSheets();

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);

  useEffect(() => {
    setIsLoadingStatus(true);
    getStatus(formId).finally(() => setIsLoadingStatus(false));
  }, [formId, getStatus]);

  const handleConnect = useCallback(async () => {
    const result = await connect(formId);
    if (result?.authUrl) {
      window.location.href = result.authUrl;
    }
  }, [formId, connect]);

  const handleReconnect = useCallback(async () => {
    const result = await reconnect(formId);
    if (result?.authUrl) {
      window.location.href = result.authUrl;
    }
  }, [formId, reconnect]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm('هل أنت متأكد من قطع الاتصال بـ Google Sheets؟')) return;
    setDisconnecting(true);
    await disconnect(formId);
    setDisconnecting(false);
  }, [formId, disconnect]);

  const handleSync = useCallback(async () => {
    await sync(formId);
  }, [formId, sync]);

  const handleToggleAutoSync = useCallback(async () => {
    if (!config) return;
    await toggleAutoSync(formId, !config.isAutoSync);
  }, [formId, config, toggleAutoSync]);

  const handleCreateSheet = useCallback(async () => {
    setCreatingSheet(true);
    const result = await createSpreadsheet(formId);
    setCreatingSheet(false);
    if (result?.spreadsheetUrl) {
      await getStatus(formId);
      onSheetCreated?.(result.spreadsheetUrl);
    }
  }, [formId, createSpreadsheet, getStatus, onSheetCreated]);

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google Sheets Integration */}
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
            <FileSpreadsheet className="size-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Google Sheets</h3>
              {isConnected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600">
                  <CheckCircle2 className="size-3" />
                  متصل
                </span>
              )}
              {status === GoogleSheetsStatus.ERROR && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
                  <XCircle className="size-3" />
                  خطأ
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              مزامنة ردود النموذج تلقائياً مع Google Sheets
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/5 border border-red-500/20 px-3.5 py-2.5 mb-4">
            <AlertCircle className="size-4 text-red-500 shrink-0" />
            <p className="text-[12px] text-red-500">{error}</p>
          </div>
        )}

        {!isConnected ? (
          /* Not connected state */
          <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
            <FileSpreadsheet className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground mb-4">
              اربط النموذج بـ Google Sheets لمزامنة الردود تلقائياً
            </p>
            <button
              onClick={handleConnect}
              disabled={status === GoogleSheetsStatus.CONNECTING}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors',
                'bg-green-600 text-white hover:bg-green-700',
                status === GoogleSheetsStatus.CONNECTING && 'opacity-60 cursor-not-allowed'
              )}
            >
              {status === GoogleSheetsStatus.CONNECTING ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              ربط بـ Google Sheets
            </button>
          </div>
        ) : (
          /* Connected state */
          <div className="space-y-4">
            {/* Create Sheet prompt if no spreadsheet exists yet */}
            {!config?.spreadsheetUrl && (
              <div className="rounded-xl border border-dashed border-green-500/30 bg-green-500/5 p-5 text-center">
                <FileSpreadsheet className="size-8 text-green-600/50 mx-auto mb-3" />
                <p className="text-[13px] text-muted-foreground mb-1">
                  تم الاتصال بنجاح! لكن لم يتم إنشاء ملف الشيت بعد.
                </p>
                <p className="text-[12px] text-muted-foreground/70 mb-4">
                  اضغط الزر أدناه لإنشاء ملف Google Sheets ومزامنة الردود
                </p>
                <button
                  onClick={handleCreateSheet}
                  disabled={creatingSheet}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-colors',
                    'bg-green-600 text-white hover:bg-green-700',
                    creatingSheet && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {creatingSheet ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-4" />
                  )}
                  {creatingSheet ? 'جاري إنشاء الشيت...' : 'إنشاء ملف Google Sheets'}
                </button>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-background/60 border border-border/20 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">الصفوف المُزامنة</p>
                <p className="text-lg font-semibold text-foreground">{config?.syncedCount ?? 0}</p>
              </div>
              <div className="rounded-xl bg-background/60 border border-border/20 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">آخر مزامنة</p>
                <p className="text-[13px] font-medium text-foreground">{formatDate(config?.lastSyncAt)}</p>
              </div>
              <div className="rounded-xl bg-background/60 border border-border/20 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">المزامنة التلقائية</p>
                <button
                  onClick={handleToggleAutoSync}
                  className="flex items-center gap-1.5 mt-0.5"
                >
                  {config?.isAutoSync ? (
                    <>
                      <ToggleRight className="size-5 text-green-500" />
                      <span className="text-[13px] font-medium text-green-600">مفعّلة</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="size-5 text-muted-foreground" />
                      <span className="text-[13px] font-medium text-muted-foreground">معطّلة</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex flex-wrap items-center gap-2">
              {config?.spreadsheetUrl && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-3.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors"
                >
                  <ExternalLink className="size-3.5 text-green-600" />
                  فتح الشيت
                </a>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing || totalSubmissions === 0}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-border/50 px-3.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors',
                  (isSyncing || totalSubmissions === 0) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('size-3.5 text-blue-500', isSyncing && 'animate-spin')} />
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
              </button>
              <button
                onClick={handleReconnect}
                className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                تغيير الحساب
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-3.5 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500/5 transition-colors',
                  disconnecting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {disconnecting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Unplug className="size-3.5" />
                )}
                قطع الاتصال
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Drive - info card */}
      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <Cloud className="size-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Google Drive</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              رفع ملفات المرفقات تلقائياً إلى Google Drive
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              <CheckCircle2 className="size-3" />
              يعمل تلقائياً مع المرفقات
            </div>
          </div>
        </div>
      </div>

      {/* S3 Storage - info card */}
      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
            <HardDrive className="size-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">S3 Storage</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              تخزين الصور والملفات المرفقة بالنموذج
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              <CheckCircle2 className="size-3" />
              يعمل تلقائياً مع الصور والملفات
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
