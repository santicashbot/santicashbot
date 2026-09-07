'use client';

import { createContext, useContext } from 'react';

const LogoSrcContext = createContext<string | null>(null);

export function LogoSrcProvider({
  logoSrc,
  children,
}: {
  logoSrc: string | null;
  children: React.ReactNode;
}) {
  return (
    <LogoSrcContext.Provider value={logoSrc}>
      {children}
    </LogoSrcContext.Provider>
  );
}

/**
 * Returns the logo src URL detected server-side by getLogoSrc(), or undefined
 * when no logo file was found. The Header renders a letter-badge fallback
 * when this returns undefined.
 */
export function useLogoSrc(): string | undefined {
  return useContext(LogoSrcContext) ?? undefined;
}
