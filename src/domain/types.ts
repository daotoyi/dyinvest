export type OptionType = "call" | "put";
export type OptionSide = "buy" | "sell";

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionQuote {
  id: string;
  type: OptionType;
  strike: number;
  premium: number;
  previousPremium: number;
  changePct: number;
  iv: number;
  volume: number;
  openInterest: number;
  greeks: Greeks;
  expiry: string;
}

export interface OptionChainRow {
  strike: number;
  call: OptionQuote;
  put: OptionQuote;
}

export interface StrategyLegSpec {
  type: OptionType;
  side: OptionSide;
  quantity: number;
  strike: number;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  shortName: string;
  thesis: string;
  risk: string;
  tag: string;
  legs: StrategyLegSpec[];
}

export interface StrategyLeg extends StrategyLegSpec {
  uid: string;
  quoteId: string;
  premium: number;
  iv: number;
  expiry: string;
}

export interface PayoffPoint {
  price: number;
  value: number;
}

export interface ScenarioCell {
  priceShock: number;
  ivShock: number;
  value: number;
}

export interface StrategyMetrics {
  expirySeries: PayoffPoint[];
  currentSeries: PayoffPoint[];
  breakevens: number[];
  maxProfit: number;
  maxLoss: number;
  maxProfitUnlimited: boolean;
  maxLossUnlimited: boolean;
  netPremium: number;
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  scenarios: ScenarioCell[];
}

export interface PaperPosition {
  key: string;
  quoteId: string;
  type: OptionType;
  strike: number;
  expiry: string;
  netQty: number;
  avgPremium: number;
}

export interface PaperOrderLeg {
  type: OptionType;
  side: OptionSide;
  quantity: number;
  strike: number;
  premium: number;
}

export interface PaperOrder {
  id: string;
  createdAt: string;
  title: string;
  subtitle: string;
  status: string;
  cashFlow: number;
  quantity: number;
  legs?: PaperOrderLeg[];
}

export interface PaperAccountState {
  cash: number;
  realizedPnl: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  equityHistory: number[];
}
