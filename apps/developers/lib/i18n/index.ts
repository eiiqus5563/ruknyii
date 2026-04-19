import type { Locale } from './config';
import type { Translations } from './en';
import en from './en';
import ar from './ar';

const dictionaries: Record<Locale, Translations> = { en, ar };

export function getTranslations(locale: Locale): Translations {
  return dictionaries[locale] ?? dictionaries.en;
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export type { Translations, Locale };
export { locales, defaultLocale, isValidLocale } from './config';
