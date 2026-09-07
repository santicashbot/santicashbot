import type { DigitStats } from './types';

/**
 * Derive the number of decimal places from a pip value.
 * E.g., 0.01 → 2, 0.001 → 3, 1 → 0
 */
export function pipSizeFromPip(pip: number): number {
  if (pip >= 1) return 0;
  const str = pip.toString();
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return 0;
  return str.length - dotIndex - 1;
}

/**
 * Extract the last digit from a price value.
 * Uses pipSize (number of decimal places) to correctly format the price,
 * since JS drops trailing zeros (e.g., 876.50 → "876.5").
 */
export function getLastDigit(price: number, pipSize: number): number {
  const priceStr = price.toFixed(pipSize);
  const lastChar = priceStr[priceStr.length - 1];
  return parseInt(lastChar, 10);
}

/**
 * Compute digit statistics (counts and percentages) from an array of prices.
 */
export function computeDigitStats(prices: number[], pipSize: number): DigitStats {
  const counts = new Array(10).fill(0);

  for (const price of prices) {
    const digit = getLastDigit(price, pipSize);
    counts[digit]++;
  }

  const totalTicks = prices.length;
  const percentages = counts.map((count) =>
    totalTicks > 0 ? (count / totalTicks) * 100 : 0
  );

  return { counts, percentages, totalTicks };
}

/**
 * Update digit stats incrementally when a new tick arrives.
 * Maintains a sliding window of the last `windowSize` ticks.
 */
export function updateDigitStats(
  prices: number[],
  newPrice: number,
  windowSize: number
): number[] {
  const updated = [...prices, newPrice];
  if (updated.length > windowSize) {
    updated.shift();
  }
  return updated;
}
