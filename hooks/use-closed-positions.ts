'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DerivWS } from '@deriv/core';

export interface ClosedPosition {
  contract_id: number;
  contract_type: string;
  buy_price: number;
  sell_price: number;
  payout: number;
  longcode: string;
  underlying_symbol: string;
  purchase_time: number;
  sell_time: number;
  shortcode: string;
  transaction_id: number;
  duration_type: string | null;
}

interface ProfitTableResponse {
  profit_table: {
    count: number;
    transactions: ClosedPosition[];
  };
}

export function useClosedPositions(
  ws: DerivWS | null,
  isConnected: boolean,
  isAuthenticated: boolean
) {
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!ws || !isConnected || !isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await ws.send<ProfitTableResponse>({
        profit_table: 1,
        description: 1,
        sort: 'DESC',
        limit: 50,
      });
      setPositions(response.profit_table?.transactions ?? []);
    } catch {
      // silent — table simply stays empty on error
    } finally {
      setIsLoading(false);
    }
  }, [ws, isConnected, isAuthenticated]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { positions, isLoading, refresh: fetch };
}
