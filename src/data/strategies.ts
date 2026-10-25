import {
  DEMO_SNAPSHOT_MS,
  DEMO_TIME_TO_EXPIRY,
  DIVIDEND_YIELD,
  RISK_FREE_RATE,
  findQuote,
  underlying,
} from "./options";
import { blackScholesPrice } from "../domain/optionMath";
import type {
  PayoffPoint,
  ScenarioCell,
  StrategyLeg,
  StrategyMetrics,
  StrategyTemplate,
} from "../domain/types";

export const strategyTemplates: StrategyTemplate[] = [
  {
    id: "long-call",
    name: "买入认购",
    shortName: "买认购",
    thesis: "看涨标的，希望以有限权利金获得上行敞口。",
    risk: "有限风险",
    tag: "方向",
    legs: [{ type: "call", side: "buy", quantity: 1, strike: 4.1 }],
  },
  {
    id: "bull-call-spread",
    name: "牛市看涨价差",
    shortName: "牛市价差",
    thesis: "温和看涨，用卖出更高行权价认购降低权利金成本。",
    risk: "风险可控",
    tag: "价差",
    legs: [
      { type: "call", side: "buy", quantity: 1, strike: 4.1 },
      { type: "call", side: "sell", quantity: 1, strike: 4.2 },
    ],
  },
  {
    id: "long-straddle",
    name: "买入跨式",
    shortName: "买跨式",
    thesis: "预期波动放大，但不判断方向；时间衰减是主要逆风。",
    risk: "有限风险",
    tag: "波动率",
    legs: [
      { type: "call", side: "buy", quantity: 1, strike: 4.1 },
      { type: "put", side: "buy", quantity: 1, strike: 4.1 },
    ],
  },
  {
    id: "iron-condor",
    name: "铁鹰式",
    shortName: "铁鹰",
    thesis: "预期标的在区间内震荡，以有限风险收取时间价值。",
    risk: "风险可控",
    tag: "区间",
    legs: [
      { type: "put", side: "buy", quantity: 1, strike: 3.9 },
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
      { type: "call", side: "sell", quantity: 1, strike: 4.2 },
      { type: "call", side: "buy", quantity: 1, strike: 4.3 },
    ],
  },
  {
    id: "butterfly",
    name: "认购蝶式",
    shortName: "蝶式",
    thesis: "押注到期价格靠近中间行权价，波动和方向敞口都较小。",
    risk: "风险可控",
    tag: "收敛",
    legs: [
      { type: "call", side: "buy", quantity: 1, strike: 3.9 },
      { type: "call", side: "sell", quantity: 2, strike: 4.1 },
      { type: "call", side: "buy", quantity: 1, strike: 4.3 },
    ],
  },
];

export function buildStrategyLegs(templateId = "bull-call-spread") {
  const template =
    strategyTemplates.find((item) => item.id === templateId) ??
    strategyTemplates[1] ??
    strategyTemplates[0];
  if (!template) return [];

  return template.legs.map((leg, index) => {
    const quote = findQuote(leg.type, leg.strike);
    if (!quote) {
      throw new Error(`Missing quote for ${leg.type} ${leg.strike}`);
    }
    return {
      ...leg,
      uid: `${template.id}-${index}`,
      quoteId: quote.id,
      premium: quote.premium,
      iv: quote.iv,
      expiry: quote.expiry,
    } satisfies StrategyLeg;
  });
}

function expiryPnl(legs: StrategyLeg[], price: number) {
  return legs.reduce((total, leg) => {
    const intrinsic =
      leg.type === "call"
        ? Math.max(price - leg.strike, 0)
        : Math.max(leg.strike - price, 0);
    const side = leg.side === "buy" ? 1 : -1;
    return (
      total +
      side * (intrinsic - leg.premium) * leg.quantity * 10000
    );
  }, 0);
}

function theoreticalPnl(
  legs: StrategyLeg[],
  price: number,
  timeYears: number,
  ivShift = 0,
) {
  return legs.reduce((total, leg) => {
    const theoretical = blackScholesPrice(
      leg.type,
      price,
      leg.strike,
      Math.max(timeYears, 0),
      RISK_FREE_RATE,
      DIVIDEND_YIELD,
      leg.iv + ivShift,
    );
    const side = leg.side === "buy" ? 1 : -1;
    return (
      total +
      side * (theoretical - leg.premium) * leg.quantity * 10000
    );
  }, 0);
}

function makeSeries(
  legs: StrategyLeg[],
  low: number,
  high: number,
  count: number,
  evaluator: (price: number) => number,
): PayoffPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const price = low + ((high - low) * index) / (count - 1);
    return { price, value: evaluator(price) };
  });
}

function findBreakevens(series: PayoffPoint[]) {
  const points: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];
    if (!previous || !current) continue;
    if (previous.value === 0) {
      points.push(previous.price);
      continue;
    }
    if (previous.value * current.value < 0) {
      const ratio = Math.abs(previous.value) / (Math.abs(previous.value) + Math.abs(current.value));
      points.push(previous.price + (current.price - previous.price) * ratio);
    }
  }
  return [...new Set(points.map((value) => Number(value.toFixed(3))))].slice(0, 4);
}

export function calculateStrategyMetrics(
  legs: StrategyLeg[],
  spot = underlying.spot,
): StrategyMetrics {
  const strikes = legs.map((leg) => leg.strike);
  const low = Math.min(spot * 0.86, Math.min(...strikes) - 0.18);
  const high = Math.max(spot * 1.14, Math.max(...strikes) + 0.18);
  const expirySeries = makeSeries(legs, low, high, 121, (price) =>
    expiryPnl(legs, price),
  );
  const currentSeries = makeSeries(legs, low, high, 121, (price) =>
    theoreticalPnl(legs, price, DEMO_TIME_TO_EXPIRY),
  );
  const values = expirySeries.map((point) => point.value);
  const finiteMax = Math.max(...values);
  const finiteMin = Math.min(...values);
  const netCallQty = legs.reduce(
    (total, leg) =>
      total +
      (leg.type === "call"
        ? (leg.side === "buy" ? 1 : -1) * leg.quantity
        : 0),
    0,
  );
  const maxProfitUnlimited = netCallQty > 0;
  const maxLossUnlimited = netCallQty < 0;
  const netPremium = legs.reduce((total, leg) => {
    const side = leg.side === "buy" ? 1 : -1;
    return total + side * leg.premium * leg.quantity * 10000;
  }, 0);
  const greeks = legs.reduce(
    (total, leg) => {
      const quote = legs.find((item) => item.uid === leg.uid);
      if (!quote) return total;
      const source = findQuote(leg.type, leg.strike);
      if (!source) return total;
      const side = leg.side === "buy" ? 1 : -1;
      const multiplier = side * leg.quantity * 10000;
      return {
        delta: total.delta + source.greeks.delta * multiplier,
        gamma: total.gamma + source.greeks.gamma * multiplier,
        theta: total.theta + source.greeks.theta * multiplier,
        vega: total.vega + source.greeks.vega * multiplier,
      };
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0 },
  );

  const scenarios: ScenarioCell[] = [];
  for (const priceShock of [-0.05, -0.025, 0, 0.025, 0.05]) {
    for (const ivShock of [-0.05, 0, 0.05]) {
      scenarios.push({
        priceShock,
        ivShock,
        value: theoreticalPnl(
          legs,
          spot * (1 + priceShock),
          DEMO_TIME_TO_EXPIRY,
          ivShock,
        ),
      });
    }
  }

  return {
    expirySeries,
    currentSeries,
    breakevens: findBreakevens(expirySeries),
    maxProfit: maxProfitUnlimited ? Number.POSITIVE_INFINITY : finiteMax,
    maxLoss: maxLossUnlimited ? Number.NEGATIVE_INFINITY : finiteMin,
    maxProfitUnlimited,
    maxLossUnlimited,
    netPremium,
    netDelta: greeks.delta,
    netGamma: greeks.gamma,
    netTheta: greeks.theta,
    netVega: greeks.vega,
    scenarios,
  };
}

export function elapsedDaysLabel() {
  return Math.max(
    0,
    Math.ceil(
      (Date.parse("2026-11-25T15:00:00+08:00") - DEMO_SNAPSHOT_MS) /
        (24 * 60 * 60 * 1000),
    ),
  );
}
