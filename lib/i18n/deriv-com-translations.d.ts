declare module '@deriv-com/translations' {
  import type { i18n } from 'i18next';
  import type { ComponentType, ReactNode, JSX } from 'react';

  export function initializeI18n(options: {
    cdnUrl: string;
    useSuspense?: boolean;
    enableDebug?: boolean;
  }): i18n;

  export function getInitialLanguage(): string;

  export function getAllowedLanguages(
    excludeLanguages?: string[]
  ): Record<string, string>;

  export function localize(
    text: string,
    values?: Record<string, unknown>
  ): string;

  export type LocalizeProps = {
    i18n_default_text: string;
    values?: object;
    components?: JSX.Element[];
    options?: Record<string, unknown>;
    shouldUnescape?: boolean;
    i18n?: i18n;
  };

  export const Localize: ComponentType<LocalizeProps>;

  export function TranslationProvider(props: {
    defaultLang?: string;
    i18nInstance: i18n;
    children: ReactNode;
  }): JSX.Element | null;

  export function useTranslations(): {
    ready: boolean;
    localize: (text: string, values?: Record<string, unknown>) => string;
    instance: i18n;
    switchLanguage: (lang: string) => void;
    currentLang: string;
  };
}
