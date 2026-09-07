'use client';

import { useEffect, useRef } from 'react';
import type { DerivWS } from '@deriv/core';

export interface BalanceUpdate {
  accountId?: string;
  balance: string;
  currency?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBalance(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function parseBalanceUpdate(message: Record<string, unknown>): BalanceUpdate | null {
  const payload = message.balance;
  const scalarBalance = normalizeBalance(payload);
  if (scalarBalance !== null) return { balance: scalarBalance };
  if (!isRecord(payload)) return null;

  const balance = normalizeBalance(payload.balance);
  if (balance === null) return null;

  const accountId =
    typeof payload.loginid === 'string'
      ? payload.loginid
      : typeof payload.account_id === 'string'
        ? payload.account_id
        : undefined;
  const currency = typeof payload.currency === 'string' ? payload.currency : undefined;

  return { accountId, balance, currency };
}

export function useBalanceSync(
  ws: DerivWS | null,
  isConnected: boolean,
  activeAccountId: string | null,
  onBalanceUpdate: (accountId: string, balance: string, currency?: string) => void
): void {
  // Keep the callback in a ref so an inline (unmemoized) callback at the call
  // site does not tear down and recreate the subscription on every render.
  const onBalanceUpdateRef = useRef(onBalanceUpdate);
  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  useEffect(() => {
    if (!ws || !isConnected || !activeAccountId) return;

    let disposed = false;
    let unsubscribe = () => {};

    // The OTP-authorized socket is scoped to a single account — the options
    // gateway balance schema has no `account: 'all'` parameter, so the stream
    // covers the active account only and resubscribes on account switch.
    ws.subscribe({ balance: 1 }, message => {
      const update = parseBalanceUpdate(message);
      if (!update) return;

      onBalanceUpdateRef.current(
        update.accountId ?? activeAccountId,
        update.balance,
        update.currency
      );
    })
      .then(subscription => {
        if (disposed) {
          subscription.unsubscribe();
          return;
        }
        unsubscribe = subscription.unsubscribe;
      })
      .catch(() => {
        // The account snapshot fetched during authentication remains available
        // if balance streaming is temporarily unavailable.
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [ws, isConnected, activeAccountId]);
}
