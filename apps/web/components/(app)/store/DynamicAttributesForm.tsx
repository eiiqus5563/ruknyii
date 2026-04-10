'use client';

import { useCallback } from 'react';
import { Switch, Chip } from '@heroui/react';
import { CalendarDays } from 'lucide-react';

// ─── Shared input class ─────────────────────────────────────────
const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all';

// ─── Types ──────────────────────────────────────────────────────
export interface TemplateField {
  key: string;
  label: string;
  labelAr: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean' | 'textarea';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface DynamicAttributesFormProps {
  fields: TemplateField[];
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
}

export function DynamicAttributesForm({
  fields,
  values,
  onValuesChange,
}: DynamicAttributesFormProps) {
  const updateValue = useCallback(
    (key: string, value: string) => {
      onValuesChange({ ...values, [key]: value });
    },
    [values, onValuesChange],
  );

  const toggleMultiSelect = useCallback(
    (key: string, option: string) => {
      const current = values[key] ? values[key].split(',').filter(Boolean) : [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      onValuesChange({ ...values, [key]: next.join(',') });
    },
    [values, onValuesChange],
  );

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const fieldLabel = field.labelAr || field.label;
        const isRequired = field.required;

        switch (field.type) {
          case 'text':
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <input
                  value={values[field.key] || ''}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  placeholder={field.placeholder || `أدخل ${fieldLabel}`}
                  dir="rtl"
                  className={inputClass}
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <input
                  type="number"
                  value={values[field.key] || ''}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  placeholder={field.placeholder || '0'}
                  dir="ltr"
                  min={0}
                  className={`${inputClass} text-left`}
                />
              </div>
            );

          case 'textarea':
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <textarea
                  value={values[field.key] || ''}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  placeholder={field.placeholder || `أدخل ${fieldLabel}`}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  dir="rtl"
                />
              </div>
            );

          case 'date':
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <input
                  type="date"
                  value={values[field.key] || ''}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  dir="ltr"
                  className={`${inputClass} text-left`}
                />
              </div>
            );

          case 'boolean':
            return (
              <div key={field.key} className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <Switch
                  isSelected={values[field.key] === 'true'}
                  onChange={() =>
                    updateValue(
                      field.key,
                      values[field.key] === 'true' ? 'false' : 'true',
                    )
                  }
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(field.options || []).map((opt) => {
                    const isSelected = values[field.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateValue(field.key, isSelected ? '' : opt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );

          case 'multiselect': {
            const selected = values[field.key]
              ? values[field.key].split(',').filter(Boolean)
              : [];
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {fieldLabel}
                  {isRequired && <span className="text-destructive mr-1">*</span>}
                  {selected.length > 0 && (
                    <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {selected.length}
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(field.options || []).map((opt) => {
                    const isSelected = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMultiSelect(field.key, opt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((s) => (
                      <Chip key={s} size="sm" variant="soft" color="accent">
                        <Chip.Label>{s}</Chip.Label>
                        <button
                          type="button"
                          onClick={() => toggleMultiSelect(field.key, s)}
                          className="mr-0.5"
                        >
                          ×
                        </button>
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
