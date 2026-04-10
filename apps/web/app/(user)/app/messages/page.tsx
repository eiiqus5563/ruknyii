'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, FileText, ChevronLeft, Inbox } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useAuth } from '@/providers';

interface FormResponse {
  id: string;
  formTitle: string;
  formSlug: string;
  respondentName?: string;
  respondentEmail?: string;
  createdAt: string;
  answersCount: number;
}

export default function MessagesPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const load = async () => {
      try {
        const res = await api.get<any>('/forms/responses/recent', { limit: 20 }).catch(() => null);
        if (res?.data && Array.isArray(res.data)) {
          setResponses(res.data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 mt-2 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2 sm:mt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">الرسائل</h1>
            <p className="text-xs text-muted-foreground">ردود النماذج والرسائل الواردة</p>
          </div>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-2xl bg-muted/20 p-8 sm:p-12 text-center mt-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
            لا توجد رسائل بعد
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            عندما يرسل أحد ردًا على نماذجك ستظهر الرسائل هنا
          </p>
          <Link
            href="/app/forms/create?new=true"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            أنشئ نموذج تواصل
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {responses.map((r) => (
            <Link
              key={r.id}
              href={`/app/forms/${r.formSlug}/responses`}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:bg-muted/30 transition-colors group"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.formTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.respondentName || 'مجهول'} · {r.answersCount} إجابة
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{timeAgo(r.createdAt)}</span>
                <ChevronLeft className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
