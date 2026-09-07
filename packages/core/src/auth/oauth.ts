import type { AuthConfig, AuthInfo, CallbackParams, TokenExchangeParams } from '../types';
import { generateRandomBase64url, sha256Base64url } from './crypto';
import {
  storeCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  storeCodeVerifier,
  getCodeVerifier,
  clearCodeVerifier,
  storeAuthInfo,
  clearAllAuthData,
} from './storage';
import { getAuthBaseUrl } from '../config/urls';

/**
 * Build the base PKCE URLSearchParams shared by login and sign-up.
 * Stores a fresh CSRF token and code verifier in sessionStorage.
 */
async function buildPkceParams(config: AuthConfig): Promise<URLSearchParams> {
  const csrfToken = generateRandomBase64url(32);
  const codeVerifier = generateRandomBase64url(32);
  const codeChallenge = await sha256Base64url(codeVerifier);

  storeCSRFToken(csrfToken);
  storeCodeVerifier(codeVerifier);

  return new URLSearchParams({
    scope: config.scopes ?? 'trade account_manage',
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: csrfToken,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}

/**
 * Append partner attribution + language params shared by login and sign-up.
 * `lang` mirrors deriv-api-v2's redirectToLogin/SignUp so Deriv's home app
 * opens in the same language the user selected in the template.
 */
function appendAttributionParams(params: URLSearchParams, config: AuthConfig): void {
  if (config.affiliateToken) {
    const tokenParam = config.affiliateTokenParam ?? 't';
    params.set(tokenParam, config.affiliateToken);
  }
  if (config.utmSource) params.set('utm_source', config.utmSource);
  if (config.utmMedium) params.set('utm_medium', config.utmMedium);
  if (config.utmCampaign) params.set('utm_campaign', config.utmCampaign);
  if (config.lang) params.set('lang', config.lang.toUpperCase());
}

/**
 * Build the OAuth 2.0 login authorization URL with PKCE parameters.
 * Includes optional partner attribution params (affiliate token, utm_*) when
 * present in config — so attribution carries through if the user clicks Login
 * then signs up from Deriv's home page — plus `lang` when provided.
 * Stores CSRF token and code verifier in sessionStorage.
 */
export async function buildAuthorizationUrl(config: AuthConfig): Promise<string> {
  const params = await buildPkceParams(config);
  appendAttributionParams(params, config);
  return `${getAuthBaseUrl()}/auth?${params.toString()}`;
}

/**
 * Build the OAuth 2.0 sign-up authorization URL.
 * Includes prompt=registration (required to show the Deriv registration form)
 * and optional partner attribution params forwarded using the exact parameter
 * name from the referral link (t, affiliate_token, sidi, or ca), plus `lang`.
 * Stores CSRF token and code verifier in sessionStorage.
 */
export async function buildSignUpUrl(config: AuthConfig): Promise<string> {
  const params = await buildPkceParams(config);
  params.set('prompt', 'registration');
  appendAttributionParams(params, config);
  return `${getAuthBaseUrl()}/auth?${params.toString()}`;
}

/**
 * Initiate login by redirecting to the Deriv auth page.
 */
export async function initiateLogin(config: AuthConfig): Promise<void> {
  const url = await buildAuthorizationUrl(config);
  window.location.href = url;
}

/**
 * Initiate sign-up by redirecting to the Deriv registration page.
 * Appends prompt=registration and any partner attribution params from config.
 */
export async function initiateSignUp(config: AuthConfig): Promise<void> {
  const url = await buildSignUpUrl(config);
  window.location.href = url;
}

/**
 * Parse callback URL parameters from the OAuth redirect.
 */
export function parseCallbackParams(url: string): CallbackParams {
  const urlObj = new URL(url);
  return {
    code: urlObj.searchParams.get('code'),
    state: urlObj.searchParams.get('state'),
    scope: urlObj.searchParams.get('scope'),
    error: urlObj.searchParams.get('error'),
    error_description: urlObj.searchParams.get('error_description'),
  };
}

/**
 * Validate the OAuth callback parameters.
 * Returns the authorization code on success, or throws on failure.
 */
export function validateCallback(params: CallbackParams, redirectUri: string): string {
  // Check for error response
  if (params.error) {
    cleanupUrl(redirectUri);
    throw new OAuthError(`OAuth error: ${params.error} - ${params.error_description || ''}`);
  }

  // State must be present
  if (!params.state) {
    clearAllAuthData();
    cleanupUrl(redirectUri);
    throw new OAuthError('Missing state parameter — possible CSRF attack');
  }

  // Validate CSRF token matches
  const storedToken = getCSRFToken();
  if (!storedToken || storedToken !== params.state) {
    clearAllAuthData();
    cleanupUrl(redirectUri);
    throw new OAuthError('CSRF token mismatch — possible CSRF attack');
  }

  // Clear CSRF token after successful validation
  clearCSRFToken();

  if (!params.code) {
    throw new OAuthError('Missing authorization code');
  }

  return params.code;
}

/**
 * Exchange authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(params: TokenExchangeParams): Promise<AuthInfo> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(`${getAuthBaseUrl()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new OAuthError(`Token exchange failed (${response.status}): ${errorBody}`);
  }

  const tokenData = await response.json();
  const authInfo: AuthInfo = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    expires_at: tokenData.expires_at ?? Math.floor(Date.now() / 1000) + tokenData.expires_in,
    scope: tokenData.scope,
    refresh_token: tokenData.refresh_token,
  };

  storeAuthInfo(authInfo);
  clearCodeVerifier();

  return authInfo;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<AuthInfo> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(`${getAuthBaseUrl()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    clearAllAuthData();
    throw new OAuthError(`Token refresh failed (${response.status})`);
  }

  const tokenData = await response.json();
  const authInfo: AuthInfo = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    expires_at: tokenData.expires_at ?? Math.floor(Date.now() / 1000) + tokenData.expires_in,
    scope: tokenData.scope,
    refresh_token: tokenData.refresh_token,
  };

  storeAuthInfo(authInfo);
  return authInfo;
}

/**
 * Handle the complete OAuth callback flow:
 * validate → exchange code → return auth info.
 */
export async function handleOAuthCallback(
  callbackUrl: string,
  config: AuthConfig
): Promise<AuthInfo> {
  const params = parseCallbackParams(callbackUrl);
  const code = validateCallback(params, config.redirectUri);

  const codeVerifier = getCodeVerifier();
  if (!codeVerifier) {
    throw new OAuthError('Code verifier expired or missing');
  }

  const authInfo = await exchangeCodeForTokens({
    code,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    codeVerifier,
  });

  cleanupUrl(config.redirectUri);
  return authInfo;
}

/**
 * Clean OAuth parameters from the URL using history.replaceState.
 */
export function cleanupUrl(baseUrl: string): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const paramsToRemove = ['code', 'state', 'scope', 'error', 'error_description'];
  paramsToRemove.forEach(param => url.searchParams.delete(param));

  window.history.replaceState(window.history.state, '', url.pathname + url.search);
}

/**
 * Custom error class for OAuth-specific errors.
 */
export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthError';
  }
}
