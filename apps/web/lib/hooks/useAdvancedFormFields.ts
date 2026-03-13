'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { FormField, FieldType } from './useForms';

// ==================== TYPES ====================

interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';
  value?: string;
}

interface ConditionalLogic {
  action: 'show' | 'hide';
  rules: ConditionalRule[];
  operator: 'and' | 'or';
}

interface AdvancedFieldSettings {
  // Conditional Logic
  conditionalLogic?: ConditionalLogic;
  // Calculated Field
  formula?: string;
  formulaFields?: string[];
  formulaFormat?: 'number' | 'currency' | 'percentage';
  // Hidden Field
  hiddenValue?: string;
  hiddenSource?: 'static' | 'url_param' | 'cookie';
  hiddenParamName?: string;
}

// Extend FormField to include advanced settings
type ExtendedFormField = FormField & Partial<AdvancedFieldSettings>;

// ==================== CONDITIONAL LOGIC ====================

/**
 * Evaluates a single conditional rule
 */
export function evaluateRule(
  rule: ConditionalRule,
  responses: Record<string, any>
): boolean {
  const fieldValue = responses[rule.fieldId];
  
  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    
    case 'not_equals':
      return fieldValue !== rule.value;
    
    case 'contains':
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(rule.value || '');
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(rule.value);
      }
      return false;
    
    case 'is_empty':
      return fieldValue === undefined || 
             fieldValue === null || 
             fieldValue === '' || 
             (Array.isArray(fieldValue) && fieldValue.length === 0);
    
    case 'is_not_empty':
      return fieldValue !== undefined && 
             fieldValue !== null && 
             fieldValue !== '' && 
             (!Array.isArray(fieldValue) || fieldValue.length > 0);
    
    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);
    
    case 'less_than':
      return Number(fieldValue) < Number(rule.value);
    
    default:
      return false;
  }
}

/**
 * Evaluates all rules with AND/OR operator
 */
export function evaluateConditionalLogic(
  logic: ConditionalLogic,
  responses: Record<string, any>
): boolean {
  if (!logic.rules || logic.rules.length === 0) {
    return true; // No rules = always show
  }

  const results = logic.rules.map(rule => evaluateRule(rule, responses));
  
  if (logic.operator === 'and') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

/**
 * Determines if a field should be visible based on conditional logic
 */
export function shouldShowField(
  field: ExtendedFormField,
  responses: Record<string, any>
): boolean {
  // Check if field has conditional logic and it's properly structured
  const logic = field.conditionalLogic as ConditionalLogic | undefined;
  if (!logic || !logic.action || !logic.rules) {
    return true; // No conditional logic = always show
  }

  const conditionMet = evaluateConditionalLogic(logic, responses);
  
  // If action is 'show', show when condition is met
  // If action is 'hide', hide when condition is met (show when not met)
  return logic.action === 'show' ? conditionMet : !conditionMet;
}

// ==================== CALCULATED FIELDS ====================

/**
 * Parses a formula string and extracts field references
 * Formula format: {fieldLabel} or {fieldId}
 */
export function parseFormula(formula: string): string[] {
  const fieldRefs: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(formula)) !== null) {
    fieldRefs.push(match[1]);
  }
  
  return fieldRefs;
}

/**
 * Finds a field by label or ID
 */
function findField(
  fields: ExtendedFormField[],
  labelOrId: string
): ExtendedFormField | undefined {
  return fields.find(f => f.label === labelOrId || f.id === labelOrId);
}

/**
 * Calculates the result of a formula
 */
export function calculateFormula(
  formula: string,
  fields: ExtendedFormField[],
  responses: Record<string, any>
): number | null {
  if (!formula) return null;

  try {
    // Replace field references with actual values
    let expression = formula;
    const fieldRefs = parseFormula(formula);
    
    for (const ref of fieldRefs) {
      const field = findField(fields, ref);
      if (field) {
        const value = responses[field.id];
        const numValue = parseFloat(value) || 0;
        // Replace {fieldRef} with the numeric value
        expression = expression.replace(`{${ref}}`, numValue.toString());
      } else {
        // Field not found, replace with 0
        expression = expression.replace(`{${ref}}`, '0');
      }
    }

    // Replace Arabic operators with standard ones
    expression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    // Safely evaluate the mathematical expression
    // Using Function constructor for safe evaluation (no eval)
    const result = new Function(`return (${expression})`)();
    
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (error) {
    // Formula calculation error
    return null;
  }
}

/**
 * Formats a calculated result based on the format type
 */
export function formatCalculatedValue(
  value: number | null,
  format?: 'number' | 'currency' | 'percentage',
  locale: string = 'ar-IQ'
): string {
  if (value === null) return '-';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' د.ع';
    
    case 'percentage':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value / 100);
    
    default:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }
}

// ==================== HIDDEN FIELDS ====================

/**
 * Gets a URL parameter value
 */
export function getUrlParam(paramName: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
}

/**
 * Gets a cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}

/**
 * Gets the value for a hidden field based on its source
 */
export function getHiddenFieldValue(field: ExtendedFormField): string | null {
  if (field.type !== FieldType.HIDDEN) return null;

  switch (field.hiddenSource) {
    case 'static':
      return field.hiddenValue || null;
    
    case 'url_param':
      return field.hiddenParamName ? getUrlParam(field.hiddenParamName) : null;
    
    case 'cookie':
      return field.hiddenParamName ? getCookie(field.hiddenParamName) : null;
    
    default:
      return field.hiddenValue || null;
  }
}

// ==================== MAIN HOOK ====================

interface UseAdvancedFormFieldsProps {
  fields: ExtendedFormField[];
  responses: Record<string, any>;
  onResponseChange: (fieldId: string, value: any) => void;
}

interface UseAdvancedFormFieldsReturn {
  /** Fields filtered by visibility (conditional logic) */
  visibleFields: ExtendedFormField[];
  /** Map of field ID to calculated value */
  calculatedValues: Record<string, number | null>;
  /** Map of field ID to formatted calculated value */
  formattedCalculatedValues: Record<string, string>;
  /** Map of hidden field ID to its value */
  hiddenFieldValues: Record<string, string | null>;
  /** Check if a specific field should be visible */
  isFieldVisible: (fieldId: string) => boolean;
  /** Get the display value for a calculated field */
  getCalculatedDisplay: (fieldId: string) => string;
}

/**
 * Hook for handling advanced form field logic
 * - Conditional visibility
 * - Calculated fields
 * - Hidden fields
 */
export function useAdvancedFormFields({
  fields,
  responses,
  onResponseChange,
}: UseAdvancedFormFieldsProps): UseAdvancedFormFieldsReturn {
  
  // Calculate visibility for all fields
  const visibleFields = useMemo(() => {
    return fields.filter(field => {
      // Hidden fields are never visible to user but still processed
      if (field.type === FieldType.HIDDEN) return false;
      
      // Check conditional logic
      return shouldShowField(field, responses);
    });
  }, [fields, responses]);

  // Check if a specific field is visible
  const isFieldVisible = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return false;
    if (field.type === FieldType.HIDDEN) return false;
    return shouldShowField(field, responses);
  }, [fields, responses]);

  // Calculate values for all calculated fields
  const calculatedValues = useMemo(() => {
    const values: Record<string, number | null> = {};
    
    fields
      .filter(f => f.type === FieldType.CALCULATED && f.formula)
      .forEach(field => {
        values[field.id] = calculateFormula(field.formula!, fields, responses);
      });
    
    return values;
  }, [fields, responses]);

  // Format calculated values
  const formattedCalculatedValues = useMemo(() => {
    const formatted: Record<string, string> = {};
    
    fields
      .filter(f => f.type === FieldType.CALCULATED)
      .forEach(field => {
        const value = calculatedValues[field.id];
        formatted[field.id] = formatCalculatedValue(value, field.formulaFormat);
      });
    
    return formatted;
  }, [fields, calculatedValues]);

  // Get display value for a calculated field
  const getCalculatedDisplay = useCallback((fieldId: string) => {
    return formattedCalculatedValues[fieldId] || '-';
  }, [formattedCalculatedValues]);

  // Get values for all hidden fields
  const hiddenFieldValues = useMemo(() => {
    const values: Record<string, string | null> = {};
    
    fields
      .filter(f => f.type === FieldType.HIDDEN)
      .forEach(field => {
        values[field.id] = getHiddenFieldValue(field);
      });
    
    return values;
  }, [fields]);

  // Update responses with calculated and hidden field values
  useEffect(() => {
    // Update calculated field values in responses
    Object.entries(calculatedValues).forEach(([fieldId, value]) => {
      if (responses[fieldId] !== value) {
        onResponseChange(fieldId, value);
      }
    });

    // Update hidden field values in responses
    Object.entries(hiddenFieldValues).forEach(([fieldId, value]) => {
      if (value !== null && responses[fieldId] !== value) {
        onResponseChange(fieldId, value);
      }
    });
  }, [calculatedValues, hiddenFieldValues, responses, onResponseChange]);

  return {
    visibleFields,
    calculatedValues,
    formattedCalculatedValues,
    hiddenFieldValues,
    isFieldVisible,
    getCalculatedDisplay,
  };
}

export default useAdvancedFormFields;
