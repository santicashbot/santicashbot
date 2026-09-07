'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/lib/i18n';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { useState } from 'react';

export function LanguageSwitcher() {
  const { currentLang, switchLanguage } = useAppTranslations();
  const [open, setOpen] = useState(false);

  const handleSelect = (lang: SupportedLanguage) => {
    switchLanguage(lang);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[4.5rem] justify-between gap-1.5 px-2.5"
          aria-label={LANGUAGE_LABELS[currentLang]}
        >
          <span className="text-xs font-semibold tracking-wide">{currentLang}</span>
          <svg
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>
      {/* Above edit-mode FixedZones (z-[60]); shared PopoverContent is z-50. */}
      <PopoverContent align="end" className="z-[100] w-44 p-1">
        <ul className="space-y-0.5">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                onClick={() => handleSelect(lang)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  lang === currentLang ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                )}
              >
                <span>{LANGUAGE_LABELS[lang]}</span>
                <span className="text-xs text-muted-foreground">{lang}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
