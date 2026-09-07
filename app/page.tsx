'use client';

import { useEffect, useState } from 'react';
import { LiveDigits } from '../components/live-digits';
import { normalizeAppConfig, type DigitsAppConfig } from '../lib/app-config';

/**
 * Deployed app. Reads the no-code config injected at deploy time
 * (public/app-config.json). When present, the configurable control styles/order
 * are applied; when absent, the standard Digits app renders unchanged. Either
 * way the app is fully functional (real trading + login).
 */
export default function DigitsPage() {
  const [config, setConfig] = useState<DigitsAppConfig | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${base}/app-config.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setConfig(data ? normalizeAppConfig(data) : null);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (config === undefined) return <div className="min-h-dvh bg-background" />;
  return <LiveDigits appConfig={config ?? undefined} />;
}
