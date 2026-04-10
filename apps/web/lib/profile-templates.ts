/**
 * Profile Page Templates
 * Defines the available visual templates/themes for the public profile page.
 * The active template is stored in profile.themeKey and persisted via the API.
 */

export type TemplateKey = 'classic' | 'portfolio';

export interface ProfileTemplate {
  key: TemplateKey;
  name: string;
  description: string;
  /** Label shown on template badge */
  badge?: string;
  /** Feature list shown in the card */
  features: string[];
  /** Preview accent color used in mock thumbnail */
  previewColor: string;
  /** Preview gradient classes (Tailwind) */
  previewGradient: string;
}

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    key: 'classic',
    name: 'كلاسيكي',
    description: 'التصميم الافتراضي مع غلاف وشريط جانبي وتبويبات للروابط والمنتجات والفعاليات',
    badge: 'افتراضي',
    features: [
      'صورة غلاف عريضة',
      'شريط جانبي بالمعلومات',
      'تبويبات للمحتوى',
      'تأثيرات حركية',
    ],
    previewColor: '#0D9488',
    previewGradient: 'from-teal-500/20 to-teal-600/10',
  },
  {
    key: 'portfolio',
    name: 'بورتفوليو',
    description: 'تصميم احترافي مستوحى من مواقع المحافظ الشخصية، عمود واحد واسع بطباعة جريئة',
    badge: 'جديد',
    features: [
      'تصميم عمودي واسع',
      'طباعة جريئة',
      'تركيز على المحتوى',
    ],
    previewColor: '#111111',
    previewGradient: 'from-neutral-800/20 to-neutral-900/10',
  },
];

export function getTemplate(key: string): ProfileTemplate {
  return PROFILE_TEMPLATES.find((t) => t.key === key) ?? PROFILE_TEMPLATES[0];
}

export const DEFAULT_TEMPLATE_KEY: TemplateKey = 'classic';
