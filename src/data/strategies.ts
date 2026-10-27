import {
  DEMO_SNAPSHOT_MS,
  DEMO_TIME_TO_EXPIRY,
  DIVIDEND_YIELD,
  RISK_FREE_RATE,
  findQuote,
  underlying,
} from "./options";
import { blackScholesPrice } from "../domain/optionMath";
import { computed } from "vue";
import { getAppLocale } from "../i18n";
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
    id: "long-put",
    name: "买入认沽",
    shortName: "买认沽",
    thesis: "看跌标的，以有限权利金换取下行方向的收益机会。",
    risk: "有限风险",
    tag: "方向",
    legs: [{ type: "put", side: "buy", quantity: 1, strike: 4.1 }],
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
    id: "bear-put-spread",
    name: "熊市看跌价差",
    shortName: "熊市价差",
    thesis: "温和看跌，买入较高行权价认沽并卖出较低行权价认沽。",
    risk: "风险可控",
    tag: "价差",
    legs: [
      { type: "put", side: "buy", quantity: 1, strike: 4.2 },
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
    ],
  },
  {
    id: "bull-put-spread",
    name: "牛市看跌价差",
    shortName: "卖出认沽价差",
    thesis: "判断标的不跌破支撑位，通过卖出较高行权价认沽收取权利金。",
    risk: "风险可控",
    tag: "信用价差",
    legs: [
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
      { type: "put", side: "buy", quantity: 1, strike: 3.9 },
    ],
  },
  {
    id: "bear-call-spread",
    name: "熊市看涨价差",
    shortName: "卖出认购价差",
    thesis: "判断标的难以突破压力位，通过卖出较低行权价认购获取权利金。",
    risk: "风险可控",
    tag: "信用价差",
    legs: [
      { type: "call", side: "sell", quantity: 1, strike: 4.1 },
      { type: "call", side: "buy", quantity: 1, strike: 4.2 },
    ],
  },
  {
    id: "risk-reversal",
    name: "风险逆转",
    shortName: "风险逆转",
    thesis: "买入认购表达看涨，同时卖出认沽收取权利金降低净成本。",
    risk: "高风险",
    tag: "合成方向",
    legs: [
      { type: "call", side: "buy", quantity: 1, strike: 4.2 },
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
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
    id: "short-straddle",
    name: "卖出跨式",
    shortName: "卖跨式",
    thesis: "预期标的窄幅震荡，同时卖出同执行价认购和认沽收取时间价值。",
    risk: "高风险",
    tag: "卖方波动率",
    legs: [
      { type: "call", side: "sell", quantity: 1, strike: 4.1 },
      { type: "put", side: "sell", quantity: 1, strike: 4.1 },
    ],
  },
  {
    id: "short-strangle",
    name: "卖出宽跨式",
    shortName: "卖宽跨",
    thesis: "预期标的停留在宽幅区间，同时卖出虚值认购和认沽。",
    risk: "高风险",
    tag: "卖方波动率",
    legs: [
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
      { type: "call", side: "sell", quantity: 1, strike: 4.2 },
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
    id: "iron-butterfly",
    name: "铁蝶式",
    shortName: "铁蝶",
    thesis: "押注到期价格靠近中间执行价，同时用两侧买入腿限定风险。",
    risk: "风险可控",
    tag: "区间",
    legs: [
      { type: "put", side: "buy", quantity: 1, strike: 3.9 },
      { type: "put", side: "sell", quantity: 1, strike: 4.1 },
      { type: "call", side: "sell", quantity: 1, strike: 4.1 },
      { type: "call", side: "buy", quantity: 1, strike: 4.3 },
    ],
  },
  {
    id: "long-condor",
    name: "买入鹰式",
    shortName: "买鹰式",
    thesis: "支付有限净权利金，押注到期价格落在中间宽区间。",
    risk: "有限风险",
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
  {
    id: "jade-lizard",
    name: "玉蜥式",
    shortName: "玉蜥",
    thesis: "用卖出认沽和认购信用价差收取权利金，押注标的不大幅波动。",
    risk: "风险可控",
    tag: "偏卖方",
    legs: [
      { type: "put", side: "sell", quantity: 1, strike: 4.0 },
      { type: "call", side: "sell", quantity: 1, strike: 4.2 },
      { type: "call", side: "buy", quantity: 1, strike: 4.3 },
    ],
  },
  {
    id: "call-ratio-spread",
    name: "认购比例价差",
    shortName: "比例价差",
    thesis: "温和看涨并卖出更多高行权价认购，以尾部风险换取净权利金。",
    risk: "高风险",
    tag: "比例",
    legs: [
      { type: "call", side: "buy", quantity: 1, strike: 4.0 },
      { type: "call", side: "sell", quantity: 2, strike: 4.2 },
    ],
  },
];

interface StrategyEnglish {
  name: string;
  shortName: string;
  thesis: string;
  risk: string;
  tag: string;
}

const strategyEnglish: Record<string, StrategyEnglish> = {
  "long-call": {
    name: "Buy Call",
    shortName: "Buy call",
    thesis: "Bullish view; use limited premium for upside exposure.",
    risk: "Limited risk",
    tag: "Directional",
  },
  "long-put": {
    name: "Buy Put",
    shortName: "Buy put",
    thesis: "Bearish view; use limited premium for downside exposure.",
    risk: "Limited risk",
    tag: "Directional",
  },
  "bull-call-spread": {
    name: "Bull Call Spread",
    shortName: "Bull call spread",
    thesis: "Moderately bullish; sell a higher-strike call to lower premium cost.",
    risk: "Defined risk",
    tag: "Spread",
  },
  "bear-put-spread": {
    name: "Bear Put Spread",
    shortName: "Bear put spread",
    thesis: "Moderately bearish; buy a higher-strike put and sell a lower-strike put.",
    risk: "Defined risk",
    tag: "Spread",
  },
  "bull-put-spread": {
    name: "Bull Put Spread",
    shortName: "Sell put spread",
    thesis: "Expect support to hold; sell a higher-strike put to collect premium.",
    risk: "Defined risk",
    tag: "Credit spread",
  },
  "bear-call-spread": {
    name: "Bear Call Spread",
    shortName: "Sell call spread",
    thesis: "Expect resistance to hold; sell a lower-strike call to collect premium.",
    risk: "Defined risk",
    tag: "Credit spread",
  },
  "risk-reversal": {
    name: "Risk Reversal",
    shortName: "Risk reversal",
    thesis: "Buy a call for upside and sell a put to offset net cost.",
    risk: "High risk",
    tag: "Synthetic",
  },
  "long-straddle": {
    name: "Long Straddle",
    shortName: "Long straddle",
    thesis: "Expect volatility to expand without a directional view; time decay is the main headwind.",
    risk: "Limited risk",
    tag: "Volatility",
  },
  "short-straddle": {
    name: "Short Straddle",
    shortName: "Short straddle",
    thesis: "Expect a narrow range; sell same-strike call and put to collect time value.",
    risk: "High risk",
    tag: "Short volatility",
  },
  "short-strangle": {
    name: "Short Strangle",
    shortName: "Short strangle",
    thesis: "Expect a wide range; sell out-of-the-money call and put.",
    risk: "High risk",
    tag: "Short volatility",
  },
  "iron-condor": {
    name: "Iron Condor",
    shortName: "Iron condor",
    thesis: "Expect range-bound movement; collect time value with defined risk.",
    risk: "Defined risk",
    tag: "Range",
  },
  "iron-butterfly": {
    name: "Iron Butterfly",
    shortName: "Iron butterfly",
    thesis: "Bet expiry stays near the middle strike while limiting risk with wing buys.",
    risk: "Defined risk",
    tag: "Range",
  },
  "long-condor": {
    name: "Long Condor",
    shortName: "Long condor",
    thesis: "Pay limited net premium to bet expiry lands in a wide middle range.",
    risk: "Limited risk",
    tag: "Range",
  },
  butterfly: {
    name: "Call Butterfly",
    shortName: "Butterfly",
    thesis: "Bet expiry stays near the middle strike with low volatility and direction exposure.",
    risk: "Defined risk",
    tag: "Convergence",
  },
  "jade-lizard": {
    name: "Jade Lizard",
    shortName: "Jade lizard",
    thesis: "Collect premium with a short put and call credit spread; bet against a large move.",
    risk: "Defined risk",
    tag: "Short bias",
  },
  "call-ratio-spread": {
    name: "Call Ratio Spread",
    shortName: "Ratio spread",
    thesis: "Moderately bullish; sell more higher-strike calls, trading tail risk for net premium.",
    risk: "High risk",
    tag: "Ratio",
  },
};

function localizedTemplate(template: StrategyTemplate): StrategyTemplate {
  if (getAppLocale() !== "en") return template;
  const english = strategyEnglish[template.id];
  if (!english) return template;
  return {
    ...template,
    name: english.name,
    shortName: english.shortName,
    thesis: english.thesis,
    risk: english.risk,
    tag: english.tag,
  };
}

export const localizedStrategyTemplates = computed<StrategyTemplate[]>(() =>
  strategyTemplates.map(localizedTemplate),
);

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
