/**
 * Shared no-code config helpers.
 *
 * Every no-code template (rise-fall, accumulators, digits) validates an
 * arbitrary stored value into a safe app config the same way: coerce each style
 * to a known variant and rebuild the block order (known-only, de-duped, missing
 * keys appended). Those two pieces are identical across templates, so they live
 * here and are called from each template's `normalizeAppConfig`.
 *
 * Pure TypeScript, no template-specific knowledge — the caller passes its own
 * set of block keys. Imported via `@/lib/no-code-config`, so the BFF copies it
 * into standalone deploys alongside the other shared `@/lib/*` modules.
 */

/** Style variant of a control row. Every control has exactly three. */
export type StyleVariant = "a" | "b" | "c";

/** Type guard: is `value` one of the three known style variants? */
export function isStyleVariant(value: unknown): value is StyleVariant {
  return value === "a" || value === "b" || value === "c";
}

/**
 * Normalise a stored block order into a safe, complete order:
 * keep only known keys, drop duplicates (first wins), then append any missing
 * keys in their default order so every block always renders exactly once.
 */
export function normalizeBlockOrder<Key extends string>(
  rawOrder: unknown,
  allKeys: readonly Key[]
): Key[] {
  const known = new Set<string>(allKeys);
  const seen = new Set<string>();
  const order: Key[] = [];
  if (Array.isArray(rawOrder)) {
    for (const candidate of rawOrder) {
      if (
        typeof candidate === "string" &&
        known.has(candidate) &&
        !seen.has(candidate)
      ) {
        seen.add(candidate);
        const match = allKeys.find((key) => key === candidate);
        if (match !== undefined) order.push(match);
      }
    }
  }
  for (const key of allKeys) if (!seen.has(key)) order.push(key);
  return order;
}
