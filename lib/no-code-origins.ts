/**
 * Allowed parent-frame origins for the no-code editor/preview postMessage
 * protocol. The edit/ and preview/ routes are embedded in a phone frame by the
 * App Builder dashboard; every incoming `message` event has its `event.origin`
 * validated against these patterns before any payload is trusted.
 *
 * Shared across all no-code templates (rise-fall, accumulators, digits) via
 * `@/lib/no-code-origins`. Note: edit/preview routes are not shipped to deployed
 * partner apps, so in practice this is a monorepo-shared module rather than one
 * the BFF copies into standalone deploys.
 */
export const ALLOWED_ORIGINS = [
  /^https:\/\/developers\.deriv\.com$/,
  /^https:\/\/staging-developers\.deriv\.com$/,
  /^https:\/\/.*\.deriv-api-v2\.pages\.dev$/,
  /^http:\/\/localhost:\d+$/,
];
