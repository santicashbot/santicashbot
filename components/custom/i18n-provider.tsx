'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { i18n as I18nInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import {
  createSeededI18n,
  localizeWithInstance,
  persistLanguage,
  readStoredLanguage,
  scrubLibraryLanguageKey,
  syncDocumentLang,
  type LocaleCatalogs,
  type SupportedLanguage,
} from '@/lib/i18n';

type AppI18nContextValue = {
  currentLang: SupportedLanguage;
  switchLanguage: (lang: SupportedLanguage) => void;
  localize: (text: string, values?: Record<string, unknown>) => string;
  instance: I18nInstance;
};

const AppI18nContext = createContext<AppI18nContextValue | null>(null);

type AppI18nProviderProps = {
  catalogs: LocaleCatalogs;
  children: ReactNode;
};

/**
 * Always-render i18n provider. Avoids package TranslationProvider's null-until-mount
 * gate. SSR and first client paint stay on EN; stored language applies after mount.
 */
export function AppI18nProvider({ catalogs, children }: AppI18nProviderProps) {
  const [instance] = useState(() => createSeededI18n(catalogs));
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('EN');

  useEffect(() => {
    syncDocumentLang('EN');
    // Drop sticky unsupported codes the library may have written under
    // `i18n_language` (e.g. DE from `?lang=de`) before we apply our preference.
    scrubLibraryLanguageKey();
    const stored = readStoredLanguage();
    if (stored === 'EN') {
      return;
    }
    void instance.changeLanguage(stored).then(() => {
      setCurrentLang(stored);
      syncDocumentLang(stored);
    });
  }, [instance]);

  const switchLanguage = useCallback(
    (lang: SupportedLanguage) => {
      void instance.changeLanguage(lang).then(() => {
        setCurrentLang(lang);
        persistLanguage(lang);
        syncDocumentLang(lang);
      });
    },
    [instance]
  );

  const localize = useCallback(
    (text: string, values: Record<string, unknown> = {}) => {
      // Keep callback identity aligned with the active catalog for consumers
      // that memoize translated labels on `localize`.
      void currentLang;
      return localizeWithInstance(instance, text, values);
    },
    [instance, currentLang]
  );

  const value = useMemo(
    () => ({
      currentLang,
      switchLanguage,
      localize,
      instance,
    }),
    [currentLang, switchLanguage, localize, instance]
  );

  return (
    <I18nextProvider i18n={instance}>
      <AppI18nContext.Provider value={value}>{children}</AppI18nContext.Provider>
    </I18nextProvider>
  );
}

export function useAppTranslations(): AppI18nContextValue {
  const context = useContext(AppI18nContext);
  if (!context) {
    throw new Error('useAppTranslations must be used within AppI18nProvider');
  }
  return context;
}
