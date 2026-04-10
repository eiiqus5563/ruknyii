'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquareText, Hash, ToggleRight, Star, ListChecks,
  ChevronDown, ChevronUp, Inbox, Type, Mail, Phone, Link2,
  Calendar, Clock, FileUp, AlignLeft, CheckSquare,
} from 'lucide-react';

const DECORATIVE_TYPES = ['HEADING', 'PARAGRAPH', 'DIVIDER', 'TITLE', 'LABEL', 'IMAGE', 'VIDEO', 'AUDIO', 'EMBED'];

const COLORS = [
  { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-500/10' },
  { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  { bar: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-500/10' },
  { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-500/10' },
  { bar: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-500/10' },
  { bar: 'bg-cyan-500', text: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  { bar: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-500/10' },
  { bar: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-500/10' },
];

interface ResponsesByQuestionProps {
  fields: any[];
  submissions: any[];
}

function getFieldIcon(type: string) {
  switch (type) {
    case 'SELECT': case 'RADIO': return ListChecks;
    case 'MULTISELECT': case 'CHECKBOX': return CheckSquare;
    case 'RATING': case 'SCALE': return Star;
    case 'NUMBER': return Hash;
    case 'TOGGLE': return ToggleRight;
    case 'EMAIL': return Mail;
    case 'PHONE': return Phone;
    case 'URL': return Link2;
    case 'DATE': return Calendar;
    case 'TIME': case 'DATETIME': return Clock;
    case 'TEXTAREA': return AlignLeft;
    case 'FILE': return FileUp;
    case 'TEXT': return Type;
    default: return MessageSquareText;
  }
}

function getFieldTypeName(type: string) {
  const map: Record<string, string> = {
    TEXT: 'نص قصير', TEXTAREA: 'نص طويل', NUMBER: 'رقم',
    EMAIL: 'بريد إلكتروني', PHONE: 'هاتف', URL: 'رابط',
    DATE: 'تاريخ', TIME: 'وقت', DATETIME: 'تاريخ ووقت',
    SELECT: 'قائمة', MULTISELECT: 'اختيار متعدد',
    RADIO: 'اختيار واحد', CHECKBOX: 'خانات اختيار',
    FILE: 'ملف', RATING: 'تقييم', SCALE: 'مقياس',
    TOGGLE: 'نعم/لا', MATRIX: 'جدول', SIGNATURE: 'توقيع',
    RANKING: 'ترتيب',
  };
  return map[type] || type;
}

function formatValue(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.join('، ');
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface QuestionAnalysis {
  field: any;
  responses: string[];
  totalResponses: number;
  distribution: { name: string; count: number; percentage: number }[];
  isChoice: boolean;
  isNumeric: boolean;
  isToggle: boolean;
  average?: number;
  min?: number;
  max?: number;
}

function analyzeQuestion(field: any, submissions: any[]): QuestionAnalysis {
  const responses: string[] = [];
  const valueCounts: Map<string, number> = new Map();
  const numericValues: number[] = [];

  const isChoice = ['SELECT', 'RADIO', 'MULTISELECT', 'CHECKBOX'].includes(field.type);
  const isNumeric = ['RATING', 'SCALE', 'NUMBER'].includes(field.type);
  const isToggle = field.type === 'TOGGLE';

  for (const sub of submissions) {
    const data = sub.data as Record<string, any>;
    const raw = data[field.label] ?? data[field.id];
    if (raw === undefined || raw === null || raw === '') continue;

    if (isChoice || isToggle) {
      const vals = Array.isArray(raw) ? raw : [raw];
      for (const v of vals) {
        const str = typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : String(v);
        valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
      }
    } else if (isNumeric) {
      const n = Number(raw);
      if (!isNaN(n)) {
        numericValues.push(n);
        const str = String(n);
        valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
      }
    }

    const formatted = formatValue(raw);
    if (formatted) responses.push(formatted);
  }

  const totalResponses = responses.length;
  const distribution = Array.from(valueCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  let average: number | undefined;
  let min: number | undefined;
  let max: number | undefined;
  if (isNumeric && numericValues.length > 0) {
    average = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10;
    min = Math.min(...numericValues);
    max = Math.max(...numericValues);
  }

  return { field, responses, totalResponses, distribution, isChoice, isNumeric, isToggle, average, min, max };
}

function QuestionCard({ analysis, index }: { analysis: QuestionAnalysis; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = COLORS[index % COLORS.length];
  const Icon = getFieldIcon(analysis.field.type);
  const { distribution, isChoice, isNumeric, isToggle, responses, totalResponses } = analysis;
  const hasDistribution = distribution.length > 0;
  const isText = !isChoice && !isNumeric && !isToggle;
  const maxCount = distribution.length > 0 ? distribution[0].count : 0;

  // Show max 5 text responses, expandable
  const visibleTexts = expanded ? responses : responses.slice(0, 4);
  const hasMore = responses.length > 4;

  return (
    <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 pb-0">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', color.bg)}>
            <Icon className={cn('size-4', color.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-foreground leading-relaxed">
              {analysis.field.label}
              {analysis.field.required && <span className="text-red-400 mr-1">*</span>}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground">{getFieldTypeName(analysis.field.type)}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground">
                {totalResponses} رد
              </span>
            </div>
          </div>
          {totalResponses > 0 && (
            <div className={cn('rounded-lg px-2.5 py-1 text-[12px] font-semibold', color.bg, color.text)}>
              {Math.round((totalResponses / Math.max(1, totalResponses)) * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
        {totalResponses === 0 ? (
          <div className="text-center py-4">
            <p className="text-[12px] text-muted-foreground/50">لم يجب أحد على هذا السؤال بعد</p>
          </div>
        ) : (
          <>
            {/* Choice / Toggle - Horizontal bars */}
            {(isChoice || isToggle) && hasDistribution && (
              <div className="space-y-2.5">
                {distribution.map((item, i) => {
                  const itemColor = COLORS[i % COLORS.length];
                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between text-[13px] mb-1.5">
                        <span className="text-foreground font-medium truncate flex-1 ml-3">{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[12px] text-muted-foreground tabular-nums">{item.count}</span>
                          <span className={cn('text-[12px] font-semibold tabular-nums min-w-[36px] text-left', itemColor.text)}>
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', itemColor.bar)}
                          style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Numeric - Stats + bars */}
            {isNumeric && (
              <div className="space-y-4">
                {analysis.average !== undefined && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-background/60 border border-border/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">المتوسط</p>
                      <p className="text-base font-bold text-blue-600">{analysis.average}</p>
                    </div>
                    <div className="rounded-xl bg-background/60 border border-border/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الأدنى</p>
                      <p className="text-base font-bold text-emerald-600">{analysis.min}</p>
                    </div>
                    <div className="rounded-xl bg-background/60 border border-border/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الأعلى</p>
                      <p className="text-base font-bold text-rose-600">{analysis.max}</p>
                    </div>
                  </div>
                )}
                {hasDistribution && (
                  <div className="space-y-2">
                    {distribution.map((item, i) => {
                      const itemColor = COLORS[i % COLORS.length];
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between text-[13px] mb-1">
                            <span className="text-foreground font-medium">{item.name}</span>
                            <span className="text-[12px] text-muted-foreground">{item.count} ({item.percentage}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', itemColor.bar)}
                              style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Text responses */}
            {isText && (
              <div className="space-y-2">
                {visibleTexts.map((text, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-background/60 border border-border/20 px-3.5 py-2.5 text-[13px] text-foreground leading-relaxed"
                  >
                    {text}
                  </div>
                ))}
                {hasMore && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 mx-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        عرض أقل
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />
                        عرض {responses.length - 4} ردود أخرى
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ResponsesByQuestion({ fields, submissions }: ResponsesByQuestionProps) {
  const dataFields = useMemo(
    () => (fields || [])
      .filter((f: any) => !DECORATIVE_TYPES.includes(f.type))
      .sort((a: any, b: any) => a.order - b.order),
    [fields]
  );

  const analyses = useMemo(
    () => dataFields.map((field: any) => analyzeQuestion(field, submissions)),
    [dataFields, submissions]
  );

  if (!dataFields.length) {
    return (
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-10 text-center">
        <div className="flex flex-col items-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="size-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">لا توجد أسئلة</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            أضف أسئلة للنموذج لرؤية التحليل حسب السؤال
          </p>
        </div>
      </div>
    );
  }

  if (!submissions.length) {
    return (
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-10 text-center">
        <div className="flex flex-col items-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="size-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">لا توجد ردود بعد</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            ستظهر تحليلات الردود لكل سؤال عند استلام أول رد
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Questions overview */}
      <div className="rounded-3xl bg-muted/30 dark:bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">{dataFields.length} سؤال</span>
          <span className="text-muted-foreground">{submissions.length} رد</span>
        </div>
      </div>

      {/* Question cards */}
      {analyses.map((analysis, index) => (
        <QuestionCard key={analysis.field.id} analysis={analysis} index={index} />
      ))}
    </div>
  );
}
