'use client';

import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { MessageSquareText, Hash, ToggleRight, Star, ListChecks } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

interface ResponsesSummaryProps {
  summary: {
    totalSubmissions: number;
    fields: FieldSummary[];
  } | null;
  totalSubmissions: number;
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

function FieldSummaryCard({ field, index }: { field: FieldSummary; index: number }) {
  const Icon = getFieldIcon(field.type);
  const isChoice = ['SELECT', 'RADIO', 'MULTISELECT', 'CHECKBOX'].includes(field.type);
  const isNumeric = ['RATING', 'SCALE', 'NUMBER'].includes(field.type);
  const isToggle = field.type === 'TOGGLE';
  const hasDistribution = field.distribution && field.distribution.length > 0;
  const hasText = field.textResponses && field.textResponses.length > 0;

  return (
    <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
      {/* Field header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-relaxed">{field.label}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{field.totalResponses} رد</p>
        </div>
      </div>

      {/* Pie chart for choice fields */}
      {isChoice && hasDistribution && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-1/2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={field.distribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={35}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {field.distribution!.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border) / 0.3)',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px',
                    direction: 'rtl',
                  }}
                  formatter={(value: any, name: any) => [`${value} رد`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full sm:w-1/2 space-y-2">
            {field.distribution!.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-[13px] text-foreground flex-1 truncate">{item.name}</span>
                <span className="text-[12px] text-muted-foreground font-medium">{item.percentage}%</span>
                <span className="text-[11px] text-muted-foreground">({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart for numeric/rating fields */}
      {isNumeric && hasDistribution && (
        <div>
          {field.average !== undefined && (
            <div className="flex items-center gap-4 mb-3 text-[13px]">
              <span className="text-muted-foreground">المتوسط: <strong className="text-foreground">{field.average}</strong></span>
              <span className="text-muted-foreground">الأدنى: <strong className="text-foreground">{field.min}</strong></span>
              <span className="text-muted-foreground">الأعلى: <strong className="text-foreground">{field.max}</strong></span>
            </div>
          )}
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={field.distribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border) / 0.3)',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px',
                    direction: 'rtl',
                  }}
                  formatter={(value: any) => [`${value} رد`]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Toggle: simple horizontal bar */}
      {isToggle && hasDistribution && (
        <div className="space-y-2.5">
          {field.distribution!.map((item, i) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-foreground font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text responses */}
      {hasText && (
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {field.textResponses!.map((text, i) => (
            <div key={i} className="rounded-xl bg-background/60 border border-border/20 px-3.5 py-2.5 text-[13px] text-foreground">
              {text}
            </div>
          ))}
        </div>
      )}

      {/* No data */}
      {!hasDistribution && !hasText && (
        <p className="text-sm text-muted-foreground/60 text-center py-4">لا توجد ردود بعد</p>
      )}
    </div>
  );
}

export function ResponsesSummary({ summary, totalSubmissions }: ResponsesSummaryProps) {
  if (!summary || totalSubmissions === 0) {
    return (
      <div className="rounded-2xl bg-muted/30 p-10 text-center">
        <MessageSquareText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">لا توجد ردود بعد</h3>
        <p className="text-[13px] text-muted-foreground">سيظهر الملخص هنا عند استلام أول رد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary.fields.map((field, index) => (
        <FieldSummaryCard key={field.fieldId} field={field} index={index} />
      ))}
    </div>
  );
}
