'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useActiveSymbols, useTicks } from '@deriv/core';
import type { DerivWS, ActiveSymbol, Tick, DurationLimits, ContractInfo } from '@deriv/core';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { useOpenPositions, type OpenPosition } from './use-open-positions';
import { useClosedPositions, type ClosedPosition } from './use-closed-positions';
import { useSellContract } from './use-sell-contract';

export interface UseBaseTradingParams {
  /** Shared WebSocket instance from DerivWSProvider. */
  ws: DerivWS | null;
  isConnected: boolean;
  /** True when the WS has exhausted all reconnect attempts. */
  isExhausted?: boolean;
  /** True when the user is authenticated (wsUrl is set). Used to gate auth-only calls. */
  isAuthenticated: boolean;
  onAuthWSFailed?: () => void;
  /** Contract types used to filter available symbols and duration limits. */
  contractTypes: string[];
}

export interface UseBaseTradingReturn {
  /** Underlying WebSocket instance — pass to useBuy / useProposal in the template. */
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  /** Raw price history — useful for chart rendering and stat computation. */
  prices: number[];
  pipSize: number;
  contracts: ContractInfo[];
  contractsAvailable: boolean;
  durationLimits: DurationLimits;
  defaultStake: number;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  refreshClosedPositions: () => Promise<void>;
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

/**
 * Generic trading foundation shared across all template types.
 *
 * Accepts the shared WS instance from DerivWSProvider rather than creating its
 * own, so the connection persists across page navigations.
 */
export function useBaseTrading({
  ws,
  isConnected,
  isExhausted,
  isAuthenticated,
  onAuthWSFailed,
  contractTypes,
}: UseBaseTradingParams): UseBaseTradingReturn {
  const { localize } = useAppTranslations();

  // When the authenticated WS exhausts all reconnect attempts, fall back to
  // the public WS by triggering logout.
  useEffect(() => {
    if (isExhausted && ws) {
      onAuthWSFailed?.();
    }
  }, [isExhausted, ws, onAuthWSFailed]);

  const {
    symbols,
    activeSymbol,
    selectSymbol,
    contracts,
    contractsAvailable,
    durationLimits,
    defaultStake,
    isLoading: symbolsLoading,
  } = useActiveSymbols(ws, isConnected, contractTypes);

  const { currentTick, prices, pipSize } = useTicks(ws, isConnected, activeSymbol);

  // Surface WS-level errors as toasts. Buy and sell errors are handled by
  // their own hooks and are excluded here to avoid double-reporting.
  useEffect(() => {
    if (!ws || !isConnected) return;
    return ws.onMessage(data => {
      if (!data.error) return;
      const msgType = data.msg_type as string | undefined;
      if (msgType === 'buy' || msgType === 'sell') return;
      const err = data.error as Record<string, string>;
      toast.error(localize('Error'), {
        // API message when present; app-authored fallback otherwise.
        description: err.message ?? localize('Unexpected error occurred. Please try again.'),
      });
    });
  }, [ws, isConnected, localize]);

  const { positions: openPositions } = useOpenPositions(ws, isConnected, isAuthenticated);

  const { positions: closedPositions, refresh: refreshClosedPositions } = useClosedPositions(
    ws,
    isConnected,
    isAuthenticated
  );

  const {
    sellContract: sellContractRaw,
    sellingId,
    sellError,
    clearSellError,
  } = useSellContract(ws, isConnected);

  // Refresh the closed-positions table after each successful sell.
  const sellContract = useCallback(
    async (contractId: number, bidPrice: string) => {
      await sellContractRaw(contractId, bidPrice);
      await refreshClosedPositions();
    },
    [sellContractRaw, refreshClosedPositions]
  );

  return {
    ws,
    isConnected,
    isLoading: !isConnected || symbolsLoading,
    error: null,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    contracts,
    contractsAvailable,
    durationLimits,
    defaultStake,
    openPositions,
    closedPositions,
    refreshClosedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  };
}
