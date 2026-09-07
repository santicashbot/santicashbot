'use client';

import { Localize } from '@deriv-com/translations';
import type { Tick } from '../lib/types';
import type { ActiveSymbol } from '../lib/types';

interface CurrentTickDisplayProps {
  tick: Tick | null;
  lastDigit: number | null;
  activeSymbol: ActiveSymbol | null;
  pipSize: number;
}

export function CurrentTickDisplay({
  tick,
  lastDigit,
  activeSymbol,
  pipSize,
}: CurrentTickDisplayProps) {
  if (!tick || !activeSymbol) {
    return (
      <div className="text-center py-3 sm:py-6">
        <div className="text-xl sm:text-2xl font-mono text-muted-foreground">---</div>
      </div>
    );
  }

  const priceStr = tick.quote.toFixed(pipSize);
  const priceWithoutLast = priceStr.slice(0, -1);
  const lastDigitStr = priceStr.slice(-1);

  return (
    <div className="text-center py-2 sm:py-4">
      <div className="text-xl sm:text-3xl font-mono font-bold tracking-wide">
        <span className="text-foreground">{priceWithoutLast}</span>
        <span className="text-primary text-2xl sm:text-4xl">{lastDigitStr}</span>
      </div>
      <div className="mt-1 sm:mt-2 inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
        <span>
          <Localize i18n_default_text="Last Digit:" />
        </span>
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {lastDigit}
        </span>
      </div>
    </div>
  );
}
