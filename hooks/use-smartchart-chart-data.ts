'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActiveSymbol, DerivWS } from '@deriv/core';
import {
  getMarketDisplayName,
  getSubmarketDisplayName,
  getSubgroupDisplayName,
} from '@/lib/active-symbols-display-names';

export interface SmartChartsSymbol {
  symbol: string;
  display_name: string;
  exchange_is_open: 0 | 1;
  is_trading_suspended: 0 | 1;
  market: string;
  market_display_name: string;
  pip: number;
  subgroup: string;
  subgroup_display_name: string;
  submarket: string;
  submarket_display_name: string;
  symbol_type: string;
}

export type TradingTimesMap = Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;

export interface SmartChartChartData {
  tradingTimes: TradingTimesMap;
  activeSymbols: SmartChartsSymbol[];
}

interface TradingTimesResponse {
  trading_times?: {
    markets?: Array<{
      submarkets?: Array<{
        symbols?: Array<{
          underlying_symbol?: string;
          symbol?: string;
          times: { open: string[]; close: string[] };
        }>;
      }>;
    }>;
  };
}

/**
 * Transforms the Deriv `trading_times: 'today'` response into the simplified
 * map SmartCharts' TradingTimes store expects. Every symbol the chart might
 * render needs an entry — otherwise `getDelayedMinutes()` throws on
 * `undefined.delay_amount` when the chart calls `fetchInitialData`.
 */
function buildTradingTimesMap(response: TradingTimesResponse): TradingTimesMap {
  const markets = response?.trading_times?.markets;
  if (!markets) return {};

  const map: TradingTimesMap = {};
  const now = new Date();
  const dateStr = now.toISOString().substring(0, 11);

  for (const market of markets) {
    market.submarkets?.forEach(submarket => {
      submarket.symbols?.forEach(symbolObj => {
        const symbol = symbolObj.underlying_symbol || symbolObj.symbol;
        const { times } = symbolObj;
        if (!symbol || !times) return;
        const { open, close } = times;
        const isOpenAllDay =
          open.length === 1 && open[0] === '00:00:00' && close[0] === '23:59:59';
        const isClosedAllDay = open.length === 1 && open[0] === '--' && close[0] === '--';

        let isOpen = isOpenAllDay;
        let openTime = '';
        let closeTime = '';

        if (!isClosedAllDay && open.length > 0 && close.length > 0) {
          openTime = `${dateStr}${open[0]}Z`;
          closeTime = `${dateStr}${close[0]}Z`;
          const openDate = new Date(openTime);
          const closeDate = new Date(closeTime);
          isOpen = now >= openDate && now < closeDate;
        }

        map[symbol] = { isOpen, openTime, closeTime };
      });
    });
  }
  return map;
}

/**
 * Produces the `chartData` SmartCharts expects — a combined payload of
 * `activeSymbols` (reshaped from `ActiveSymbol`) and `tradingTimes` (fetched
 * from the `trading_times: 'today'` endpoint). Returns `undefined` until both
 * parts are ready, so the chart mounts with a complete map and its internal
 * `getDelayedMinutes()` / `isFeedUnavailable()` calls don't crash.
 */
export function useSmartChartChartData(
  ws: DerivWS | null,
  isConnected: boolean,
  symbols: ActiveSymbol[]
): { chartData: SmartChartChartData | undefined } {
  const [tradingTimes, setTradingTimes] = useState<TradingTimesMap | undefined>();

  useEffect(() => {
    if (!ws || !isConnected) return;
    let cancelled = false;
    ws
      .send({ trading_times: 'today' })
      .then(response => {
        if (cancelled) return;
        setTradingTimes(buildTradingTimesMap(response as TradingTimesResponse));
      })
      .catch(() => {
        if (cancelled) return;
        setTradingTimes({});
      });
    return () => {
      cancelled = true;
    };
  }, [ws, isConnected]);

  const chartData = useMemo((): SmartChartChartData | undefined => {
    if (symbols.length === 0 || !tradingTimes) return undefined;
    // Pristine @deriv-com/smartcharts-champion@1.9.12 reads these fields without null
    // guards: `submarket_display_name.localeCompare(...)` and `pip.toString().length`
    // crash if either is missing. Keep every field defined.
    const activeSymbols: SmartChartsSymbol[] = symbols.map(s => ({
      symbol: s.underlying_symbol,
      display_name: s.underlying_symbol_name ?? s.underlying_symbol,
      exchange_is_open: s.exchange_is_open as 0 | 1,
      is_trading_suspended: s.is_trading_suspended as 0 | 1,
      market: s.market ?? '',
      market_display_name: s.market_display_name ?? getMarketDisplayName(s.market ?? ''),
      pip: s.pip_size ?? 0.01,
      subgroup: s.subgroup ?? '',
      subgroup_display_name: s.subgroup_display_name ?? getSubgroupDisplayName(s.subgroup ?? ''),
      submarket: s.submarket ?? '',
      submarket_display_name: s.submarket_display_name ?? getSubmarketDisplayName(s.submarket ?? ''),
      symbol_type: s.underlying_symbol_type ?? '',
    }));
    // Ensure every activeSymbol has a tradingTimes entry. Pristine v1.9.12's
    // `getDelayedMinutes()` does `_tradingTimesMap?.[symbol].delay_amount` — if
    // `symbol` is missing from the map, `.delay_amount` throws on undefined.
    const filledTradingTimes: TradingTimesMap = { ...tradingTimes };
    for (const s of activeSymbols) {
      if (!filledTradingTimes[s.symbol]) {
        filledTradingTimes[s.symbol] = {
          isOpen: !!s.exchange_is_open,
          openTime: '',
          closeTime: '',
        };
      }
    }
    return { tradingTimes: filledTradingTimes, activeSymbols };
  }, [tradingTimes, symbols]);

  return { chartData };
}
