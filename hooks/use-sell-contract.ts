'use client';

import { useState, useCallback } from 'react';
import type { DerivWS } from '@deriv/core';
import { useAppTranslations } from '@/components/custom/i18n-provider';

interface SellResponse {
  sell: {
    contract_id: number;
    reference_id: number;
    sold_for: number;
    balance_after: number;
    transaction_id: number;
  };
}

export interface UseSellContractReturn {
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

export function useSellContract(
  ws: DerivWS | null,
  isConnected: boolean
): UseSellContractReturn {
  const { localize } = useAppTranslations();
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  const clearSellError = useCallback(() => setSellError(null), []);

  const sellContract = useCallback(
    async (contractId: number, bidPrice: string) => {
      if (!ws || !isConnected) return;

      setSellingId(contractId);
      setSellError(null);

      try {
        await ws.send<SellResponse>({
          sell: contractId,
          price: bidPrice,
        });
      } catch (err) {
        // Prefer API/Error message; localise only the app-authored fallback.
        setSellError(err instanceof Error ? err.message : localize('Sell failed'));
      } finally {
        setSellingId(null);
      }
    },
    [ws, isConnected, localize]
  );

  return { sellContract, sellingId, sellError, clearSellError };
}
