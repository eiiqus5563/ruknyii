'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useForms } from '@/lib/hooks/useForms';
import { ResponsesHeader } from '@/components/(app)/forms/responses/ResponsesHeader';
import { ResponsesSummary } from '@/components/(app)/forms/responses/ResponsesSummary';
import { ResponsesByQuestion } from '@/components/(app)/forms/responses/ResponsesByQuestion';
import { ResponsesIndividual } from '@/components/(app)/forms/responses/ResponsesIndividual';

export type ResponsesTab = 'summary' | 'question' | 'individual';

export default function FormResponsesPage() {
  const params = useParams();
  const formSlug = params.slug as string;
  const { getFormById, getFormSubmissions, getSubmissionsSummary, exportSubmissions, deleteSubmission } = useForms();

  const [activeTab, setActiveTab] = useState<ResponsesTab>('summary');
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const formData = await getFormById(formSlug);
    if (formData) {
      setForm(formData);
      const [submissionsData, summaryData] = await Promise.all([
        getFormSubmissions(formSlug, 1, 1000),
        getSubmissionsSummary(formSlug),
      ]);
      if (submissionsData) {
        setSubmissions(submissionsData.submissions);
        setTotalSubmissions(submissionsData.total);
      }
      if (summaryData) setSummary(summaryData);
    }
    setIsLoading(false);
  }, [formSlug, getFormById, getFormSubmissions, getSubmissionsSummary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = useCallback(async () => {
    if (!form) return;
    const blob = await exportSubmissions(formSlug);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.slug || 'form'}-responses.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [form, exportSubmissions]);

  const handleDeleteSubmission = useCallback(async (submissionId: string) => {
    if (!form) return false;
    const success = await deleteSubmission(formSlug, submissionId);
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
      />

      {activeTab === 'summary' && (
        <ResponsesSummary
          summary={summary}
          totalSubmissions={totalSubmissions}
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
    </div>
  );
}
