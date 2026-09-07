'use client';

import { useRef, useState, useLayoutEffect, useEffect } from 'react';

const MIN_SCALE = 0.5;
const LG_BREAKPOINT = 1024; // matches Tailwind's `lg`

type ScaleState = number | false | null;
// null   = not yet measured  → render invisible to avoid layout-shift flash
// false  = desktop viewport  → passthrough, no transform
// number = mobile viewport   → transform: scale(n)

export default function ViewportScaler({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<ScaleState>(null);

  const updateScale = () => {
    const el = containerRef.current;
    if (!el) return;

    if (window.innerWidth >= LG_BREAKPOINT) {
      setScale(false);
      return;
    }

    // Temporarily clear transform so scrollHeight reflects the natural (unscaled) height
    el.style.transform = 'none';
    const naturalHeight = el.scrollHeight;
    el.style.transform = '';

    if (!naturalHeight) return;

    const newScale = Math.max(MIN_SCALE, Math.min(1, window.innerHeight / naturalHeight));
    setScale(prev => (prev === newScale ? prev : newScale));
  };

  // Synchronous first measurement before browser paint — prevents visible unscaled frame.
  // Calling setState inside useLayoutEffect is intentional: we need the DOM measurement
  // to happen synchronously before the browser paints to avoid a visible unscaled frame.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateScale();
  }, []);

  // React to content height changes (fonts loading, dynamic data, images)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScale());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced window resize + orientation-change listener
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(updateScale, 100);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  const isMobile = typeof scale === 'number';
  const isReady = scale !== null;

  // Desktop (or pre-measurement): plain passthrough container.
  // Also used as the measurement host before the first scale value is known.
  if (!isMobile) {
    return (
      <div
        ref={containerRef}
        style={{
          height: '100dvh',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        {children}
      </div>
    );
  }

  // Mobile with a computed scale.
  //
  // Two-layer structure:
  //   • Outer clip wrapper — fixed 100vw × 100dvh, overflow:hidden.
  //     Acts as the viewport "frame" and hides the oversized inner div
  //     before the CSS transform is applied.
  //   • Inner measured div (containerRef) — intentionally wider than the
  //     viewport (width = 100vw / scale) so that after scale(n) it is
  //     exactly 100vw.  transformOrigin:top-left keeps the top-left corner
  //     anchored while the content scales down to fit the viewport height.
  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <div
        ref={containerRef}
        style={{
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          // Both dimensions are 100% / scale of the outer clip wrapper (100vw × 100dvh),
          // so after scale(n) they resolve to exactly 100vw × 100dvh.
          // display:flex + flexDirection:column lets children use flex-1 / shrink-0
          // against a definite height, keeping the buy-button footer anchored at the
          // visual bottom without any special positioning.
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}
