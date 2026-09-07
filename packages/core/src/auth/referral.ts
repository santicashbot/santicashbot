import { getAppBuilderBaseUrl } from '../config/urls';

interface ReferralInfo {
  affiliateToken: string;
  /**
   * The exact OAuth parameter name to use when forwarding the token to the
   * sign-up URL. Preserved from the referral link for the four standard
   * aliases (t, affiliate_token, sidi, ca). Defaults to 't' for formats
   * that don't use an OAuth alias directly (sidc, track.deriv.com).
   */
  affiliateTokenParam: 't' | 'affiliate_token' | 'sidi' | 'ca';
  utmCampaign: string;
  utmSource?: string;
  utmMedium?: string;
}

/**
 * Parse a Deriv partner referral link and extract affiliate tracking params.
 *
 * Supports three formats:
 * 1. deriv.com/signup?sidc=TOKEN&utm_campaign=dynamicworks[&utm_source=...&utm_medium=...]
 *    → affiliateToken = sidc value, affiliateTokenParam = 't' (sidc is not an OAuth alias),
 *      plus any utm_* params present
 *
 * 2. track.deriv.com/_TOKEN_/1/
 *    → affiliateToken = TOKEN (path segment without underscores),
 *      affiliateTokenParam = 't', utmCampaign = 'myaffiliates'
 *    The BFF resolves this to a deriv.com URL before assembly, so in practice
 *    the template receives a Format 3 URL and this branch is a fallback.
 *
 * 3. deriv.com/?t=TOKEN (or affiliate_token / sidi / ca)
 *    → affiliateToken = token value, affiliateTokenParam = the exact param name used,
 *      utmSource, utmMedium, utmCampaign from query params
 *
 * Scaleo click links (*-tracking.deriv.com/click?a=...) carry no token of their
 * own; the per-click t= and real utm_* params are only minted by Scaleo's 302
 * redirect. The BFF follows that redirect at assembly time and stores the
 * resolved destination URL, so the template receives a Format 3 URL here and
 * reads the real t= + utm params from it — nothing is fabricated.
 */
export function parseReferralLink(referralLink: string): ReferralInfo | null {
  if (!referralLink) return null;

  try {
    const url = new URL(referralLink);

    // Format 3: standard OAuth token aliases — preserve the exact param name used.
    // Checked in priority order; the first one present wins.
    const TOKEN_ALIASES = ['t', 'affiliate_token', 'sidi', 'ca'] as const;
    for (const param of TOKEN_ALIASES) {
      const value = url.searchParams.get(param);
      if (value) {
        return {
          affiliateToken: value,
          affiliateTokenParam: param,
          utmCampaign: url.searchParams.get('utm_campaign') ?? '',
          utmSource: url.searchParams.get('utm_source') ?? undefined,
          utmMedium: url.searchParams.get('utm_medium') ?? undefined,
        };
      }
    }

    // Format 1: deriv.com/signup?sidc=...&utm_campaign=... (DynamicWorks platform)
    // sidc is not an OAuth alias — forward the token as 't'.
    const sidc = url.searchParams.get('sidc');
    if (sidc) {
      return {
        affiliateToken: sidc,
        affiliateTokenParam: 't',
        utmCampaign: url.searchParams.get('utm_campaign') ?? 'dynamicworks',
        utmSource: url.searchParams.get('utm_source') ?? undefined,
        utmMedium: url.searchParams.get('utm_medium') ?? undefined,
      };
    }

    // Format 2: track.deriv.com/_TOKEN_/1/
    if (url.hostname.includes('track.deriv.com')) {
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        // Remove leading/trailing underscores from the token segment
        const rawToken = pathSegments[0].replace(/^_|_$/g, '');
        if (rawToken) {
          return {
            affiliateToken: rawToken,
            affiliateTokenParam: 't',
            utmCampaign: 'myaffiliates',
          };
        }
      }
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Read Scaleo (and generic) per-click attribution params from the current
 * landing URL. Scaleo appends ?t=CLICK_TOKEN&utm_source=affiliate_N
 * &utm_medium=affiliate&utm_campaign=scaleo when redirecting users to the app.
 * Returns null when none of the tracked params are present (direct visit).
 */
export function parseLandingParams(): ReferralInfo | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const t         = params.get('t');
  const utmSource = params.get('utm_source')   ?? undefined;
  const utmMedium = params.get('utm_medium')   ?? undefined;
  const utmCampaign = params.get('utm_campaign') ?? undefined;
  if (!t && !utmSource && !utmMedium && !utmCampaign) return null;
  return {
    affiliateToken: t ?? '',
    affiliateTokenParam: 't',
    utmCampaign: utmCampaign ?? '',
    utmSource,
    utmMedium,
  };
}

/** True for a Scaleo click link (*-tracking.deriv.com/click?...). */
function isScaleoClickLink(referralLink: string): boolean {
  try {
    const url = new URL(referralLink);
    return url.hostname.endsWith('-tracking.deriv.com') && url.pathname === '/click';
  } catch {
    return false;
  }
}

/**
 * Resolve a Scaleo click link to a fresh per-user token at login/sign-up time,
 * via the app-builder BFF proxy (GET /api/app-builder/resolve-tracking). The
 * per-click t= is minted by Scaleo's 302 redirect, which a browser cannot read
 * cross-origin; the BFF (a Cloudflare Worker, not a browser) reads it and
 * returns the resolved destination URL as JSON, which we re-parse with
 * parseReferralLink (Format 3) to get the real t= + utm.
 *
 * Strictly non-blocking and non-throwing: returns null on any failure (endpoint
 * missing/404, timeout, network/CORS error, malformed body) so callers can fall
 * back to existing behavior and never break login. Only Scaleo click links
 * trigger a request; anything else returns null without a fetch.
 */
export async function resolveReferralViaProxy(
  referralLink: string
): Promise<ReferralInfo | null> {
  if (!referralLink || typeof fetch === 'undefined') return null;
  if (!isScaleoClickLink(referralLink)) return null;

  const TIMEOUT_MS = 2500;
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Hard 2.5s cap on the critical login path. AbortController cancels the
  // in-flight request when available; the Promise.race timeout guarantees the
  // cap even when it is not (so the awaited call can never hang login).
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => {
      controller?.abort();
      resolve(null);
    }, TIMEOUT_MS);
  });

  // Never rejects → no unhandled rejection if the timeout wins the race.
  const work = (async (): Promise<ReferralInfo | null> => {
    try {
      const endpoint = `${getAppBuilderBaseUrl()}/api/app-builder/resolve-tracking?link=${encodeURIComponent(
        referralLink
      )}`;
      const response = await fetch(endpoint, { signal: controller?.signal });
      if (!response.ok) return null;

      const data: unknown = await response.json();
      if (data && typeof data === 'object' && 'url' in data) {
        const resolvedUrl = data.url;
        if (typeof resolvedUrl === 'string' && resolvedUrl) {
          return parseReferralLink(resolvedUrl);
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
