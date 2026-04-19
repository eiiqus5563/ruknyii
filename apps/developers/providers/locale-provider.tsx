'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { getTranslations, type Locale, type Translations } from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const validLocale = (locale === 'ar' ? 'ar' : 'en') as Locale;
  const t = getTranslations(validLocale);
  const dir = validLocale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    window.location.reload();
  }, []);

  return (
    <LocaleContext.Provider value={{ locale: validLocale, dir, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
