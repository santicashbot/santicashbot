/**
 * No-code Digits (no-chart) app config.
 *
 * Drives the EDITABLE parts of the real Digits app: the style variant of every
 * control (trade type, symbol picker, current tick, digit stats, contract mode,
 * stake, duration, prediction and buy) plus the order of the blocks. Digits has
 * NO chart, so every component is editable — the app header is the only fixed
 * element. The theme colour is handled by the existing branding pipeline
 * (globals.css --primary).
 *
 * When no config is present the app renders exactly as today (default below).
 */

import { isStyleVariant, normalizeBlockOrder } from '@/lib/no-code-config';
import type { StyleVariant } from '@/lib/no-code-config';

export type { StyleVariant };

/**
 * Styleable + reorderable control blocks (each has 3 style variants). There is
 * NO chart block — digits has no chart. The header stays fixed.
 */
export type ControlKey =
  | 'tradeType'
  | 'symbol'
  | 'tick'
  | 'digitStats'
  | 'contractMode'
  | 'stake'
  | 'duration'
  | 'prediction'
  | 'buy';

export interface DigitsAppConfig {
  styles: {
    tradeType: StyleVariant;
    symbol: StyleVariant;
    tick: StyleVariant;
    digitStats: StyleVariant;
    contractMode: StyleVariant;
    stake: StyleVariant;
    duration: StyleVariant;
    prediction: StyleVariant;
    buy: StyleVariant;
  };
  /** Top-to-bottom order of layout blocks. */
  order: ControlKey[];
  /**
   * Buy button options. `pinned` lifts the Buy button out of the scrolling
   * column into a bar at the bottom of the mobile layout, directly above the
   * footer. Desktop is unaffected — its controls card grows to fit, so the Buy
   * button is never scrolled out of reach there.
   */
  buy: {
    pinned: boolean;
  };
}

/** All control keys, in default order. */
export const ALL_CONTROL_KEYS: ControlKey[] = [
  'tradeType',
  'symbol',
  'tick',
  'digitStats',
  'contractMode',
  'stake',
  'duration',
  'prediction',
  'buy',
];

export const DEFAULT_APP_CONFIG: DigitsAppConfig = {
  styles: {
    tradeType: 'a',
    symbol: 'a',
    tick: 'a',
    digitStats: 'a',
    contractMode: 'a',
    stake: 'a',
    duration: 'a',
    prediction: 'a',
    buy: 'a',
  },
  order: [...ALL_CONTROL_KEYS],
  buy: { pinned: true },
};

/** Validate + normalise an arbitrary value into a safe DigitsAppConfig. */
export function normalizeAppConfig(value: unknown): DigitsAppConfig {
  if (!value || typeof value !== 'object') return DEFAULT_APP_CONFIG;
  const raw = value as Partial<DigitsAppConfig>;
  const pickVariant = (key: ControlKey): StyleVariant =>
    isStyleVariant(raw.styles?.[key]) ? raw.styles![key] : 'a';
  const styles: DigitsAppConfig['styles'] = {
    tradeType: pickVariant('tradeType'),
    symbol: pickVariant('symbol'),
    tick: pickVariant('tick'),
    digitStats: pickVariant('digitStats'),
    contractMode: pickVariant('contractMode'),
    stake: pickVariant('stake'),
    duration: pickVariant('duration'),
    prediction: pickVariant('prediction'),
    buy: pickVariant('buy'),
  };
  const order = normalizeBlockOrder(raw.order, ALL_CONTROL_KEYS);
  // A stored config with no `buy` key predates the pin option: keep that app
  // unpinned rather than adopting the new default on its owner's behalf.
  return { styles, order, buy: { pinned: !!raw.buy?.pinned } };
}
