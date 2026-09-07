export interface ActiveSymbol {
  exchange_is_open: number;
  is_trading_suspended: number;
  market: string;
  market_display_name?: string;
  pip_size: number;
  subgroup: string;
  subgroup_display_name?: string;
  submarket: string;
  submarket_display_name?: string;
  trade_count: number;
  underlying_symbol: string;
  underlying_symbol_name: string;
  underlying_symbol_type: string;
}

export interface Tick {
  ask: number;
  bid: number;
  epoch: number;
  id: string;
  pip_size: number;
  quote: number;
  symbol: string;
}

export interface TicksHistoryResponse {
  history: {
    prices: number[];
    times: number[];
  };
}

export interface ContractsForResponse {
  contracts_for: {
    available: ContractInfo[];
  };
}

export interface ContractInfo {
  barriers: number;
  contract_category: string;
  contract_type: string;
  default_stake: number;
  expiry_type: string;
  last_digit_range: number[];
  market: string;
  max_contract_duration: string;
  min_contract_duration: string;
  sentiment: string;
  submarket: string;
  underlying_symbol: string;
}

export interface DurationLimits {
  min: number;
  max: number;
  unit: string;
}

export interface ProposalResponse {
  proposal: {
    ask_price: number;
    payout: number;
    id: string;
    longcode: string;
    spot: number;
    spot_time: number;
    date_start: number;
    date_expiry: number;
    validation_params: {
      stake: { min: string };
      payout: { max: string };
    };
  };
  subscription: {
    id: string;
  };
}

export interface ProposalInfo {
  id: string;
  askPrice: number;
  payout: number;
  longcode: string;
  minStake: number;
  maxPayout: number;
}

export interface BuyResponse {
  buy: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    longcode: string;
    payout: number;
    purchase_time: number;
    shortcode: string;
    start_time: number;
    transaction_id: number;
  };
}

export interface BuyResult {
  contractId: number;
  buyPrice: number;
  payout: number;
  longcode: string;
  balanceAfter: number;
}

export interface ProposalParams {
  contractType: string;
  symbol: string;
  amount: number;
  duration: number;
  durationUnit: string;
  basis: 'stake' | 'payout';
  currency: string;
  barrier?: number;
  dateExpiry?: number;
}
