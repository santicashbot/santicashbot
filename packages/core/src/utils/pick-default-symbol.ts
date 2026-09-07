import type { ActiveSymbol } from '../types';

const DEFAULT_SYMBOL = '1HZ100V';

const isOpen = (s: ActiveSymbol) => s.exchange_is_open === 1;

const fromFavorites = (symbols: ActiveSymbol[]): ActiveSymbol | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem('cq-favorites');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const favorites: string[] = parsed['chartTitle&Comparison'] ?? [];
    for (const fav of favorites) {
      const match = symbols.find((s) => s.underlying_symbol === fav && isOpen(s));
      if (match) return match;
    }
  } catch {
    // malformed localStorage entry — ignore
  }
  return undefined;
};

/**
 * Picks the best default symbol from a list of active symbols using the same
 * priority waterfall as deriv-com/deriv-app:
 *
 * 1. `preferredSymbol` arg (e.g. from URL ?symbol= param) — if open
 * 2. First open symbol from the user's SmartChart cq-favorites
 * 3. 1HZ100V (Volatility 100 1s Index) — if open
 * 4. First open symbol in the random_index submarket
 * 5. First open symbol in the major_pairs submarket
 * 6. Any major_pairs symbol (regardless of exchange_is_open)
 * 7. First symbol in the list (absolute fallback)
 */
export function pickDefaultSymbol(
  symbols: ActiveSymbol[],
  preferredSymbol?: string
): ActiveSymbol {
  if (!symbols.length) throw new Error('No active symbols available');

  // 1. Preferred symbol (URL param / stored value) — must be open
  if (preferredSymbol) {
    const match = symbols.find((s) => s.underlying_symbol === preferredSymbol && isOpen(s));
    if (match) return match;
  }

  // 2. User's chart favorites (first open match)
  const fav = fromFavorites(symbols);
  if (fav) return fav;

  // 3. 1HZ100V if open
  const volatility100_1s = symbols.find((s) => s.underlying_symbol === DEFAULT_SYMBOL && isOpen(s));
  if (volatility100_1s) return volatility100_1s;

  // 4. First open random_index symbol
  const randomIndex = symbols.find((s) => s.submarket === 'random_index' && isOpen(s));
  if (randomIndex) return randomIndex;

  // 5. First open major_pairs symbol
  const majorPairsOpen = symbols.find((s) => s.submarket === 'major_pairs' && isOpen(s));
  if (majorPairsOpen) return majorPairsOpen;

  // 6. Any major_pairs symbol (market may be closed)
  const majorPairsAny = symbols.find((s) => s.submarket === 'major_pairs');
  if (majorPairsAny) return majorPairsAny;

  // 7. Absolute fallback
  return symbols[0];
}
