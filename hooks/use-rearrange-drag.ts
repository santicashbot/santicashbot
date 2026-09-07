'use client';

/**
 * Reusable drag-to-reorder hook for the no-code builders' "rearrange mode".
 *
 * Template-agnostic: it works on any list of string keys (a template's
 * `config.order`). The builder dashboard toggles rearrange mode via a
 * `SET_REARRANGE_MODE` postMessage; while it's on, each layout block becomes
 * draggable and dropping one onto another reorders the list. The new order is
 * reported back through `onReorder` (which the /edit route forwards to the
 * dashboard as a `REORDER` message).
 *
 * Uses native HTML5 drag-and-drop (no library) — spread `getItemProps(key)`
 * onto each draggable block. `draggingKey`/`overKey` drive visual feedback.
 */

import { useCallback, useState, type DragEvent } from 'react';

export interface RearrangeItemProps {
  draggable: true;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onDragEnd: () => void;
}

export interface UseRearrangeDrag<K extends string> {
  /** The key currently being dragged (null when idle). */
  draggingKey: K | null;
  /** The key currently hovered as a drop target (excludes the dragged key). */
  overKey: K | null;
  /** True while a drag is in progress. */
  isDragging: boolean;
  /** Spread onto each draggable block element. */
  getItemProps: (key: K) => RearrangeItemProps;
}

/**
 * @param order    The current ordered list of block keys.
 * @param onReorder Called with the next order when a drop reorders the list.
 */
export function useRearrangeDrag<K extends string>(
  order: K[],
  onReorder: (next: K[]) => void,
): UseRearrangeDrag<K> {
  const [draggingKey, setDraggingKey] = useState<K | null>(null);
  const [overKey, setOverKey] = useState<K | null>(null);

  const move = useCallback(
    (from: K, to: K) => {
      if (from === to) return;
      const next = [...order];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      onReorder(next);
    },
    [order, onReorder],
  );

  const getItemProps = useCallback(
    (key: K): RearrangeItemProps => ({
      draggable: true,
      onDragStart: (event) => {
        setDraggingKey(key);
        event.dataTransfer.effectAllowed = 'move';
        // setData is required for drag to work in Firefox.
        try {
          event.dataTransfer.setData('text/plain', key);
        } catch {
          /* ignore */
        }
      },
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOverKey((prev) => (prev === key ? prev : key));
      },
      onDragEnter: (event) => {
        event.preventDefault();
        setOverKey((prev) => (prev === key ? prev : key));
      },
      onDrop: (event) => {
        event.preventDefault();
        setDraggingKey((dragged) => {
          if (dragged && dragged !== key) move(dragged, key);
          return null;
        });
        setOverKey(null);
      },
      onDragEnd: () => {
        setDraggingKey(null);
        setOverKey(null);
      },
    }),
    [move],
  );

  return {
    draggingKey,
    overKey: draggingKey !== null ? overKey : null,
    isDragging: draggingKey !== null,
    getItemProps,
  };
}
