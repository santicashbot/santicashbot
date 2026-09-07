'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DerivWS } from '@deriv/core';

export interface OpenPosition {
  contract_id: number;
  contract_type: string;
  buy_price: string;
  bid_price: string;
  payout: string;
  profit: string;
  profit_percentage: number;
  longcode: string;
  underlying_symbol: string;
  barrier: string | undefined;
  currency: string;
  date_start: number;
  date_expiry: number;
  status: string;
  is_expired: number;
  is_sold: number;
  is_valid_to_sell: number;
  tick_count: number;
  /** Live tick stream for a running tick contract — each entry is one elapsed tick. */
  tick_stream?: Array<{ epoch: number; tick: number; tick_display_value: string }>;
  /** Entry spot price — used for chart marker positioning. */
  entry_spot?: number;
  /** Entry tick epoch (seconds) — may differ slightly from date_start. */
  entry_tick_time?: number;
  /** Current spot epoch — used as the live currentEpoch for chart markers. */
  current_spot_time?: number;
  /** Exit spot price — populated on the final POC update when a contract closes. */
  exit_spot?: number;
  /** Exit spot epoch — populated on the final POC update when a contract closes. */
  exit_spot_time?: number;
}

// How long (ms) to keep a just-closed position in state so SmartCharts can
// render the exit spot and P&L label markers before removing it.
const CLOSED_POSITION_TTL_MS = 1500;

export function useOpenPositions(
  ws: DerivWS | null,
  isConnected: boolean,
  isAuthenticated: boolean
) {
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  // Track pending removal timers keyed by contract_id
  const removalTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Track whether we have an active subscription so we can forget_all on cleanup
  const isSubscribedRef = useRef(false);

  const scheduleRemoval = useCallback((contractId: number) => {
    // Cancel any existing timer for this contract first
    const existing = removalTimers.current.get(contractId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setPositions((prev) => prev.filter((p) => p.contract_id !== contractId));
      removalTimers.current.delete(contractId);
    }, CLOSED_POSITION_TTL_MS);

    removalTimers.current.set(contractId, timer);
  }, []);

  useEffect(() => {
    if (!ws || !isConnected || !isAuthenticated) {
      return () => { setPositions([]); };
    }

    // Capture ref value at effect time so the cleanup closure has a stable reference
    const timers = removalTimers.current;

    // Use global message listener — each open contract has its own subscription.id
    // so we can't use ws.subscribe() for all of them; onMessage catches everything.
    const unsubscribeListener = ws.onMessage((data) => {
      if (data.msg_type !== 'proposal_open_contract') return;
      const contract = data.proposal_open_contract as OpenPosition | undefined;
      if (!contract) return;

      const isClosed =
        !!contract.is_sold || !!contract.is_expired || contract.status !== 'open';

      setPositions((prev) => {
        const map = new Map(prev.map((p) => [p.contract_id, p]));
        // Always upsert the latest data (including exit_spot/exit_spot_time on close)
        map.set(contract.contract_id, contract);
        return Array.from(map.values());
      });

      if (isClosed) {
        // Schedule removal after TTL so exit markers are briefly visible
        scheduleRemoval(contract.contract_id);
      }
    });

    // Kick off subscription — server sends one message per open contract,
    // each with its own subscription.id for live updates.
    ws.send({ proposal_open_contract: 1, subscribe: 1 })
      .then(() => { isSubscribedRef.current = true; })
      .catch(() => {});

    return () => {
      unsubscribeListener();
      // Clear all pending removal timers on cleanup
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setPositions([]);
      // Cancel all open-contract streams on the server so the next mount
      // can re-subscribe without hitting AlreadySubscribed.
      if (isSubscribedRef.current && ws.isConnected) {
        ws.send({ forget_all: 'proposal_open_contract' }).catch(() => {});
      }
      isSubscribedRef.current = false;
    };
  }, [ws, isConnected, isAuthenticated, scheduleRemoval]);

  return { positions };
}
