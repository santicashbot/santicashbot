'use client';

import { Localize } from '@deriv-com/translations';

export function Footer() {
  return (
    <footer className="w-full py-1 text-center">
      <p className="text-xs tracking-wide text-muted-foreground">
        <Localize i18n_default_text="Powered by" />{' '}
        <span className="font-semibold text-foreground">
          <Localize i18n_default_text="Deriv" />
        </span>
      </p>
    </footer>
  );
}

/**
 * The bottom band the footer lives in on the mobile no-code layout.
 *
 * Both Buy placements end in this one box, so toggling the pin never moves
 * "Powered by Deriv" or resizes the strip around it. They used to hard-code a
 * box each — the pinned bar rendered the footer flush at 24px while the
 * unpinned branch wrapped it in `py-2` — which shifted the footer by 8px as the
 * pin toggled.
 *
 * The band keeps master's 40px footer region: `py-2` here (8 + 8) around the
 * footer's own 24px (`py-1` over a 16px line). That total is the contract — it
 * is what every mobile layout in this repo has always reserved at the bottom of
 * the screen, so the pinned and unpinned columns and the fixed footer on desktop
 * all read as the same product. Do not collapse it to the footer's bare 24px.
 *
 * `children` is the pinned Buy button, which sits above the footer inside the
 * same band (see PinnedBuyBar). Unpinned there is nothing to place, and the
 * scrolling column ends directly on top of this band.
 */
export function FooterBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t border-border bg-background">
      {children}
      <div className="py-2 text-center">
        <Footer />
      </div>
    </div>
  );
}
