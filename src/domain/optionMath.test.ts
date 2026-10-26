import { describe, expect, it } from "vitest";
import {
  blackScholesGreeks,
  blackScholesPrice,
  impliedVolatility,
} from "./optionMath";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
  strategyTemplates,
} from "../data/strategies";
import type { StrategyLeg } from "./types";

describe("Black-Scholes-Merton", () => {
  const spot = 4.128;
  const strike = 4.1;
  const timeYears = 0.1;
  const rate = 0.015;
  const dividendYield = 0.018;
  const volatility = 0.19;

  it("satisfies put-call parity", () => {
    const call = blackScholesPrice(
      "call",
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
      volatility,
    );
    const put = blackScholesPrice(
      "put",
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
      volatility,
    );
    const expected =
      spot * Math.exp(-dividendYield * timeYears) -
      strike * Math.exp(-rate * timeYears);
    expect(call - put).toBeCloseTo(expected, 8);
  });

  it("returns intrinsic value at expiry", () => {
    expect(
      blackScholesPrice("call", 4.2, 4.1, 0, rate, dividendYield, volatility),
    ).toBeCloseTo(0.1, 8);
    expect(
      blackScholesPrice("put", 4.2, 4.1, 0, rate, dividendYield, volatility),
    ).toBe(0);
  });

  it("recovers implied volatility", () => {
    const price = blackScholesPrice(
      "call",
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
      volatility,
    );
    const implied = impliedVolatility(
      "call",
      price,
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
    );
    expect(implied).toBeCloseTo(volatility, 5);
  });

  it("produces finite Greeks", () => {
    const greeks = blackScholesGreeks(
      "put",
      spot,
      strike,
      timeYears,
      rate,
      dividendYield,
      volatility,
    );
    Object.values(greeks).forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
    });
    expect(greeks.delta).toBeLessThan(0);
    expect(greeks.vega).toBeGreaterThan(0);
  });
});

describe("strategy payoff", () => {
  it("builds every strategy template with available demo quotes", () => {
    expect(new Set(strategyTemplates.map((template) => template.id)).size).toBe(
      strategyTemplates.length,
    );

    for (const template of strategyTemplates) {
      const legs = buildStrategyLegs(template.id);
      expect(legs.length, template.id).toBe(template.legs.length);
      expect(
        legs.every((leg) => Number.isFinite(leg.premium) && leg.premium > 0),
        template.id,
      ).toBe(true);
      expect(calculateStrategyMetrics(legs).scenarios, template.id).toHaveLength(
        15,
      );
    }
  });

  it("keeps a bull call spread risk bounded", () => {
    const metrics = calculateStrategyMetrics(
      buildStrategyLegs("bull-call-spread"),
    );
    expect(metrics.maxProfitUnlimited).toBe(false);
    expect(metrics.maxLossUnlimited).toBe(false);
    expect(metrics.maxProfit).toBeGreaterThan(0);
    expect(metrics.maxLoss).toBeLessThan(0);
    expect(metrics.netPremium).toBeGreaterThan(0);
    expect(metrics.breakevens.length).toBeGreaterThan(0);
  });

  it("identifies unlimited risk for a naked short call", () => {
    const legs: StrategyLeg[] = [
      {
        uid: "short-call",
        quoteId: "short-call",
        type: "call",
        side: "sell",
        quantity: 1,
        strike: 4.1,
        premium: 0.08,
        iv: 0.19,
        expiry: "2026-11-25",
      },
    ];
    const metrics = calculateStrategyMetrics(legs);
    expect(metrics.maxLossUnlimited).toBe(true);
    expect(metrics.maxProfit).toBeCloseTo(800, 4);
  });

  it("keeps an iron condor risk bounded", () => {
    const metrics = calculateStrategyMetrics(buildStrategyLegs("iron-condor"));
    expect(metrics.maxProfitUnlimited).toBe(false);
    expect(metrics.maxLossUnlimited).toBe(false);
    expect(metrics.maxLoss).toBeLessThan(0);
    expect(metrics.scenarios).toHaveLength(15);
  });
});
