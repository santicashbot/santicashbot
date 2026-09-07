'use client';

import { useEffect, useRef, useState } from 'react';
import { Localize } from '@deriv-com/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OpenPosition } from '@/hooks/use-open-positions';
import { getSymbolDisplayName } from '@/lib/active-symbols-display-names';
import { useAppTranslations } from '@/components/custom/i18n-provider';

interface OpenPositionCardProps {
  pos: OpenPosition;
  isSelling: boolean;
  onSell: (contractId: number, bidPrice: string) => Promise<void>;
  contractTypeLabels: Record<string, string>;
}

function getDirectionDisplay(
  contractType: string,
  labels: Record<string, string>
): { label: string } {
  const label = labels[contractType] ?? contractType;
  return { label };
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function usePositionTimer(pos: OpenPosition) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = pos.date_start;
  const expiry = pos.date_expiry;
  const total = expiry - start;
  const elapsed = now - start;
  const remaining = expiry - now;
  const progress = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
  const isExpired = remaining <= 0;

  return { elapsed, remaining, progress, isExpired };
}

export function OpenPositionCard({
  pos,
  isSelling,
  onSell,
  contractTypeLabels,
}: OpenPositionCardProps) {
  const { localize } = useAppTranslations();
  const { label: dirLabel } = getDirectionDisplay(pos.contract_type, contractTypeLabels);
  const profit = parseFloat(pos.profit);
  const isProfit = profit >= 0;
  const bidPrice = parseFloat(pos.bid_price);
  const buyPrice = parseFloat(pos.buy_price);
  const payout = parseFloat(pos.payout);
  const { elapsed, progress } = usePositionTimer(pos);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Row 1: Symbol + Direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
            <span className="text-xs font-bold text-foreground">{pos.underlying_symbol}</span>
          </div>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {getSymbolDisplayName(pos.underlying_symbol)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span>{dirLabel}</span>
        </div>
      </div>

      {/* Row 2: Timer + Progress bar */}
      <div className="space-y-1.5">
        <span className="text-sm font-mono text-foreground">{formatDuration(elapsed)}</span>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Row 3: Currency badge */}
      <div>
        <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md font-medium">
          {pos.currency}
        </Badge>
      </div>

      {/* Row 4–5: Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <Localize i18n_default_text="Total profit/loss:" />
          </p>
          <p
            className={cn(
              'text-base font-bold flex items-center gap-1',
              isProfit ? 'text-emerald-500' : 'text-destructive'
            )}
          >
            {isProfit ? '+' : ''}
            {profit.toFixed(2)}
            <span className={cn('text-sm', isProfit ? 'text-emerald-500' : 'text-destructive')}>
              {isProfit ? '▲' : '▼'}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <Localize i18n_default_text="Contract value:" />
          </p>
          <p
            className={cn(
              'text-base font-bold flex items-center gap-1',
              isProfit ? 'text-emerald-500' : 'text-destructive'
            )}
          >
            {bidPrice.toFixed(2)}
            <span className={cn('text-sm', isProfit ? 'text-emerald-500' : 'text-destructive')}>{isProfit ? '▲' : '▼'}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <Localize i18n_default_text="Stake:" />
          </p>
          <p className="text-base font-bold text-foreground">{buyPrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <Localize i18n_default_text="Potential payout:" />
          </p>
          <p className="text-base font-bold text-foreground">{payout.toFixed(2)}</p>
        </div>
      </div>

      {/* Sell button */}
      <Button
        variant="outline"
        className="w-full rounded-full"
        disabled={isSelling || pos.is_valid_to_sell !== 1}
        onClick={() => onSell(pos.contract_id, pos.bid_price)}
      >
        {isSelling ? localize('Selling...') : localize('Sell')}
      </Button>
    </div>
  );
}
