'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquareText, Hash, ToggleRight, Star, ListChecks,
  TrendingUp, Clock, BarChart3, Inbox,
} from 'lucide-react';

const BAR_COLORS = ['#5a9a56', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

interface ResponsesSummaryProps {
  summary: {
    totalSubmissions: number;
    fields: FieldSummary[];
  } | null;
  totalSubmissions: number;
  submissions?: any[];
}

interface FieldSummary {
  fieldId: string;
  label: string;
  type: string;
  totalResponses: number;
  distribution?: { name: string; count: number; percentage: number }[];
  average?: number;
  min?: number;
  max?: number;
  textResponses?: string[];
}

function getFieldIcon(type: string) {
  switch (type) {
    case 'SELECT': case 'RADIO': case 'MULTISELECT': case 'CHECKBOX':
      return ListChecks;
    case 'RATING': case 'SCALE':
      return Star;
    case 'NUMBER':
      return Hash;
    case 'TOGGLE':
      return ToggleRight;
    default:
      return MessageSquareText;
  }
}

function FieldCard({ field, index }: { field: FieldSummary; index: number }) {
  const Icon = getFieldIcon(field.type);
  const hasDistribution = field.distribution && field.distribution.length > 0;
  const hasText = field.textResponses && field.textResponses.length > 0;
  const maxCount = hasDistribution ? Math.max(...field.distribution!.map(d => d.count)) : 0;

  return (
    <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{field.totalResponses} رد</p>
        </div>
      </div>

      {/* Distribution bars */}
      {hasDistribution && (
        <div className="space-y-2.5">
          {field.distribution!.map((item, i) => (
            <div key={item.name}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-foreground font-medium truncate flex-1 ml-3">{item.name}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Numeric stats */}
      {field.average !== undefined && (
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground mt-1">
          <span>المتوسط: <strong className="text-foreground">{field.average}</strong></span>
          <span>الأدنى: <strong className="text-foreground">{field.min}</strong></span>
          <span>الأعلى: <strong className="text-foreground">{field.max}</strong></span>
        </div>
      )}

      {/* Text responses */}
      {hasText && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {field.textResponses!.slice(0, 5).map((text, i) => (
            <div key={i} className="rounded-xl bg-background/50 px-3.5 py-2.5 text-[13px] text-foreground">
              {text}
            </div>
          ))}
          {field.textResponses!.length > 5 && (
            <p className="text-[11px] text-muted-foreground text-center py-1">
              +{field.textResponses!.length - 5} ردود أخرى
            </p>
          )}
        </div>
      )}

      {!hasDistribution && !hasText && (
        <p className="text-[12px] text-muted-foreground/50 text-center py-3">لم يجب أحد بعد</p>
      )}
    </div>
  );
}

export function ResponsesSummary({ summary, totalSubmissions, submissions }: ResponsesSummaryProps) {
  const stats = useMemo(() => {
    if (!submissions || submissions.length === 0) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = submissions.filter(s => {
      const d = new Date(s.completedAt || s.createdAt);
      return d >= todayStart;
    }).length;

    const lastSubmission = submissions[0];
    const lastDate = lastSubmission?.completedAt || lastSubmission?.createdAt;

    const avgTime = submissions
      .filter(s => s.timeToComplete > 0)
      .reduce((acc, s, _, arr) => acc + s.timeToComplete / arr.length, 0);

    return { todayCount, lastDate, avgTime: Math.round(avgTime / 60) };
  }, [submissions]);

  if (!summary || totalSubmissions === 0) {
    return (
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-10 text-center">
        <div className="flex flex-col items-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="size-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">لا توجد ردود بعد</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            شارك رابط النموذج مع جمهورك وسيظهر الملخص هنا عند استلام أول رد
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#5a9a56]/10">
              <TrendingUp className="size-4 text-[#5a9a56]" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">ردود اليوم</p>
              <p className="text-lg font-bold text-foreground">{stats.todayCount}</p>
            </div>
          </div>
          <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
              <Clock className="size-4 text-purple-500" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">آخر رد</p>
              <p className="text-[13px] font-medium text-foreground">
                {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <BarChart3 className="size-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">متوسط الوقت</p>
              <p className="text-lg font-bold text-foreground">{stats.avgTime > 0 ? `${stats.avgTime} د` : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {summary.fields.map((field, index) => (
        <FieldCard key={field.fieldId} field={field} index={index} />
      ))}
    </div>
  );
}
