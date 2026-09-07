import CRC32 from 'crc-32';
import { enUS, es, fr, pt } from 'date-fns/locale';
import i18next, { type i18n, type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['EN', 'ES', 'FR', 'PT'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type LocaleCatalog = Record<string, string>;

export type LocaleCatalogs = Record<SupportedLanguage, LocaleCatalog>;

/**
 * Template-owned persistence key. Must not collide with
 * `@deriv-com/translations`'s `i18n_language` (deriv-api-v2#557).
 */
export const LANGUAGE_STORAGE_KEY = 'deriv_template_i18n_language';

/** Key owned by `@deriv-com/translations` — templates must not write here. */
export const LIBRARY_LANGUAGE_STORAGE_KEY = 'i18n_language';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  EN: 'English',
  ES: 'Español',
  FR: 'Français',
  PT: 'Português',
};

/** BCP-47 tags for HTML lang and number formatting. */
export const LANGUAGE_LOCALES: Record<SupportedLanguage, string> = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  PT: 'pt',
};

/** date-fns locales used by date formatting and react-day-picker. */
export const DATE_FNS_LOCALES = {
  EN: enUS,
  ES: es,
  FR: fr,
  PT: pt,
} satisfies Record<SupportedLanguage, typeof enUS>;

const HASH_OPTIONS = {
  hashTransKey(value: string) {
    return CRC32.str(value).toString();
  },
  useSuspense: false as const,
};

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function normalizeLangToken(raw: string): string {
  return raw.trim().replace(/^"+|"+$/g, '').toUpperCase();
}

function parseStorageToken(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
  } catch {
    // fall through — value may be a bare code
  }
  return raw;
}

/**
 * Read a stored/query language and accept only EN|ES|FR|PT.
 * Corrupt or unsupported values fall back to EN.
 */
export function resolveSupportedLanguage(raw: string | null | undefined): SupportedLanguage {
  if (!raw) return 'EN';
  const normalized = normalizeLangToken(raw);
  return isSupportedLanguage(normalized) ? normalized : 'EN';
}

/**
 * Drop sticky unsupported codes from the library key (e.g. DE written by
 * `@deriv-com/translations` when `?lang=de` was present). Supported values are
 * left alone unless a template preference already exists under our key.
 */
export function scrubLibraryLanguageKey(): void {
  if (typeof window === 'undefined') return;
  try {
    const legacy = window.localStorage.getItem(LIBRARY_LANGUAGE_STORAGE_KEY);
    if (legacy == null) return;

    const token = normalizeLangToken(parseStorageToken(legacy));
    const hasTemplatePreference =
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY) != null;

    if (!isSupportedLanguage(token) || hasTemplatePreference) {
      window.localStorage.removeItem(LIBRARY_LANGUAGE_STORAGE_KEY);
    }
  } catch {
    window.localStorage.removeItem(LIBRARY_LANGUAGE_STORAGE_KEY);
  }
}

export function readStoredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'EN';

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('lang');
    if (fromQuery) {
      return resolveSupportedLanguage(fromQuery);
    }
  } catch {
    // ignore malformed search params
  }

  try {
    const owned = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (owned != null) {
      scrubLibraryLanguageKey();
      return resolveSupportedLanguage(parseStorageToken(owned));
    }

    const legacy = window.localStorage.getItem(LIBRARY_LANGUAGE_STORAGE_KEY);
    if (legacy == null) return 'EN';

    const legacyToken = normalizeLangToken(parseStorageToken(legacy));
    if (isSupportedLanguage(legacyToken)) {
      // One-time migrate off the shared library key so Bot/Trader cannot
      // clobber or leak the template preference (html lang).
      persistLanguage(legacyToken);
      return legacyToken;
    }

    // Unsupported sticky value from the library — drop it so later Bot/Trader
    // `initializeI18n` calls do not OTA-fetch `/translations/<code>.json`.
    window.localStorage.removeItem(LIBRARY_LANGUAGE_STORAGE_KEY);
    return 'EN';
  } catch {
    return 'EN';
  }
}

export function persistLanguage(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(lang));
  // Never mirror into the library key — Bot/Trader and the package own it.
  window.localStorage.removeItem(LIBRARY_LANGUAGE_STORAGE_KEY);
}

export function syncDocumentLang(lang: SupportedLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = LANGUAGE_LOCALES[lang];
}

function resourcesFromCatalogs(catalogs: LocaleCatalogs): Record<SupportedLanguage, ResourceLanguage> {
  return {
    EN: { translation: catalogs.EN },
    ES: { translation: catalogs.ES },
    FR: { translation: catalogs.FR },
    PT: { translation: catalogs.PT },
  };
}

/**
 * Create a seeded i18n instance. Catalogs are passed in (template-owned);
 * this module must not import template JSON itself.
 *
 * Uses a private i18next instance with resources inlined — never
 * `initializeI18n` / OTA backend — so unsupported `?lang` cannot trigger
 * `/translations/<code>.json` fetches or write `i18n_language` (deriv-api-v2#557).
 * Callers apply the stored language after mount.
 */
export function createSeededI18n(catalogs: LocaleCatalogs): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: 'EN',
    fallbackLng: 'EN',
    resources: resourcesFromCatalogs(catalogs),
    interpolation: { escapeValue: false },
    react: HASH_OPTIONS,
  });
  return instance;
}

export function hashTranslationKey(text: string): string {
  return CRC32.str(text).toString();
}

export function localizeWithInstance(
  instance: i18n,
  text: string,
  values: Record<string, unknown> = {}
): string {
  if (!text) return '';
  return instance.t(hashTranslationKey(text), {
    defaultValue: text,
    ...values,
  });
}
