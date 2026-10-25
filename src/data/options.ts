import { blackScholesGreeks, blackScholesPrice, round, yearsBetween } from "../domain/optionMath";
import type { OptionChainRow, OptionQuote, OptionType } from "../domain/types";

export const DEMO_SNAPSHOT_MS = Date.parse("2026-10-23T15:00:00+08:00");
export const DEMO_SNAPSHOT_LABEL = "10/23 15:00 · 演示数据";
export const DEMO_EXPIRY = "2026-11-25";
export const DEMO_EXPIRY_LABEL = "11月25日";
export const CONTRACT_MULTIPLIER = 10000;
export const RISK_FREE_RATE = 0.015;
export const DIVIDEND_YIELD = 0.018;

export const underlying = {
  symbol: "510300",
  name: "沪深300ETF",
  spot: 4.128,
  change: 0.026,
  changePct: 0.0063,
  iv: 0.187,
  snapshot: DEMO_SNAPSHOT_LABEL,
};

const strikeConfig = [
  { strike: 3.9, callIv: 0.225, putIv: 0.235, callVolume: 1284, putVolume: 2146, callOi: 7820, putOi: 10340 },
  { strike: 4.0, callIv: 0.205, putIv: 0.213, callVolume: 3680, putVolume: 4912, callOi: 14260, putOi: 18820 },
  { strike: 4.1, callIv: 0.188, putIv: 0.194, callVolume: 7216, putVolume: 6430, callOi: 22140, putOi: 19680 },
  { strike: 4.2, callIv: 0.179, putIv: 0.185, callVolume: 4806, putVolume: 3184, callOi: 17420, putOi: 13270 },
  { strike: 4.3, callIv: 0.183, putIv: 0.191, callVolume: 2094, putVolume: 1608, callOi: 9260, putOi: 8100 },
];

const expiryMs = Date.parse(`${DEMO_EXPIRY}T15:00:00+08:00`);
export const DEMO_TIME_TO_EXPIRY = yearsBetween(DEMO_SNAPSHOT_MS, expiryMs);

function createQuote(
  type: OptionType,
  config: (typeof strikeConfig)[number],
): OptionQuote {
  const iv = type === "call" ? config.callIv : config.putIv;
  const premium = round(
    blackScholesPrice(
      type,
      underlying.spot,
      config.strike,
      DEMO_TIME_TO_EXPIRY,
      RISK_FREE_RATE,
      DIVIDEND_YIELD,
      iv,
    ),
    4,
  );
  const previousPremium = round(premium * (1 - (type === "call" ? 0.018 : -0.012)), 4);
  return {
    id: `${underlying.symbol}-${type}-${DEMO_EXPIRY}-${config.strike.toFixed(3)}`,
    type,
    strike: config.strike,
    premium,
    previousPremium,
    changePct: previousPremium === 0 ? 0 : (premium - previousPremium) / previousPremium,
    iv,
    volume: type === "call" ? config.callVolume : config.putVolume,
    openInterest: type === "call" ? config.callOi : config.putOi,
    greeks: blackScholesGreeks(
      type,
      underlying.spot,
      config.strike,
      DEMO_TIME_TO_EXPIRY,
      RISK_FREE_RATE,
      DIVIDEND_YIELD,
      iv,
    ),
    expiry: DEMO_EXPIRY,
  };
}

export const optionQuotes: OptionQuote[] = strikeConfig.flatMap((config) => [
  createQuote("call", config),
  createQuote("put", config),
]);

export const optionChain: OptionChainRow[] = strikeConfig.map((config) => ({
  strike: config.strike,
  call: optionQuotes.find(
    (quote) => quote.type === "call" && quote.strike === config.strike,
  ) as OptionQuote,
  put: optionQuotes.find(
    (quote) => quote.type === "put" && quote.strike === config.strike,
  ) as OptionQuote,
}));

export function findQuote(type: OptionType, strike: number) {
  return optionQuotes.find(
    (quote) => quote.type === type && quote.strike === strike,
  );
}

export function findQuoteById(id: string) {
  return optionQuotes.find((quote) => quote.id === id);
}

export function optionDisplayName(type: OptionType, strike: number) {
  return `300ETF${type === "call" ? "购" : "沽"}${DEMO_EXPIRY_LABEL.replace("月", "月")}${Math.round(
    strike * 1000,
  )}`;
}

export const overviewQuotes = [findQuote("call", 4.1), findQuote("put", 4.1)]
  .filter((quote): quote is OptionQuote => Boolean(quote));
