'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useForms } from '@/lib/hooks/useForms';
import { useGoogleSheets } from '@/lib/hooks/useGoogleSheets';
import { ResponsesHeader } from '@/components/(app)/forms/responses/ResponsesHeader';
import { ResponsesSummary } from '@/components/(app)/forms/responses/ResponsesSummary';
import { ResponsesByQuestion } from '@/components/(app)/forms/responses/ResponsesByQuestion';
import { ResponsesIndividual } from '@/components/(app)/forms/responses/ResponsesIndividual';
import { ResponsesIntegrations } from '@/components/(app)/forms/responses/ResponsesIntegrations';

export type ResponsesTab = 'summary' | 'question' | 'individual' | 'integrations';

export default function FormResponsesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formSlug = params.slug as string;
  const { getFormById, getFormSubmissions, getSubmissionsSummary, exportSubmissions, deleteSubmission } = useForms();
  const { getStatus } = useGoogleSheets();

  const sheetsJustConnected = searchParams.get('sheets_connected') === 'true';

  const [activeTab, setActiveTab] = useState<ResponsesTab>(
    sheetsJustConnected ? 'integrations' : 'summary'
  );
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const formData = await getFormById(formSlug);
    if (formData) {
      setForm(formData);
      const [submissionsData, summaryData, sheetsStatus] = await Promise.all([
        getFormSubmissions(formData.id, 1, 1000),
        getSubmissionsSummary(formData.id),
        getStatus(formData.id),
      ]);
      if (submissionsData) {
        setSubmissions(submissionsData.submissions);
        setTotalSubmissions(submissionsData.total);
      }
      if (summaryData) setSummary(summaryData);
      setSheetsConnected(sheetsStatus?.connected ?? false);
      setSpreadsheetUrl(sheetsStatus?.spreadsheetUrl);
    }
    setIsLoading(false);
  }, [formSlug, getFormById, getFormSubmissions, getSubmissionsSummary, getStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = useCallback(async (format?: 'csv') => {
    if (!form) return;
    const blob = await exportSubmissions(form.id, format);
    if (blob) {
      const ext = 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.slug || 'form'}-responses.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [form, exportSubmissions, formSlug]);

  const handleDeleteSubmission = useCallback(async (submissionId: string) => {
    if (!form) return false;
    const success = await deleteSubmission(form.id, submissionId);
    if (success) {
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setTotalSubmissions(prev => prev - 1);
    }
    return success;
  }, [form, deleteSubmission]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">جاري تحميل الردود...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6" dir="rtl">
      <ResponsesHeader
        formTitle={form?.title || ''}
        formSlug={form?.slug || ''}
        formId={form?.id || formSlug}
        totalSubmissions={totalSubmissions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExport}
        sheetsConnected={sheetsConnected}
        spreadsheetUrl={spreadsheetUrl}
      />

      {activeTab === 'summary' && (
        <ResponsesSummary
          summary={summary}
          totalSubmissions={totalSubmissions}
          submissions={submissions}
        />
      )}

      {activeTab === 'question' && (
        <ResponsesByQuestion
          fields={form?.fields || []}
          submissions={submissions}
        />
      )}

      {activeTab === 'individual' && (
        <ResponsesIndividual
          fields={form?.fields || []}
          submissions={submissions}
          onDelete={handleDeleteSubmission}
        />
      )}

      {activeTab === 'integrations' && (
        <ResponsesIntegrations
          formId={form?.id || formSlug}
          formSlug={form?.slug || formSlug}
          totalSubmissions={totalSubmissions}
          onSheetCreated={(url) => {
            setSpreadsheetUrl(url);
            setSheetsConnected(true);
          }}
        />
      )}
    </div>
  );
}
