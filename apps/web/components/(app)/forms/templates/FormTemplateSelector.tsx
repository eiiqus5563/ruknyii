'use client';

import React, { useState } from 'react';
import { 
  Mail, 
  Wrench, 
  MessageSquare, 
  FileText,
  Globe,
  Check,
  ClipboardList,
  UserPlus,
  ShoppingBag,
  Star,
  HelpCircle,
  FormInput,
  Plus,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  FORM_TEMPLATES, 
  TEMPLATE_CATEGORIES,
  FormTemplate, 
  TemplateLanguage,
  TemplateCategory,
  convertTemplateToFields 
} from './templateData';
import type { FormFieldInput } from '../FieldEditor';

// ============================================
// Types
// ============================================

interface FormTemplateSelectorProps {
  selectedTemplateId: string | null;
  selectedLanguage: TemplateLanguage;
  onSelectTemplate: (templateId: string | null, fields: FormFieldInput[]) => void;
  onLanguageChange: (language: TemplateLanguage) => void;
  onStartFromScratch: () => void;
}

// ============================================
// Icon Map
// ============================================

const iconMap: Record<string, React.ElementType> = {
  'mail': Mail,
  'wrench': Wrench,
  'message-square': MessageSquare,
  'clipboard-list': ClipboardList,
  'user-plus': UserPlus,
  'shopping-bag': ShoppingBag,
  'star': Star,
  'help-circle': HelpCircle,
  'form-input': FormInput,
  'file-text': FileText,
  'calendar': CalendarDays,
};

// ============================================
// Color Map
// ============================================

const colorMap: Record<string, string> = {
  'blue':    'text-blue-500',
  'orange':  'text-orange-500',
  'purple':  'text-purple-500',
  'amber':   'text-amber-500',
  'emerald': 'text-emerald-500',
  'teal':    'text-teal-500',
  'indigo':  'text-indigo-500',
  'rose':    'text-rose-500',
};

// ============================================
// Component
// ============================================

export function FormTemplateSelector({
  selectedTemplateId,
  selectedLanguage,
  onSelectTemplate,
  onLanguageChange,
  onStartFromScratch,
}: FormTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');

  const handleSelectTemplate = (template: FormTemplate) => {
    const fields = convertTemplateToFields(template, selectedLanguage);
    onSelectTemplate(template.id, fields as FormFieldInput[]);
  };

  const handleLanguageChange = (language: TemplateLanguage) => {
    onLanguageChange(language);
    if (selectedTemplateId) {
      const template = FORM_TEMPLATES.find(t => t.id === selectedTemplateId);
      if (template) {
        const fields = convertTemplateToFields(template, language);
        onSelectTemplate(template.id, fields as FormFieldInput[]);
      }
    }
  };

  const filteredTemplates = activeCategory === 'all'
    ? FORM_TEMPLATES
    : FORM_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">اختر قالباً</h2>
        <p className="text-muted-foreground text-sm">
          ابدأ بقالب جاهز أو أنشئ من الصفر
        </p>
      </div>

      {/* Language + Category Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeCategory === 'all'
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {selectedLanguage === 'ar' ? 'الكل' : 'All'}
          </button>
          {(Object.entries(TEMPLATE_CATEGORIES) as [TemplateCategory, { ar: string; en: string }][]).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeCategory === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {value[selectedLanguage]}
            </button>
          ))}
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex rounded-full bg-muted p-0.5">
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                selectedLanguage === 'ar' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ع
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                selectedLanguage === 'en' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              En
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Start from Scratch */}
        <button
          type="button"
          onClick={onStartFromScratch}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-4 flex flex-col justify-center items-center gap-2.5 min-h-[130px] transition-all duration-200",
            selectedTemplateId === null 
              ? "border-foreground/50 bg-muted/30 shadow-sm" 
              : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            selectedTemplateId === null 
              ? "bg-foreground text-background" 
              : "bg-muted text-muted-foreground"
          )}>
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-foreground text-sm">من الصفر</span>
          {selectedTemplateId === null && (
            <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
              <Check className="w-3 h-3 text-background" />
            </div>
          )}
        </button>

        {/* Template Cards */}
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const IconComponent = iconMap[template.icon] || FileText;
          const iconColor = colorMap[template.color] || 'text-muted-foreground';
          
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className={cn(
                "relative rounded-2xl border p-4 text-right min-h-[130px] flex flex-col gap-2 transition-all duration-200",
                isSelected 
                  ? "border-foreground/50 bg-muted/30 shadow-sm" 
                  : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
              )}
            >
              {/* Icon */}
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  isSelected ? "bg-muted" : "bg-muted/60"
                )}>
                  <IconComponent className={cn("w-5 h-5", isSelected ? iconColor : 'text-muted-foreground')} />
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 text-background" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 mt-1">
                <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                  {template.name[selectedLanguage]}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {template.description[selectedLanguage]}
                </p>
              </div>

              {/* Field count */}
              <span className="text-[11px] text-muted-foreground/70 font-medium">
                {template.fields.length} {selectedLanguage === 'ar' ? 'حقل' : 'fields'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FormTemplateSelector;
