import type { Greeks, OptionType } from "./types";

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function normalPdf(value: number) {
  return Math.exp(-0.5 * value * value) / SQRT_2PI;
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t) *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function blackScholesPrice(
  type: OptionType,
  spot: number,
  strike: number,
  timeYears: number,
  rate: number,
  dividendYield: number,
  volatility: number,
) {
  if (timeYears <= 0) {
    return type === "call"
      ? Math.max(spot - strike, 0)
      : Math.max(strike - spot, 0);
  }
  const safeVol = Math.max(volatility, 0.0001);
  const sqrtT = Math.sqrt(timeYears);
  const d1 =
    (Math.log(spot / strike) +
      (rate - dividendYield + 0.5 * safeVol * safeVol) * timeYears) /
    (safeVol * sqrtT);
  const d2 = d1 - safeVol * sqrtT;
  const carry = Math.exp(-dividendYield * timeYears);
  const discount = Math.exp(-rate * timeYears);

  if (type === "call") {
    return spot * carry * normalCdf(d1) - strike * discount * normalCdf(d2);
  }
  return strike * discount * normalCdf(-d2) - spot * carry * normalCdf(-d1);
}

export function blackScholesGreeks(
  type: OptionType,
  spot: number,
  strike: number,
  timeYears: number,
  rate: number,
  dividendYield: number,
  volatility: number,
): Greeks {
  if (timeYears <= 0) {
    const delta =
      type === "call" ? (spot > strike ? 1 : 0) : spot < strike ? -1 : 0;
    return { delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const safeVol = Math.max(volatility, 0.0001);
  const sqrtT = Math.sqrt(timeYears);
  const d1 =
    (Math.log(spot / strike) +
      (rate - dividendYield + 0.5 * safeVol * safeVol) * timeYears) /
    (safeVol * sqrtT);
  const d2 = d1 - safeVol * sqrtT;
  const carry = Math.exp(-dividendYield * timeYears);
  const discount = Math.exp(-rate * timeYears);
  const pdf = normalPdf(d1);
  const delta =
    type === "call"
      ? carry * normalCdf(d1)
      : carry * (normalCdf(d1) - 1);
  const gamma = (carry * pdf) / (spot * safeVol * sqrtT);
  const vega = (spot * carry * pdf * sqrtT) / 100;
  const thetaAnnual =
    (-spot * carry * pdf * safeVol) / (2 * sqrtT) +
    (type === "call"
      ? -rate * strike * discount * normalCdf(d2) +
        dividendYield * spot * carry * normalCdf(d1)
      : rate * strike * discount * normalCdf(-d2) -
        dividendYield * spot * carry * normalCdf(-d1));
  const theta = thetaAnnual / 365;
  const rho =
    (type === "call"
      ? strike * timeYears * discount * normalCdf(d2)
      : -strike * timeYears * discount * normalCdf(-d2)) / 100;

  return { delta, gamma, theta, vega, rho };
}

export function impliedVolatility(
  type: OptionType,
  marketPrice: number,
  spot: number,
  strike: number,
  timeYears: number,
  rate: number,
  dividendYield: number,
) {
  if (timeYears <= 0 || marketPrice <= 0) return 0;
  let low = 0.0001;
  let high = 3;
  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    const price = blackScholesPrice(
      type,
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
      mid,
    );
    if (price > marketPrice) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export function yearsBetween(fromMs: number, toMs: number) {
  return Math.max(toMs - fromMs, 0) / (365 * 24 * 60 * 60 * 1000);
}

export function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
