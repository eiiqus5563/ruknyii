'use client';

import { useState, useCallback, useMemo } from 'react';
import { Chip, Button } from '@heroui/react';
import { Plus, X, Trash2, Wand2 } from 'lucide-react';

// ─── Shared input class ─────────────────────────────────────────
const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all';

// ─── Types ──────────────────────────────────────────────────────
export interface VariantAttribute {
  key: string;
  label: string;
  labelAr: string;
  options: string[];
}

export interface ProductVariant {
  id: string;
  attributes: Record<string, string>;
  stock: string;
}

interface ProductVariantsEditorProps {
  variantAttributes: VariantAttribute[];
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
}

let variantCounter = 0;
function nextVarId() {
  return `var_local_${++variantCounter}`;
}

/** Generate all cartesian product combinations */
function generateCombinations(
  selections: Record<string, string[]>,
): ProductVariant[] {
  const keys = Object.keys(selections).filter(
    (k) => selections[k].length > 0,
  );
  if (keys.length === 0) return [];

  const combos: Record<string, string>[] = [{}];

  for (const key of keys) {
    const values = selections[key];
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const val of values) {
        next.push({ ...combo, [key]: val });
      }
    }
    combos.length = 0;
    combos.push(...next);
  }

  return combos.map((attrs) => ({
    id: nextVarId(),
    attributes: attrs,
    stock: '0',
  }));
}

export function ProductVariantsEditor({
  variantAttributes,
  variants,
  onVariantsChange,
}: ProductVariantsEditorProps) {
  // Track which options the user has selected for each attribute
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const sel: Record<string, string[]> = {};
    for (const attr of variantAttributes) {
      sel[attr.key] = [];
    }
    return sel;
  });

  // Custom option input per attribute
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const toggleOption = useCallback(
    (attrKey: string, option: string) => {
      setSelections((prev) => {
        const current = prev[attrKey] || [];
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [attrKey]: next };
      });
    },
    [],
  );

  const addCustomOption = useCallback(
    (attrKey: string) => {
      const val = customInputs[attrKey]?.trim();
      if (!val) return;
      setSelections((prev) => {
        const current = prev[attrKey] || [];
        if (current.includes(val)) return prev;
        return { ...prev, [attrKey]: [...current, val] };
      });
      setCustomInputs((prev) => ({ ...prev, [attrKey]: '' }));
    },
    [customInputs],
  );

  const handleGenerate = useCallback(() => {
    const generated = generateCombinations(selections);
    if (generated.length === 0) return;
    if (generated.length > 100) {
      alert('لا يمكن توليد أكثر من 100 تركيبة');
      return;
    }
    onVariantsChange(generated);
  }, [selections, onVariantsChange]);

  const updateVariant = useCallback(
    (id: string, value: string) => {
      onVariantsChange(
        variants.map((v) => (v.id === id ? { ...v, stock: value } : v)),
      );
    },
    [variants, onVariantsChange],
  );

  const removeVariant = useCallback(
    (id: string) => {
      onVariantsChange(variants.filter((v) => v.id !== id));
    },
    [variants, onVariantsChange],
  );

  const totalSelections = useMemo(
    () =>
      Object.values(selections).reduce(
        (sum, arr) => sum * (arr.length || 1),
        Object.values(selections).some((a) => a.length > 0) ? 1 : 0,
      ),
    [selections],
  );

  return (
    <div className="space-y-4">
      {/* ─── Option Selectors per attribute ──── */}
      {variantAttributes.map((attr) => (
        <div key={attr.key} className="space-y-2">
          <label className="text-[13px] font-medium text-foreground">
            {attr.labelAr || attr.label}
          </label>

          {/* Predefined options */}
          <div className="flex flex-wrap gap-2">
            {attr.options.map((opt) => {
              const isSelected = selections[attr.key]?.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(attr.key, opt)}
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

          {/* Selected chips */}
          {selections[attr.key]?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selections[attr.key]
                .filter((o) => !attr.options.includes(o))
                .map((opt) => (
                  <Chip key={opt} size="sm" variant="soft" color="accent">
                    <Chip.Label>{opt}</Chip.Label>
                    <button
                      type="button"
                      onClick={() => toggleOption(attr.key, opt)}
                      className="mr-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Chip>
                ))}
            </div>
          )}

          {/* Custom option input */}
          <div className="flex items-center gap-2">
            <input
              value={customInputs[attr.key] || ''}
              onChange={(e) =>
                setCustomInputs((prev) => ({
                  ...prev,
                  [attr.key]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomOption(attr.key);
                }
              }}
              placeholder={`إضافة ${attr.labelAr || attr.label} مخصص...`}
              className={`${inputClass} max-w-[220px] !text-xs`}
              dir="rtl"
            />
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              onPress={() => addCustomOption(attr.key)}
              isDisabled={!customInputs[attr.key]?.trim()}
              aria-label="إضافة"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* ─── Generate Button ──── */}
      {totalSelections > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            سيتم توليد{' '}
            <span className="font-bold text-foreground">{totalSelections}</span>{' '}
            تركيبة
          </span>
          <Button
            size="sm"
            variant="primary"
            onPress={handleGenerate}
          >
            <Wand2 className="w-3.5 h-3.5" />
            توليد المتغيرات
          </Button>
        </div>
      )}

      {/* ─── Variants Table ──── */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">
              المتغيرات ({variants.length})
            </span>
            <Button
              size="sm"
              variant="danger-soft"
              onPress={() => onVariantsChange([])}
            >
              <Trash2 className="w-3 h-3" />
              مسح الكل
            </Button>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-muted/30 text-right">
                    {variantAttributes.map((attr) => (
                      <th
                        key={attr.key}
                        className="px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {attr.labelAr || attr.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      الكمية
                    </th>
                    <th className="px-3 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr
                      key={variant.id}
                      className="border-t border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      {variantAttributes.map((attr) => (
                        <td
                          key={attr.key}
                          className="px-3 py-2 whitespace-nowrap"
                        >
                          <Chip size="sm" variant="soft">
                            {variant.attributes[attr.key] || '—'}
                          </Chip>
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(variant.id, e.target.value)
                          }
                          min={0}
                          dir="ltr"
                          className="w-[80px] h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-left"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="tertiary"
                          onPress={() => removeVariant(variant.id)}
                          aria-label="حذف"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
