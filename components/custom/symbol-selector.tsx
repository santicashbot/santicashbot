'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ActiveSymbol } from '@deriv/core';
import { getSubmarketDisplayName } from '@/lib/active-symbols-display-names';
import { cn } from '@/lib/utils';
import { useAppTranslations } from '@/components/custom/i18n-provider';

interface SymbolSelectorProps {
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  onSymbolChange: (symbol: string) => void;
  /**
   * Recent price window for the active symbol (from useTicks). When provided
   * with 2+ points, the trigger shows a live market-movement indicator under
   * the symbol name — spot + tick-to-tick change + % with a green ▲ / red ▼ —
   * so users still see movement when the chart is hidden.
   */
  prices?: number[];
  /** Decimal places for the active symbol (pip size), used to format the spot. */
  pipSize?: number;
}

interface SymbolMovement {
  spot: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

/** Tick-to-tick movement of the active symbol, or null if there isn't enough data. */
function computeMovement(
  prices: number[] | undefined,
  pipSize: number | undefined
): SymbolMovement | null {
  if (!prices || prices.length < 2) return null;
  const spot = prices[prices.length - 1];
  const prev = prices[prices.length - 2];
  if (!Number.isFinite(spot) || !Number.isFinite(prev) || prev === 0) return null;
  const decimals = pipSize ?? 2;
  const delta = spot - prev;
  const pct = (delta / prev) * 100;
  const isUp = delta >= 0;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return {
    spot: spot.toFixed(decimals),
    change: `${sign}${Math.abs(delta).toFixed(decimals)}`,
    changePercent: `${Math.abs(pct).toFixed(2)}%`,
    isUp,
  };
}

type SubmarketGroup = { displayName: string; symbols: ActiveSymbol[] };

function groupBySubmarket(symbols: ActiveSymbol[]): Map<string, SubmarketGroup> {
  const groups = new Map<string, SubmarketGroup>();
  for (const symbol of symbols) {
    const key = symbol.submarket;
    const existing = groups.get(key);
    if (existing) {
      existing.symbols.push(symbol);
    } else {
      const displayName =
        symbol.submarket_display_name ?? getSubmarketDisplayName(symbol.submarket);
      groups.set(key, { displayName, symbols: [symbol] });
    }
  }
  return groups;
}

export function SymbolSelector({
  symbols,
  activeSymbol,
  onSymbolChange,
  prices,
  pipSize,
}: SymbolSelectorProps) {
  const { localize } = useAppTranslations();
  const grouped = useMemo(() => groupBySubmarket(symbols), [symbols]);
  const movement = useMemo(
    () => computeMovement(prices, pipSize),
    [prices, pipSize]
  );

  return (
    <Select
      value={activeSymbol?.underlying_symbol ?? ''}
      onValueChange={onSymbolChange}
    >
      {/* The direct child is a <div> (not a <span>) so the trigger's
          `[&>span]:line-clamp-1` rule can't collapse the stacked layout. */}
      <SelectTrigger className={cn('w-full', movement ? 'h-auto py-1.5' : undefined)}>
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <SelectValue placeholder={localize('Select a symbol')} />
          {movement && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-medium tabular-nums',
                movement.isUp ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {movement.spot} {movement.change} ({movement.changePercent})
              <span aria-hidden>{movement.isUp ? '▲' : '▼'}</span>
            </span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {Array.from(grouped.entries()).map(([submarket, { displayName, symbols: group }]) => (
          <SelectGroup key={submarket}>
            <SelectLabel>{displayName}</SelectLabel>
            {group.map((symbol) => (
              <SelectItem
                key={symbol.underlying_symbol}
                value={symbol.underlying_symbol}
              >
                {symbol.underlying_symbol_name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
