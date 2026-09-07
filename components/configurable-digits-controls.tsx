'use client';

/**
 * Config-driven Digits trade controls.
 *
 * Renders the SAME functional controls as the standard Digits app, but every
 * block (trade type, symbol picker, current tick, digit stats, contract mode,
 * stake, duration, prediction and buy) has 3 style variants, and the blocks
 * render in a configurable order. Fully functional (uses the real trading
 * handlers). Theme colour comes from the app's --primary (existing branding
 * pipeline), so `bg-primary` / `text-primary` pick it up automatically.
 *
 * HARD CONSTRAINT: every variant is composed ONLY from components the digits
 * template already uses — <Select>, <Input>, <Button>, <Label>, <ToggleGroup>,
 * <Skeleton>, the shared <TradeTypeChips> / <SymbolSelector>, and the template's
 * own <CurrentTickDisplay> / <DigitStatsBar>. No invented widgets.
 *
 * Used by the editor (/edit), preview (/preview) and the deployed app when a
 * DigitsAppConfig is present. The original DigitsView layout is untouched.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GripVertical, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import { Localize } from '@deriv-com/translations';
import { useRearrangeDrag } from '@/hooks/use-rearrange-drag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TradeTypeChips } from '@/components/custom/trade-type-chips';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { getSubmarketDisplayName } from '@/lib/active-symbols-display-names';
import { cn } from '@/lib/utils';
import type {
  ActiveSymbol,
  Tick,
  ProposalInfo,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import { CurrentTickDisplay } from './current-tick-display';
import { DigitStatsBar } from './digit-stats-bar';
import type { ContractMode, TradeType, DigitStats } from '../lib/types';
import type { ControlKey, DigitsAppConfig, StyleVariant } from '../lib/app-config';

/** Human labels shown on each draggable block in rearrange mode. */
function getBlockLabels(localize: (text: string) => string): Record<ControlKey, string> {
  return {
    tradeType: localize('Trade type'),
    symbol: localize('Symbol picker'),
    tick: localize('Current tick'),
    digitStats: localize('Digit stats'),
    contractMode: localize('Contract mode'),
    stake: localize('Stake'),
    duration: localize('Duration'),
    prediction: localize('Prediction'),
    buy: localize('Buy button'),
  };
}

function getDigitTradeTypeOptions(
  localize: (text: string) => string
): { value: TradeType; label: string }[] {
  return [
    { value: 'matches-differs', label: localize('Matches/Differs') },
    { value: 'over-under', label: localize('Over/Under') },
    { value: 'even-odd', label: localize('Even/Odd') },
  ];
}

function getContractModeOptions(
  localize: (text: string) => string
): Record<TradeType, { value: ContractMode; label: string }[]> {
  return {
    'matches-differs': [
      { value: 'DIGITMATCH', label: localize('Matches') },
      { value: 'DIGITDIFF', label: localize('Differs') },
    ],
    'over-under': [
      { value: 'DIGITOVER', label: localize('Over') },
      { value: 'DIGITUNDER', label: localize('Under') },
    ],
    'even-odd': [
      { value: 'DIGITEVEN', label: localize('Even') },
      { value: 'DIGITODD', label: localize('Odd') },
    ],
  };
}

function getPredictionText(
  contractMode: ContractMode,
  localize: (text: string) => string
): string {
  switch (contractMode) {
    case 'DIGITMATCH':
      return localize('match');
    case 'DIGITDIFF':
      return localize('differ from');
    case 'DIGITOVER':
      return localize('be over');
    case 'DIGITUNDER':
      return localize('be under');
    case 'DIGITEVEN':
      return localize('be even');
    case 'DIGITODD':
      return localize('be odd');
  }
}
function showDigitInPrediction(contractMode: ContractMode): boolean {
  return contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
}

/**
 * The Buy button, in its three configurable styles.
 *
 * Exported because the button has two homes: inline in the reorderable column
 * (the default), or lifted into the pinned bottom bar when `buy.pinned` is on —
 * and that bar is owned by the view, not by this component. One implementation
 * means the pinned button stays style-for-style identical to the inline one.
 */
export interface ConfigurableBuyButtonProps {
  variant: StyleVariant;
  isConnected: boolean;
  proposal: ProposalInfo | null;
  onBuy: () => void;
  isBuying: boolean;
}

export function ConfigurableBuyButton({
  variant,
  isConnected,
  proposal,
  onBuy,
  isBuying,
}: ConfigurableBuyButtonProps) {
  const { localize } = useAppTranslations();

  const disabled = !isConnected || !proposal || isBuying;
  const label = isBuying
    ? localize('Purchasing...')
    : proposal
      ? localize('Buy @ {{price}} USD', { price: proposal.askPrice.toFixed(2) })
      : localize('Buy Contract');

  const variants: Record<StyleVariant, () => React.ReactNode> = {
    // a — pill (current)
    a: () => (
      <Button
        className="h-10 w-full rounded-full px-6 sm:h-11 sm:px-8"
        disabled={disabled}
        onClick={onBuy}
      >
        {label}
      </Button>
    ),
    // Block — squared, bold.
    b: () => (
      <Button
        className="h-14 w-full rounded-md bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90"
        disabled={disabled}
        onClick={onBuy}
      >
        {label}
      </Button>
    ),
    // Gradient background.
    c: () => (
      <Button
        className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
        disabled={disabled}
        onClick={onBuy}
      >
        {label}
      </Button>
    ),
  };
  return (variants[variant] ?? variants.a)();
}

export interface ConfigurableDigitsControlsProps {
  config: DigitsAppConfig;

  // Market data
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  pipSize: number;

  // Trade controls
  tradeType: TradeType;
  onTradeTypeChange: (type: TradeType) => void;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  selectedDigit: number;
  onDigitSelect: (digit: number) => void;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  isConnected: boolean;
  isAuthenticated?: boolean;

  /** Edit mode — control blocks become selectable (click opens its accordion). */
  editMode?: boolean;
  /** Called when a control block is clicked in edit mode. */
  onSelect?: (key: ControlKey) => void;
  /** The currently selected control (highlighted). */
  selectedKey?: string | null;
  /** Rearrange mode — blocks become draggable to reorder the layout. */
  rearrangeMode?: boolean;
  /** Called with the new block order after a drag-drop reorder. */
  onReorder?: (order: ControlKey[]) => void;
  /**
   * Buy is pinned to the bottom bar, which the view owns — so skip it here
   * rather than rendering it inline. Also keeps it out of rearrange mode: a
   * pinned button has no position to drag.
   */
  pinBuy?: boolean;
}

export function ConfigurableDigitsControls(props: ConfigurableDigitsControlsProps) {
  const {
    config,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    lastDigit,
    digitStats,
    pipSize,
    tradeType,
    onTradeTypeChange,
    contractMode,
    onContractModeChange,
    selectedDigit,
    onDigitSelect,
    stake,
    onStakeChange,
    duration,
    onDurationChange,
    durationLimits,
    proposal,
    isProposalLoading,
    onBuy,
    isBuying,
    buyResult,
    buyError,
    onClearBuyResult,
    isConnected,
    isAuthenticated,
    editMode,
    onSelect,
    selectedKey,
    rearrangeMode,
    onReorder,
    pinBuy,
  } = props;

  const { localize } = useAppTranslations();
  const blockLabels = getBlockLabels(localize);
  const digitTradeTypeOptions = getDigitTradeTypeOptions(localize);
  const contractModeOptions = getContractModeOptions(localize);

  const rearrange = useRearrangeDrag<ControlKey>(config.order, (next) => onReorder?.(next));

  // Flash the draggable blocks once — the first time the layout is unlocked in
  // this session — so the user notices the components can be dragged.
  const [hasFlashed, setHasFlashed] = useState(false);
  useEffect(() => {
    if (!rearrangeMode || hasFlashed) return;
    const timer = window.setTimeout(() => setHasFlashed(true), 2000);
    return () => window.clearTimeout(timer);
  }, [rearrangeMode, hasFlashed]);

  // Scroll the selected control into view in edit mode.
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (!editMode || !selectedKey) return;
    const el = rowRefs.current[selectedKey];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [editMode, selectedKey]);

  useEffect(() => {
    if (buyError) {
      toast.error(localize('Purchase Failed'), { description: buyError });
      onClearBuyResult();
    }
  }, [buyError, onClearBuyResult, localize]);
  useEffect(() => {
    if (buyResult) {
      toast.success(localize('Contract Purchased'), {
        description: localize(
          'Buy price: {{buyPrice}} USD | Payout: {{payout}} USD | Balance: {{balance}} USD',
          {
            buyPrice: buyResult.buyPrice.toFixed(2),
            payout: buyResult.payout.toFixed(2),
            balance: buyResult.balanceAfter.toFixed(2),
          }
        ),
      });
      onClearBuyResult();
    }
  }, [buyResult, onClearBuyResult, localize]);

  // ── Trade type (3 styles) ───────────────────────────────────────────────
  // Real control = TradeTypeChips. Each variant calls onTradeTypeChange (which
  // keeps the setTradeType behaviour — it resets contract mode upstream).
  const renderTradeType = () => {
    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — pill chips (current)
      a: () => (
        <div className="overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TradeTypeChips
            value={tradeType}
            options={digitTradeTypeOptions}
            onValueChange={onTradeTypeChange}
          />
        </div>
      ),
      // Segmented — <ToggleGroup> styled like a segmented control.
      b: () => (
        <ToggleGroup
          type="single"
          value={tradeType}
          onValueChange={(value) => {
            const opt = digitTradeTypeOptions.find((option) => option.value === value);
            if (opt) onTradeTypeChange(opt.value);
          }}
          className="w-full gap-0 rounded-md bg-muted p-1"
        >
          {digitTradeTypeOptions.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="flex-1 rounded text-xs font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-semibold data-[state=on]:shadow-sm hover:text-foreground"
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ),
      // Dropdown — <Select>.
      c: () => (
        <Select
          value={tradeType}
          onValueChange={(value) => {
            const opt = digitTradeTypeOptions.find((option) => option.value === value);
            if (opt) onTradeTypeChange(opt.value);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {digitTradeTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    };
    return (variants[config.styles.tradeType] ?? variants.a)();
  };

  // ── Symbol picker (3 styles) ────────────────────────────────────────────
  // Real control = SymbolSelector. Every variant still switches symbols.
  const renderSymbol = () => {
    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — full dropdown (current)
      a: () => (
        <SymbolSelector
          symbols={symbols}
          activeSymbol={activeSymbol}
          onSymbolChange={selectSymbol}
        />
      ),
      // Compact pill — a narrow <Select> trigger rounded into a pill.
      b: () => (
        <Select
          value={activeSymbol?.underlying_symbol ?? ''}
          onValueChange={selectSymbol}
        >
          <SelectTrigger className="h-8 w-fit gap-1 rounded-full px-3 text-xs">
            <SelectValue placeholder={localize('Symbol')} />
          </SelectTrigger>
          <SelectContent>
            {renderSymbolGroups(symbols)}
          </SelectContent>
        </Select>
      ),
      // Dropdown with a leading market (chart) icon.
      c: () => (
        <Select
          value={activeSymbol?.underlying_symbol ?? ''}
          onValueChange={selectSymbol}
        >
          <SelectTrigger className="h-11 w-full">
            <span className="flex items-center gap-2">
              <LineChart className="h-4 w-4 shrink-0 text-primary" />
              <SelectValue placeholder={localize('Select a symbol')} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {renderSymbolGroups(symbols)}
          </SelectContent>
        </Select>
      ),
    };
    return (variants[config.styles.symbol] ?? variants.a)();
  };

  // ── Current tick (3 styles) ─────────────────────────────────────────────
  // Real control = CurrentTickDisplay. Same live tick data in every variant.
  const renderTick = () => {
    const priceStr = currentTick && activeSymbol ? currentTick.quote.toFixed(pipSize) : null;
    const priceWithoutLast = priceStr ? priceStr.slice(0, -1) : null;
    const lastDigitStr = priceStr ? priceStr.slice(-1) : null;

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — large number (current)
      a: () => (
        <div className="flex items-center justify-center">
          <CurrentTickDisplay
            tick={currentTick}
            lastDigit={lastDigit}
            activeSymbol={activeSymbol}
            pipSize={pipSize}
          />
        </div>
      ),
      // Compact inline — price + last-digit badge on one line.
      b: () => (
        <div className="flex items-center justify-center gap-2 py-2">
          {priceStr ? (
            <>
              <span className="font-mono text-lg font-semibold text-foreground">{priceWithoutLast}</span>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-base font-bold text-primary">
                {lastDigitStr}
              </span>
            </>
          ) : (
            <span className="font-mono text-lg text-muted-foreground">---</span>
          )}
        </div>
      ),
      // Last-digit badge emphasis.
      c: () => (
        <div className="flex flex-col items-center gap-1 py-2">
          {priceStr ? (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {lastDigit}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{priceStr}</span>
            </>
          ) : (
            <span className="font-mono text-lg text-muted-foreground">---</span>
          )}
        </div>
      ),
    };
    return (variants[config.styles.tick] ?? variants.a)();
  };

  // ── Digit stats + digit selection (3 styles) ────────────────────────────
  // Real control = DigitStatsBar (includes digit selection). All variants keep
  // onDigitSelect / selectedDigit, and digit stats only show for non-even/odd.
  const renderDigitStats = () => {
    if (tradeType === 'even-odd') return null;
    const maxPct = Math.max(...digitStats.percentages);
    const minPct = Math.min(...digitStats.percentages);

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — bars (current)
      a: () => (
        <DigitStatsBar
          digitStats={digitStats}
          selectedDigit={selectedDigit}
          onDigitSelect={onDigitSelect}
        />
      ),
      // Compact grid of 0–9 selectable <Button>s, each with its percentage.
      b: () => (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Last digit prediction" />
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {digitStats.percentages.map((pct, digit) => {
              const isSelected = digit === selectedDigit;
              const isHighest = digitStats.totalTicks > 0 && pct === maxPct;
              const isLowest = digitStats.totalTicks > 0 && pct === minPct;
              return (
                <Button
                  key={digit}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => onDigitSelect(digit)}
                  className={cn(
                    'flex h-12 flex-col items-center justify-center gap-0 rounded-lg p-0',
                    !isSelected && 'bg-muted/50 border-muted-foreground/20',
                  )}
                >
                  <span className="text-base font-semibold leading-none">{digit}</span>
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-[10px] leading-none',
                      isSelected
                        ? 'text-primary-foreground/80'
                        : isHighest
                          ? 'text-green-500 font-semibold'
                          : isLowest
                            ? 'text-red-500 font-semibold'
                            : 'text-muted-foreground',
                    )}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ),
      // Compact list — one selectable row per digit with its percentage.
      c: () => (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Last digit prediction" />
          </span>
          <div className="flex flex-col gap-1">
            {digitStats.percentages.map((pct, digit) => {
              const isSelected = digit === selectedDigit;
              const isHighest = digitStats.totalTicks > 0 && pct === maxPct;
              const isLowest = digitStats.totalTicks > 0 && pct === minPct;
              return (
                <Button
                  key={digit}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => onDigitSelect(digit)}
                  className={cn(
                    'flex h-8 w-full items-center justify-between px-3 text-sm font-medium',
                    !isSelected && 'bg-muted/50 border-muted-foreground/20',
                  )}
                >
                  <span>{digit}</span>
                  <span
                    className={cn(
                      'font-mono text-xs',
                      !isSelected && isHighest && 'text-green-500 font-semibold',
                      !isSelected && isLowest && 'text-red-500 font-semibold',
                    )}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ),
    };
    return (variants[config.styles.digitStats] ?? variants.a)();
  };

  // ── Contract mode (3 styles) ────────────────────────────────────────────
  // Real control = ToggleGroup. Every variant keeps onContractModeChange.
  const renderContractMode = () => {
    const modeOptions = contractModeOptions[tradeType];

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — segmented pill (current)
      a: () => (
        <ToggleGroup
          type="single"
          value={contractMode}
          onValueChange={(value) => {
            if (value) onContractModeChange(value as ContractMode);
          }}
          className="w-full gap-0 rounded-full bg-muted p-1"
        >
          {modeOptions.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ),
      // Two solid <Button>s.
      b: () => (
        <div className="flex gap-2">
          {modeOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={contractMode === opt.value ? 'default' : 'secondary'}
              className={cn(
                'flex-1 rounded-lg font-semibold',
                contractMode === opt.value && 'bg-primary text-primary-foreground',
              )}
              onClick={() => onContractModeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      ),
      // Outline chips.
      c: () => (
        <div className="flex gap-2">
          {modeOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={contractMode === opt.value ? 'default' : 'outline'}
              className={cn(
                'flex-1 rounded-full',
                contractMode === opt.value && 'bg-primary text-primary-foreground',
              )}
              onClick={() => onContractModeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      ),
    };
    return (variants[config.styles.contractMode] ?? variants.a)();
  };

  // ── Stake (3 styles) ────────────────────────────────────────────────────
  // Real control = USD <Input>.
  const renderStake = () => {
    const current = parseFloat(stake) || 0;
    const setStakeNum = (amount: number) => onStakeChange(String(Math.max(0, amount)));
    const stakeInput = (extraClass?: string) => (
      <Input
        id="stake"
        type="number"
        value={stake}
        onChange={(event) => onStakeChange(event.target.value)}
        onKeyDown={(event) => {
          if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
        }}
        min={0}
        step="0.01"
        labelRight="USD"
        className={extraClass}
      />
    );

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — plain <Input> (current)
      a: () => (
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Stake" />
          </Label>
          {stakeInput()}
        </div>
      ),
      // <Input> flanked by −/+ <Button> steppers.
      b: () => (
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Stake" />
          </Label>
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setStakeNum(current - 1)}>−</Button>
            <div className="flex-1">{stakeInput('text-center')}</div>
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setStakeNum(current + 1)}>+</Button>
          </div>
        </div>
      ),
      // Preset chip <Button>s + <Input>.
      c: () => (
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Stake" />
          </Label>
          <div className="flex gap-2">
            {['5', '10', '25', '50'].map((preset) => (
              <Button
                key={preset}
                variant={stake === preset ? 'default' : 'outline'}
                size="sm"
                className={cn('flex-1', stake === preset && 'bg-primary text-primary-foreground')}
                onClick={() => onStakeChange(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          {stakeInput()}
        </div>
      ),
    };
    return (variants[config.styles.stake] ?? variants.a)();
  };

  // ── Duration (3 styles) ─────────────────────────────────────────────────
  // Real control = ticks <Input>.
  const renderDuration = () => {
    const clamp = (amount: number) => Math.min(durationLimits.max, Math.max(durationLimits.min, amount));
    const setDurationNum = (amount: number) => onDurationChange(clamp(amount));
    const durationInput = (extraClass?: string) => (
      <Input
        id="duration"
        type="number"
        value={duration}
        onChange={(event) => {
          const val = parseInt(event.target.value, 10);
          if (!isNaN(val)) onDurationChange(val);
        }}
        min={durationLimits.min}
        max={durationLimits.max}
        step={1}
        labelRight={localize('Ticks')}
        className={extraClass}
      />
    );

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — plain <Input> (current)
      a: () => (
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Duration" />
          </Label>
          {durationInput()}
        </div>
      ),
      // <Input> flanked by −/+ <Button> steppers.
      b: () => (
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Duration" />
          </Label>
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setDurationNum(duration - 1)}>−</Button>
            <div className="flex-1">{durationInput('text-center')}</div>
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setDurationNum(duration + 1)}>+</Button>
          </div>
        </div>
      ),
      // Preset chip <Button>s (1/5/10) + <Input>.
      c: () => (
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Duration" />
          </Label>
          <div className="flex gap-2">
            {[1, 5, 10].map((preset) => (
              <Button
                key={preset}
                variant={duration === preset ? 'default' : 'outline'}
                size="sm"
                className={cn('flex-1', duration === preset && 'bg-primary text-primary-foreground')}
                onClick={() => setDurationNum(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          {durationInput()}
        </div>
      ),
    };
    return (variants[config.styles.duration] ?? variants.a)();
  };

  // ── Prediction + payout (3 styles) ──────────────────────────────────────
  // Real control = the bordered prediction box. Same data in every variant.
  const renderPrediction = () => {
    const predictionText = getPredictionText(contractMode, localize);
    const showDigit = showDigitInPrediction(contractMode);
    const payoutEl =
      proposal || isProposalLoading ? (
        isProposalLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <span className="text-sm font-bold text-foreground">{proposal!.payout.toFixed(2)} USD</span>
        )
      ) : null;

    const variants: Record<StyleVariant, () => React.ReactNode> = {
      // a — bordered box (current)
      a: () => (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2 sm:space-y-2 sm:p-3">
          <p className="mb-0 text-[11px] text-muted-foreground sm:mb-1 sm:text-xs">
            <Localize i18n_default_text="Prediction" />
          </p>
          <p className="text-xs font-medium sm:text-sm">
            <Localize i18n_default_text="Last digit of the price will" />{' '}
            <span className="text-primary font-bold">{predictionText}</span>
            {showDigit && (
              <>
                {' '}
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {selectedDigit}
                </span>
              </>
            )}
          </p>
          {(proposal || isProposalLoading) && (
            <div className="flex items-center justify-between border-t border-border pt-1">
              <span className="text-xs text-muted-foreground">
                <Localize i18n_default_text="Payout" />
              </span>
              {payoutEl}
            </div>
          )}
        </div>
      ),
      // Inline one-line — prediction on the left, payout on the right.
      b: () => (
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="font-medium">
            <Localize i18n_default_text="Last digit will" />{' '}
            <span className="text-primary font-bold">{predictionText}</span>
            {showDigit && (
              <>
                {' '}
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {selectedDigit}
                </span>
              </>
            )}
          </span>
          {payoutEl}
        </div>
      ),
      // Minimal — a full-width compact bar: prediction (digit) left, payout right.
      c: () => (
        <div className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="font-medium">
            <Localize i18n_default_text="Will" />{' '}
            <span className="text-primary font-bold">{predictionText}</span>
            {showDigit && (
              <>
                {' '}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {selectedDigit}
                </span>
              </>
            )}
          </span>
          {payoutEl ?? (
            <span className="text-muted-foreground">
              <Localize i18n_default_text="Payout" />
            </span>
          )}
        </div>
      ),
    };
    return (variants[config.styles.prediction] ?? variants.a)();
  };

  // ── Buy (3 styles, themed) ──────────────────────────────────────────────
  // Real control = the <Button>. Returns null when the Buy button is pinned:
  // the view renders it in the bottom bar, and every block loop below skips a
  // renderer that returns null.
  const renderBuy = () =>
    pinBuy ? null : (
      <ConfigurableBuyButton
        variant={config.styles.buy}
        isConnected={isConnected}
        proposal={proposal}
        onBuy={onBuy}
        isBuying={isBuying}
      />
    );

  const renderers: Record<ControlKey, () => React.ReactNode> = {
    tradeType: renderTradeType,
    symbol: renderSymbol,
    tick: renderTick,
    digitStats: renderDigitStats,
    contractMode: renderContractMode,
    stake: renderStake,
    duration: renderDuration,
    prediction: renderPrediction,
    buy: renderBuy,
  };

  if (editMode && rearrangeMode) {
    // Rearrange mode: every block is draggable. Inner content is inert so
    // dragging never triggers a control.
    return (
      <div className="w-full space-y-2">
        {config.order.map((key) => {
          const content = renderers[key]();
          if (content === null) return null;
          const dragging = rearrange.draggingKey === key;
          const over = rearrange.overKey === key;
          return (
            <div
              key={key}
              {...rearrange.getItemProps(key)}
              className={cn(
                'group relative cursor-grab rounded-xl border-2 border-dashed bg-card/40 transition-all active:cursor-grabbing',
                !hasFlashed && 'nocode-drag-hint',
                'border-border',
                !rearrange.isDragging && 'hover:border-primary/60 hover:bg-primary/5 hover:shadow-sm',
                over && 'border-primary bg-primary/10 ring-2 ring-primary/40',
                dragging && 'opacity-40',
              )}
            >
              <div
                className={cn(
                  'absolute left-2 top-2 z-[70] flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border transition-colors',
                  !rearrange.isDragging && 'group-hover:text-primary group-hover:ring-primary/40',
                  over && 'text-primary ring-primary/40',
                )}
              >
                <GripVertical className="h-3.5 w-3.5" />
                {blockLabels[key]}
              </div>
              <div className="absolute inset-0 z-[60]" />
              <div
                inert={editMode || undefined}
                className="pointer-events-none select-none px-2 pb-2 pt-9"
              >
                {content}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (editMode) {
    // Each block is selectable: clicking opens its accordion in the dashboard.
    return (
      <div className="w-full space-y-3">
        {config.order.map((key) => {
          const content = renderers[key]();
          if (content === null) return null;
          const selected = selectedKey === key;
          return (
            <button
              key={key}
              type="button"
              ref={(el) => {
                rowRefs.current[key] = el;
              }}
              onClick={() => onSelect?.(key)}
              className={[
                'group relative block w-full rounded-xl border-2 bg-background p-3 text-left shadow-sm transition-colors',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60',
              ].join(' ')}
            >
              <div
                className={[
                  'pointer-events-none absolute inset-0 z-10 rounded-xl bg-primary/10 transition-opacity',
                  selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                ].join(' ')}
              />
              {/* `inert`, not just pointer-events-none: that only removes the
                  subtree from POINTER hit-testing, so the real Buy <button>
                  inside keeps tabIndex 0 and Enter/Space still fires its
                  onClick — and /edit is the live app on a real account. The
                  pinned bar got this in 9804954; the column needs it for the
                  same reason. The row <button> around this stays interactive,
                  so selecting the block still works. */}
              <div inert={editMode || undefined} className="pointer-events-none">
                {content}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 lg:space-y-4">
      {config.order.map((key) => {
        const content = renderers[key]();
        if (content === null) return null;
        return <div key={key}>{content}</div>;
      })}
      {isAuthenticated && (
        <Button asChild variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">
          <Link href="/reports">
            <Localize i18n_default_text="View your positions →" />
          </Link>
        </Button>
      )}
    </div>
  );
}

/** Shared submarket-grouped <SelectItem>s for the symbol-picker variants. */
function renderSymbolGroups(symbols: ActiveSymbol[]) {
  const groups = new Map<string, { displayName: string; symbols: ActiveSymbol[] }>();
  for (const symbol of symbols) {
    const key = symbol.submarket;
    const existing = groups.get(key);
    if (existing) {
      existing.symbols.push(symbol);
    } else {
      groups.set(key, {
        displayName: symbol.submarket_display_name ?? getSubmarketDisplayName(symbol.submarket),
        symbols: [symbol],
      });
    }
  }
  return Array.from(groups.entries()).map(([submarket, { displayName, symbols: group }]) => (
    <SelectGroup key={submarket}>
      <SelectLabel>{displayName}</SelectLabel>
      {group.map((symbol) => (
        <SelectItem key={symbol.underlying_symbol} value={symbol.underlying_symbol}>
          {symbol.underlying_symbol_name}
        </SelectItem>
      ))}
    </SelectGroup>
  ));
}
