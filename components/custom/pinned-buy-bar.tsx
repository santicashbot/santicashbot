'use client';

import { FooterBar } from './footer';
import { cn } from '@/lib/utils';

/**
 * The bottom bar holding a pinned Buy button, above the "Powered by Deriv"
 * footer — the layout the App Builder gallery screenshots advertise.
 *
 * Rendered **in flow** as the last `shrink-0` child of the mobile `h-dvh`
 * column, not `fixed`. That is deliberate: a fixed bar would need the scrolling
 * column to reserve clearance for it (the `pb-28` the footer alone used to
 * need), and that padding has to be re-guessed whenever the button's style
 * variant changes its height. In flow, the scroll area simply ends where the bar
 * begins. Because the bar is in flow it also owns the footer — the view must not
 * render its standalone fixed footer as well.
 *
 * Shared by every no-code template: the Buy button itself differs per template
 * (payout, ask price, close-position state), the bar around it does not.
 */
export interface PinnedBuyBarProps {
  /** The Buy button — each template passes its own ConfigurableBuyButton. */
  children: React.ReactNode;
  /**
   * Edit mode — the Buy button goes inert and the bar becomes selectable.
   * Inertness covers the WHOLE editing session, rearranging included: `/edit` is
   * the real app with live trading, so a stray tap mid-drag is a real purchase.
   */
  editMode?: boolean;
  /**
   * Drag-to-reorder mode. Keeps the Buy button inert (that is `editMode`'s job)
   * but hides the selection overlay — there is nothing to select mid-drag, and
   * the overlay would swallow the drag.
   */
  rearrangeMode?: boolean;
  /** True when the Buy component is the one currently selected in the editor. */
  selected?: boolean;
  /** Called when the bar is clicked in edit mode. */
  onSelect?: () => void;
  /**
   * Accessible name for the selection overlay. Accumulators swaps its Buy button
   * for a Close-position one while a trade is running, so "Buy button" would
   * misname what a screen-reader user is selecting.
   *
   * Name the COMPONENT, not a trade action — "Buy button", "Close button", the
   * same convention as getBlockLabels and FixedZone. This overlay only selects a
   * component for editing; it never trades. An earlier "Close position button"
   * announced as "Close position button, button" on the one control a
   * screen-reader user cannot see is inert, which read as closing a live
   * position.
   *
   * Required, and callers pass it through `localize`. The overlay is an
   * invisible hit-target with no visible text to fall back on, so this string IS
   * the control's name for a screen-reader user — and the editor ships ES/FR/PT.
   * A default here would be an English one that silently wins whenever a caller
   * forgets, which is exactly what happened before.
   */
  label: string;
}

export function PinnedBuyBar({
  children,
  editMode,
  rearrangeMode,
  selected,
  onSelect,
  label,
}: PinnedBuyBarProps) {
  return (
    <FooterBar>
      <div className="relative">
        {/* `inert` is what actually makes the button unusable: pointer-events-none
            only removes it from POINTER hit-testing, while the real <button>
            stays in the tab order and Enter/Space still activates it — and /edit
            talks to a live account. inert takes the whole subtree out of focus,
            keyboard and assistive tech at once, without reaching into the opaque
            `children` to disable the button itself. The pointer-events/select
            classes stay for the cursor and text-selection feel. */}
        <div
          inert={editMode || undefined}
          className={cn(
            // Symmetric vertical padding: `pt-2` alone left the selection ring
            // flush against the button's bottom edge (8px above, 0 below), and
            // gave the deployed button no breathing room over the footer.
            'mx-auto w-full max-w-md px-3 py-2',
            editMode && 'pointer-events-none select-none'
          )}
        >
          {children}
        </div>
        {/* Selection affordance, as a SIBLING overlay rather than a wrapper —
            the same shape as FixedZone over the chart. Wrapping the Buy <button>
            in another <button> would be invalid HTML and fail hydration. */}
        {editMode && !rearrangeMode && (
          <div
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected}
            onClick={onSelect}
            onKeyDown={(event) => {
              // A div with role="button" gets none of a real <button>'s keyboard
              // behaviour for free, and it cannot BE a button — that would nest
              // one inside the Buy button.
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.();
              }
            }}
            className={cn(
              // inset-x-1 against the wrapper's px-3 gives the same 8px gap the
              // py-2 gives vertically, so the ring sits evenly around the button.
              'absolute inset-x-1 inset-y-0 z-10 cursor-pointer rounded-xl border-2 transition-colors',
              // Border is always visible, like the selectable rows inside the
              // column — on touch there is no hover to reveal an affordance.
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/60 hover:bg-primary/5'
            )}
          />
        )}
      </div>
    </FooterBar>
  );
}
