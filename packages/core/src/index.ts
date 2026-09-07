// Auth
export {
  buildAuthorizationUrl,
  buildSignUpUrl,
  initiateLogin,
  initiateSignUp,
  parseCallbackParams,
  validateCallback,
  exchangeCodeForTokens,
  refreshAccessToken,
  handleOAuthCallback,
  cleanupUrl,
  OAuthError,
  fetchAccounts,
  getWebSocketOTP,
  logout,
  generateRandomBase64url,
  sha256Base64url,
  base64urlEncode,
  storeCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  storeCodeVerifier,
  getCodeVerifier,
  clearCodeVerifier,
  storeAuthInfo,
  getAuthInfo,
  clearAuthInfo,
  storeDerivAccounts,
  getDerivAccounts,
  clearDerivAccounts,
  setActiveLoginId,
  getActiveLoginId,
  setAccountType,
  getAccountType,
  clearAllAuthData,
  parseReferralLink,
  parseLandingParams,
  resolveReferralViaProxy,
} from './auth';

// Types
export type {
  AuthConfig,
  AuthInfo,
  DerivAccount,
  OTPResponse,
  TokenExchangeParams,
  CallbackParams,
  AuthState,
  StoredCSRFToken,
  StoredCodeVerifier,
  ActiveSymbol,
  Tick,
  TicksHistoryResponse,
  ContractsForResponse,
  ContractInfo,
  DurationLimits,
  ProposalResponse,
  ProposalInfo,
  BuyResponse,
  BuyResult,
  ProposalParams,
} from './types';

// Config
export { getAuthBaseUrl, getApiBaseUrl, getPublicWsUrl } from './config';

// Utils
export { pickDefaultSymbol } from './utils/pick-default-symbol';

// WebSocket
export { DerivWS } from './ws';

// React Hooks
export {
  useDerivWS,
  useActiveSymbols,
  useTicks,
  useProposal,
  useBuy,
} from './react';
