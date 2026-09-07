'use client';

import { AppI18nProvider } from '@/components/custom/i18n-provider';
import type { LocaleCatalogs } from '@/lib/i18n';
import type { ReactNode } from 'react';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import pt from './pt.json';

const catalogs: LocaleCatalogs = {
  EN: en,
  ES: es,
  FR: fr,
  PT: pt,
};

export function TemplateI18nProvider({ children }: { children: ReactNode }) {
  return <AppI18nProvider catalogs={catalogs}>{children}</AppI18nProvider>;
}
