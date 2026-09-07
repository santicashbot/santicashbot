/**
 * Static display name mappings for Deriv active_symbols API keys.
 *
 * market_display_name, submarket_display_name, and subgroup_display_name are
 * optional fields in the active_symbols response and may be absent for some
 * symbols or configurations. These maps provide reliable fallbacks so
 * SmartCharts' market browser and the positions table always show correct
 * labels (e.g. "Gold Basket" instead of "WLDXAU",
 * "Commodities Basket" instead of "commodity_basket").
 *
 * Source: deriv-com/derivatives-charts src/config/displayNames.ts
 */

// ---------------------------------------------------------------------------
// Symbol display names
// Mapping of raw underlying symbol codes → human-readable names.
// Used in the positions table/cards where only the raw symbol code is available.
// ---------------------------------------------------------------------------

export const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  // Major Pairs
  frxAUDJPY: 'AUD/JPY',
  frxAUDUSD: 'AUD/USD',
  frxEURAUD: 'EUR/AUD',
  frxEURCAD: 'EUR/CAD',
  frxEURCHF: 'EUR/CHF',
  frxEURGBP: 'EUR/GBP',
  frxEURJPY: 'EUR/JPY',
  frxEURUSD: 'EUR/USD',
  frxGBPAUD: 'GBP/AUD',
  frxGBPJPY: 'GBP/JPY',
  frxGBPNOK: 'GBP/NOK',
  frxgbpnok: 'GBP/NOK',
  frxGBPUSD: 'GBP/USD',
  frxUSDCAD: 'USD/CAD',
  frxUSDCHF: 'USD/CHF',
  frxUSDJPY: 'USD/JPY',
  frxUSDNOK: 'USD/NOK',
  frxusdnok: 'USD/NOK',
  frxUSDSEK: 'USD/SEK',
  frxusdsek: 'USD/SEK',

  // Minor Pairs
  frxGBPPLN: 'GBP/PLN',
  frxgbppln: 'GBP/PLN',
  frxAUDCAD: 'AUD/CAD',
  frxAUDCHF: 'AUD/CHF',
  frxAUDNZD: 'AUD/NZD',
  frxEURNZD: 'EUR/NZD',
  frxGBPCAD: 'GBP/CAD',
  frxGBPCHF: 'GBP/CHF',
  frxGBPNZD: 'GBP/NZD',
  frxNZDJPY: 'NZD/JPY',
  frxNZDUSD: 'NZD/USD',
  frxUSDMXN: 'USD/MXN',
  frxUSDPLN: 'USD/PLN',
  frxCADJPY: 'CAD/JPY',
  frxCHFJPY: 'CHF/JPY',
  frxCADCHF: 'CAD/CHF',
  frxNZDCAD: 'NZD/CAD',
  frxNZDCHF: 'NZD/CHF',

  // Basket Indices
  WLDXAU: 'Gold Basket',
  WLDAUD: 'AUD Basket',
  WLDEUR: 'EUR Basket',
  WLDGBP: 'GBP Basket',
  WLDUSD: 'USD Basket',

  // Continuous Indices — Volatility
  R_10: 'Volatility 10 Index',
  R_25: 'Volatility 25 Index',
  R_50: 'Volatility 50 Index',
  R_75: 'Volatility 75 Index',
  R_100: 'Volatility 100 Index',
  '1HZ10V': 'Volatility 10 (1s) Index',
  '1HZ25V': 'Volatility 25 (1s) Index',
  '1HZ50V': 'Volatility 50 (1s) Index',
  '1HZ75V': 'Volatility 75 (1s) Index',
  '1HZ100V': 'Volatility 100 (1s) Index',
  '1HZ150V': 'Volatility 150 (1s) Index',
  '1HZ200V': 'Volatility 200 (1s) Index',
  '1HZ250V': 'Volatility 250 (1s) Index',
  '1HZ300V': 'Volatility 300 (1s) Index',

  // Crash/Boom Indices
  BOOM250: 'Boom 250 Index',
  BOOM300N: 'Boom 300 Index',
  BOOM500: 'Boom 500 Index',
  BOOM600: 'Boom 600 Index',
  BOOM900: 'Boom 900 Index',
  BOOM1000: 'Boom 1000 Index',
  CRASH250: 'Crash 250 Index',
  CRASH300N: 'Crash 300 Index',
  CRASH500: 'Crash 500 Index',
  CRASH600: 'Crash 600 Index',
  CRASH900: 'Crash 900 Index',
  CRASH1000: 'Crash 1000 Index',

  // Daily Reset Indices
  RDBEAR: 'Bear Market Index',
  RDBULL: 'Bull Market Index',
  RDBEAR10: 'Bear Market 10 Index',
  RDBULL10: 'Bull Market 10 Index',
  RDBEAR25: 'Bear Market 25 Index',
  RDBULL25: 'Bull Market 25 Index',

  // Jump Indices
  JD10: 'Jump 10 Index',
  JD25: 'Jump 25 Index',
  JD50: 'Jump 50 Index',
  JD75: 'Jump 75 Index',
  JD100: 'Jump 100 Index',
  JD200: 'Jump 200 Index',
  JD300: 'Jump 300 Index',

  // Step Indices
  stpRNG: 'Step Index 100',
  stpRNG2: 'Step Index 200',
  stpRNG3: 'Step Index 300',
  stpRNG4: 'Step Index 400',
  stpRNG5: 'Step Index 500',
  STPIDX100: 'Step Index 100',
  STPIDX200: 'Step Index 200',
  STPIDX300: 'Step Index 300',
  STPIDX400: 'Step Index 400',
  STPIDX500: 'Step Index 500',

  // Stock Indices — Americas
  OTC_SPC: 'US 500',
  OTC_NDX: 'US Tech 100',
  OTC_DJI: 'Wall Street 30',

  // Stock Indices — Asia/Oceania
  OTC_AS51: 'Australia 200',
  OTC_HSI: 'Hong Kong 50',
  OTC_IBEX35: 'Spain 35',
  OTC_N225: 'Japan 225',

  // Stock Indices — Europe
  OTC_SX5E: 'Euro 50',
  OTC_FCHI: 'France 40',
  OTC_GDAXI: 'Germany 40',
  OTC_AEX: 'Netherlands 25',
  OTC_SMI: 'Swiss 20',
  OTC_SSMI: 'Swiss 20',
  otc_ssmi: 'Swiss 20',
  OTC_FTSE: 'UK 100',

  // Cryptocurrencies
  cryBTCUSD: 'BTC/USD',
  cryETHUSD: 'ETH/USD',
  cryLTCUSD: 'LTC/USD',
  cryBCHUSD: 'BCH/USD',
  cryXRPUSD: 'XRP/USD',
  cryADAUSD: 'ADA/USD',
  cryDOTUSD: 'DOT/USD',

  // Metals / Commodities
  frxXAUUSD: 'Gold/USD',
  frxXPDUSD: 'Palladium/USD',
  frxXPTUSD: 'Platinum/USD',
  frxXAGUSD: 'Silver/USD',
  frxBROUSD: 'Brent Oil/USD',
  frxbrousd: 'Brent Oil/USD',
};

/**
 * Returns the human-readable display name for a raw underlying symbol code.
 * Falls back to the raw code itself when no mapping exists, so the UI always
 * shows something meaningful rather than an empty string.
 */
export function getSymbolDisplayName(symbolCode: string): string {
  return SYMBOL_DISPLAY_NAMES[symbolCode] ?? symbolCode;
}

export const MARKET_DISPLAY_NAMES: Record<string, string> = {
  forex: 'Forex',
  indices: 'Stock Indices',
  stocks: 'Stocks',
  commodities: 'Commodities',
  cryptocurrency: 'Cryptocurrencies',
  synthetic_index: 'Derived',
  basket_index: 'Baskets',
  energy: 'Energy',
  metals: 'Metals',
  agricultural: 'Agricultural',
};

export const SUBMARKET_DISPLAY_NAMES: Record<string, string> = {
  major_pairs: 'Major Pairs',
  minor_pairs: 'Minor Pairs',
  exotic_pairs: 'Exotic Pairs',
  smart_fx: 'Smart FX',
  americas: 'American indices',
  asia_oceania: 'Asian indices',
  europe_africa: 'European indices',
  europe: 'European indices',
  americas_OTC: 'American indices',
  asia_oceania_OTC: 'Asian indices',
  europe_OTC: 'European indices',
  otc_index: 'OTC Indices',
  random_index: 'Continuous Indices',
  random_daily: 'Daily Reset Indices',
  crash_boom: 'Crash/Boom Indices',
  crash_index: 'Crash/Boom Indices',
  jump_index: 'Jump Indices',
  step_index: 'Step Indices',
  volatility_indices: 'Volatility Indices',
  range_break_indices: 'Range Break Indices',
  forex_basket: 'Forex Basket',
  commodity_basket: 'Commodities Basket',
  cryptocurrency_basket: 'Cryptocurrency Basket',
  energy_basket: 'Energy Basket',
  precious_metals: 'Precious Metals',
  base_metals: 'Base Metals',
  grains: 'Grains',
  soft_commodities: 'Soft Commodities',
  livestock: 'Livestock',
  crypto_usd: 'Cryptocurrencies',
  non_stable_coin: 'Cryptocurrencies',
  crypto_non_usd: 'Crypto/Non-USD',
  us_stocks: 'US Stocks',
  european_stocks: 'European Stocks',
  asian_stocks: 'Asian Stocks',
  metals: 'Metals',
};

export const SUBGROUP_DISPLAY_NAMES: Record<string, string> = {
  none: '',
  major: 'Major',
  minor: 'Minor',
  exotic: 'Exotic',
  micro: 'Micro',
  smart: 'Smart',
  baskets: 'Baskets',
  synthetics: 'Synthetics',
  commodities_basket: 'Commodities Basket',
  forex_basket: 'Forex Basket',
  forex: 'Forex',
  indices: 'Indices',
  commodities: 'Commodities',
  energy: 'Energy',
  metals: 'Metals',
  agricultural: 'Agricultural',
  cryptocurrencies: 'Cryptocurrencies',
  stocks: 'Stocks',
};

/**
 * Returns the human-readable display name for a raw market key.
 * Falls back to a title-cased version of the raw key if no mapping exists.
 */
export function getMarketDisplayName(market: string): string {
  return MARKET_DISPLAY_NAMES[market] ?? formatRawKey(market);
}

/**
 * Returns the human-readable display name for a raw submarket key.
 * Falls back to a title-cased version of the raw key if no mapping exists.
 */
export function getSubmarketDisplayName(submarket: string): string {
  return SUBMARKET_DISPLAY_NAMES[submarket] ?? formatRawKey(submarket);
}

/**
 * Returns the human-readable display name for a raw subgroup key.
 * Returns an empty string for hidden categories (e.g. "none").
 * Falls back to a title-cased version of the raw key if no mapping exists.
 */
export function getSubgroupDisplayName(subgroup: string): string {
  if (subgroup === 'none') return '';
  return SUBGROUP_DISPLAY_NAMES[subgroup] ?? formatRawKey(subgroup);
}

/** Converts a snake_case or kebab-case key to Title Case. */
function formatRawKey(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => (word.length ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ')
    .trim();
}
