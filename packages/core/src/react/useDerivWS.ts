'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { DerivWS } from '../ws';

export interface UseDerivWSOptions {
  /**
   * Optional WebSocket URL. When omitted, connects to the public WS.
   * Pass an authenticated OTP URL to upgrade to an authenticated session.
   */
  url?: string;
  /**
   * Optional account ID. When this changes while authenticated, forces a full
   * reconnect so the new account's session is established. This distinguishes
   * an account switch (must reconnect) from an OTP refresh (keep alive).
   */
  accountId?: string;
}

interface UseDerivWSReturn {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  error: string | null;
}

/**
 * Hook to manage a DerivWS connection.
 *
 * Reconnect behaviour:
 * - public → authenticated (url undefined → defined): full reconnect
 * - authenticated → public (url defined → undefined): full reconnect (logout)
 * - account switch (accountId changes): full reconnect
 * - OTP refresh (url changes, same accountId): updateUrl() only — live socket untouched
 */
export function useDerivWS(options?: UseDerivWSOptions): UseDerivWSReturn {
  const { url, accountId } = options ?? {};

  const wsRef = useRef<DerivWS | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const [isConnected, setIsConnected] = useState(false);
  const [isExhausted, setIsExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  const getSnapshot = useCallback(() => wsRef.current, []);

  // Full reconnect key: changes when auth type changes OR when the account switches.
  // Stays stable when only the OTP URL string is refreshed for the same account.
  const isAuthenticated = url !== undefined;
  const reconnectKey = isAuthenticated ? `auth:${accountId ?? 'unknown'}` : 'public';

  useEffect(() => {
    let disposed = false;

    const instance = new DerivWS(url);
    wsRef.current = instance;
    listenersRef.current.forEach((l) => l());

    const unsubscribeState = instance.onConnectionStateChange((connected) => {
      if (!disposed) {
        setIsConnected(connected);
        if (connected) setError(null);
      }
    });

    const unsubscribeExhausted = instance.onReconnectExhausted(() => {
      if (!disposed) setIsExhausted(true);
    });

    instance.connect().catch((err) => {
      if (!disposed) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    });

    const listeners = listenersRef.current;
    return () => {
      disposed = true;
      setIsConnected(false);
      setIsExhausted(false);
      unsubscribeState();
      unsubscribeExhausted();
      instance.disconnect();
      wsRef.current = null;
      listeners.forEach((l) => l());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectKey]);

  // When the OTP URL changes for the same account (tab focus refresh), silently
  // update the URL on the existing instance — no reconnect, no flash.
  useEffect(() => {
    if (url && wsRef.current) {
      wsRef.current.updateUrl(url);
    }
  }, [url]);

  const ws = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return { ws, isConnected, isExhausted, error };
}
