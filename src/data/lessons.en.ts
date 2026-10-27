import type { Lesson } from "./lessons";

export const englishLessons: Record<string, Lesson> = {
  "option-basics": {
    id: "option-basics",
    chapter: "01 · Contract basics",
    title: "An option is not a cheap stock",
    summary: "Separate rights, obligations and expiry before discussing price.",
    minutes: 6,
    level: "基础",
    icon: "book",
    keyIdea: "A buyer purchases a future choice; a seller accepts an obligation.",
    sections: [
      {
        heading: "One contract, two sides",
        body: [
          "A call gives its buyer the right to buy the underlying at a fixed price before expiry. A put gives the right to sell. The buyer pays a premium; the seller receives it and accepts the obligation to perform.",
          "An option is not simply a leveraged stock. Its value depends on the underlying, time to expiry, volatility and strike. It can expire worthless.",
        ],
      },
      {
        heading: "Deconstruct the contract",
        body: [
          "Read the underlying, call or put direction, strike, expiry, contract multiplier, premium and trading unit. Each element changes the risk profile.",
          "Exchange and broker rules define settlement, exercise and position limits. Always use the current contract specification.",
        ],
        note: "A low premium is not automatically a bargain. Cheap out-of-the-money options also have a higher probability of expiring worthless.",
      },
    ],
    quiz: {
      question: "What core right does the buyer of a call receive?",
      options: ["Sell the underlying at a fixed price", "Buy the underlying at a fixed price", "Require the seller to post more margin"],
      answer: 1,
      explanation: "A call buyer has the right, not the obligation, to buy at the strike price.",
    },
  },
  "contract-anatomy": {
    id: "contract-anatomy",
    chapter: "01 · Contract basics",
    title: "Read an option contract",
    summary: "Underlying, direction, strike, expiry and multiplier all matter.",
    minutes: 8,
    level: "基础",
    icon: "layers",
    keyIdea: "Every number in an option name maps to a source of risk.",
    sections: [
      {
        heading: "The name is a map",
        body: [
          "In a contract such as 300ETF Call Nov 4.100, 300ETF is the underlying, Call is the direction, November is the expiry month and 4.100 is the strike.",
          "The strike is not a forecast. It is the fixed price used at exercise. Its distance from spot determines whether the option is in, at or out of the money.",
        ],
      },
      {
        heading: "Expiry drives time value",
        body: [
          "More time gives the underlying more opportunity to move and usually makes an option more expensive. Time decay often accelerates near expiry.",
          "Use the exact exchange calendar for exercise and settlement. A simulation that ignores contract rules will produce misleading results.",
        ],
      },
    ],
    quiz: {
      question: "What does 4.100 represent in the contract name?",
      options: ["Contract multiplier", "Theoretical price", "Strike price"],
      answer: 2,
      explanation: "4.100 is the strike, displayed in the underlying price unit.",
    },
  },
  "premium-value": {
    id: "premium-value",
    chapter: "02 · Pricing",
    title: "Time value inside the premium",
    summary: "Understand intrinsic value, time value and implied volatility.",
    minutes: 10,
    level: "基础",
    icon: "calculator",
    keyIdea: "Option price = intrinsic value + the time value the market will pay.",
    sections: [
      {
        heading: "Start with intrinsic value",
        body: [
          "A call's intrinsic value is max(S - K, 0); a put's is max(K - S, 0). Intrinsic value cannot be negative for the holder.",
          "An option with zero intrinsic value can still trade above zero because the underlying may move before expiry. That remaining amount is time value.",
        ],
        formula: "Call intrinsic = max(S - K, 0) | Put intrinsic = max(K - S, 0)",
      },
      {
        heading: "Volatility is not a return forecast",
        body: [
          "Implied volatility is the market's forward-looking volatility input implied by option prices. Higher IV usually helps long options and hurts short options.",
          "High volatility makes options more expensive and prices faster. Direction, magnitude, timing and volatility richness are separate questions.",
        ],
        note: "Being right on direction can still lose money when time passes or implied volatility falls.",
      },
    ],
    quiz: {
      question: "Which factor usually hurts a long option position?",
      options: ["Rising implied volatility", "Passage of time", "The underlying moving favorably"],
      answer: 1,
      explanation: "Theta is commonly negative for option buyers and represents time decay.",
    },
  },
  "delta-gamma": {
    id: "delta-gamma",
    chapter: "03 · Risk metrics",
    title: "Delta and Gamma: direction and acceleration",
    summary: "Use Greeks to understand sensitivity to the underlying.",
    minutes: 8,
    level: "进阶",
    icon: "trendUp",
    keyIdea: "Delta measures directional exposure; Gamma measures how fast that exposure changes.",
    sections: [
      {
        heading: "Delta is directional exposure",
        body: [
          "Delta approximates the option price change for a one-unit move in the underlying. Calls usually have positive Delta and puts negative Delta.",
          "Aggregate every leg by side, quantity and multiplier. Positive net Delta generally benefits from upside; negative net Delta benefits from downside.",
        ],
      },
      {
        heading: "Gamma changes Delta",
        body: [
          "Gamma measures how quickly Delta changes as spot moves. At-the-money and near-expiry options often have higher Gamma.",
          "High Gamma is not automatically high risk, but exposure can change quickly. Short options need particular attention when spot crosses the strike.",
        ],
        formula: "Portfolio Delta = Σ(leg Delta × side × quantity × multiplier)",
      },
    ],
    quiz: {
      question: "Positive portfolio Delta usually benefits from what?",
      options: ["The underlying rising", "The underlying falling", "No sensitivity to the underlying"],
      answer: 0,
      explanation: "Positive Delta generally means the position gains when the underlying rises and loses when it falls.",
    },
  },
  "theta-vega": {
    id: "theta-vega",
    chapter: "03 · Risk metrics",
    title: "Theta and Vega: time and volatility",
    summary: "Two forces beyond direction also change option value.",
    minutes: 9,
    level: "进阶",
    icon: "clock",
    keyIdea: "Theta prices time; Vega prices the market's level of uncertainty.",
    sections: [
      {
        heading: "Theta is the price of time",
        body: [
          "Theta estimates the value lost as one day passes. Long options commonly have negative Theta; short options commonly have positive Theta.",
          "Time decay often accelerates near expiry. A long out-of-the-money option must overcome both its premium and the passage of time.",
        ],
      },
      {
        heading: "Vega is volatility sensitivity",
        body: [
          "Vega estimates the value change for a one percentage-point change in implied volatility. Long options usually have positive Vega.",
          "High volatility does not guarantee that selling options is safe. An event can push IV even higher and expand mark-to-market losses and margin requirements.",
        ],
        note: "Greeks are local sensitivities, not a complete payoff forecast. Use scenario matrices across strikes and expiries.",
      },
    ],
    quiz: {
      question: "What Theta and Vega exposure do option buyers usually have?",
      options: ["Negative Theta, positive Vega", "Positive Theta, negative Vega", "Positive for both"],
      answer: 0,
      explanation: "Buyers pay time value and benefit when implied volatility rises: negative Theta and positive Vega.",
    },
  },
  "four-structures": {
    id: "four-structures",
    chapter: "04 · Structures",
    title: "Four foundational payoff structures",
    summary: "Start with the worst case, from single legs to spreads.",
    minutes: 12,
    level: "进阶",
    icon: "chart",
    keyIdea: "A strategy is not a name; it is a defined set of expiry outcomes and risk boundaries.",
    sections: [
      {
        heading: "Single legs are direct",
        body: [
          "A long call expresses upside; a long put expresses downside. Loss is limited to premium, but direction, time and volatility must all cooperate.",
          "Short calls or puts collect premium but require margin and carry larger tail risk. Win rate alone is not a sufficient risk measure.",
        ],
      },
      {
        heading: "Spreads narrow the boundaries",
        body: [
          "A bull call spread buys a lower-strike call and sells a higher-strike call. It reduces cost by giving up some upside.",
          "The risk is clearer, but direction, time, volatility, strike width, net premium and liquidity still determine the result.",
        ],
        note: "Define maximum loss before chasing maximum profit. A profit chart without the loss boundary hides the real risk.",
      },
    ],
    quiz: {
      question: "How is a bull call spread constructed?",
      options: ["Buy lower-strike call, sell higher-strike call", "Buy a call and a put together", "Sell lower-strike put, buy higher-strike put"],
      answer: 0,
      explanation: "Buying the lower strike and selling the higher strike creates limited risk and limited reward.",
    },
  },
  spreads: {
    id: "spreads",
    chapter: "04 · Structures",
    title: "Execution details for spreads",
    summary: "Net premium, strike width and liquidity matter together.",
    minutes: 14,
    level: "进阶",
    icon: "layers",
    keyIdea: "A spread's reward cap comes from its structure, not from a more complex name.",
    sections: [
      {
        heading: "Calculate net cost and reward",
        body: [
          "Net premium is the cost of bought legs minus income from sold legs. For a bull call spread, maximum profit is approximately strike width times multiplier minus net premium.",
          "A lower net cost improves breakeven, but moving the short leg closer to the long leg reduces upside. You cannot maximize both.",
        ],
        formula: "Max profit ≈ (K₂ - K₁) × multiplier - net premium",
      },
      {
        heading: "Execution risk lives in the order book",
        body: [
          "Multi-leg orders can fill leg by leg, face wide spreads and experience poor liquidity. Without atomic execution, partial fills can leave unintended exposure.",
          "Simulation should include fees, slippage and leg risk; otherwise reported returns are overly optimistic.",
        ],
        note: "This early paper model books the strategy as one block for learning. It does not represent live matching.",
      },
    ],
    quiz: {
      question: "What does selling the higher-strike call do in a bull call spread?",
      options: ["Lowers cost and caps upside", "Removes all risk", "Adds time income without capping upside"],
      answer: 0,
      explanation: "The short call reduces cost but caps the maximum payoff above its strike.",
    },
  },
  "margin-risk": {
    id: "margin-risk",
    chapter: "05 · Risk control",
    title: "Margin and short-option risk",
    summary: "Premium income does not make risk disappear.",
    minutes: 12,
    level: "进阶",
    icon: "shield",
    keyIdea: "Margin supports performance; it is not a promise that losses cannot exceed it.",
    sections: [
      {
        heading: "Why margin exists",
        body: [
          "Option sellers accept performance obligations, so exchanges and brokers require margin. Requirements change with spot, volatility, time and the rest of the portfolio.",
          "Insufficient available margin can trigger calls or forced liquidation. Fast price moves often arrive together with liquidity pressure.",
        ],
      },
      {
        heading: "Treat tail risk separately",
        body: [
          "A naked short call has no theoretical upside loss limit; a naked short put is most exposed as spot approaches zero. Spreads can bound some risk but do not eliminate it.",
          "Capital usage, concentration, liquidity and worst-case scenarios should come before historical win rate.",
        ],
        note: "Margin in this product is illustrative. Live requirements are determined by the broker and exchange in real time.",
      },
    ],
    quiz: {
      question: "Which statement about margin is most accurate?",
      options: ["Margin equals maximum loss", "Margin supports performance and actual losses can exceed it", "Sellers do not need to consider margin"],
      answer: 1,
      explanation: "Margin is a risk and performance requirement, not necessarily a cap on losses in extreme markets.",
    },
  },
  "delta-neutral-arb": {
    id: "delta-neutral-arb",
    chapter: "06 · Advanced Arbitrage",
    title: "Delta-neutral arbitrage: profit regardless of direction",
    summary: "Eliminate directional risk and profit from volatility.",
    minutes: 12,
    level: "高阶",
    icon: "balance",
    keyIdea: "Delta-neutral does not mean ignoring direction; it means the direction risk is hedged away, leaving only volatility exposure.",
    sections: [
      {
        heading: "What is Delta-neutral",
        body: [
          "Delta-neutral means the portfolio's net Delta is close to 0. The portfolio value stays almost unchanged as the underlying moves, with directional risk hedged.",
          "Common ways to construct a delta-neutral portfolio include buying both calls and puts with strikes near the underlying price, with quantities adjusted by Delta. For example, buy 1 contract with Delta=0.5 and sell 2 contracts with Delta=-0.25; net Delta≈0.",
        ],
      },
      {
        heading: "Volatility is the core",
        body: [
          "The price change of a delta-neutral portfolio mainly comes from Vega (volatility sensitivity). When implied volatility rises, both calls and puts benefit, giving the portfolio positive Vega profit.",
          "The core of delta-neutral arbitrage is judging whether volatility is underpriced or overpriced, not judging direction. Wrong direction judgment only brings small profit or loss and does not affect the overall directional risk of the portfolio.",
        ],
      },
      {
        heading: "Practical limitations",
        body: [
          "In real trading, Delta changes with underlying price, time, and volatility. The portfolio must be dynamically adjusted to stay neutral. This requires higher trading frequency and capital management ability.",
          "Delta-neutral arbitrage is more suitable for traders with professional trading systems, real-time data, and risk management tools, not for ordinary investors.",
        ],
        note: "This lesson is for concept introduction only and does not constitute live trading advice."
      }
    ],
    quiz: {
      question: "What is the main profit source of a delta-neutral portfolio?",
      options: [
        "The underlying rising",
        "The underlying falling",
        "Implied volatility changes"
      ],
      answer: 2,
      explanation: "Delta-neutral eliminates directional risk; the portfolio's value change mainly comes from Vega, i.e., volatility changes."
    }
  },
  "volatility-arb": {
    id: "volatility-arb",
    chapter: "06 · Advanced Arbitrage",
    title: "Volatility arbitrage: the gap between implied and historical volatility is your profit",
    summary: "Profit from the inconsistency between implied and historical volatility.",
    minutes: 15,
    level: "高阶",
    icon: "waves",
    keyIdea: "The gap between implied volatility (IV) and market expectations is the arbitrage space.",
    sections: [
      {
        heading: "The IV-HV gap",
        body: [
          "Implied volatility is the forward-looking volatility expected by the market, derived from option prices; historical volatility is the actual volatility of the underlying over a period. When IV is clearly lower than HV, options are undervalued; when IV is clearly higher than HV, options are overvalued.",
          "The IV-HV gap is usually largest around major events such as earnings, policy releases, and extreme market moves. These moments are the opportunity window for volatility arbitrage.",
        ],
      },
      {
        heading: "Common volatility arbitrage strategies",
        body: [
          "Straddle arbitrage: sell straddles when IV is overpriced and buy straddles when IV is underpriced. Regardless of direction, profit when volatility reverts to the mean.",
          "Collar arbitrage: hold the underlying while selling out-of-the-money calls and buying out-of-the-money puts. Lock in volatility exposure and reduce directional risk.",
          "Volatility spread: buy low-IV options and sell high-IV options, profit from IV reversion.",
        ],
      },
      {
        heading: "Risks and challenges",
        body: [
          "Volatility arbitrage requires real-time calculation and monitoring of IV and HV, with relatively high transaction costs. In extreme markets, IV may continue to deviate from HV, leading to sustained unrealized losses.",
          "The arbitrage space is limited and requires good trade execution and capital management. Beginners are advised to start with low-volatility markets.",
        ],
        note: "Volatility arbitrage requires a high level of trading system sophistication and is not suitable for beginners."
      }
    ],
    quiz: {
      question: "When implied volatility is clearly lower than historical volatility, options are usually what?",
      options: [
        "Undervalued",
        "Overvalued",
        "At fair value"
      ],
      answer: 0,
      explanation: "When IV is lower than HV, option prices are relatively cheap and undervalued, providing a buying opportunity."
    }
  },
  "term-structure-arb": {
    id: "term-structure-arb",
    chapter: "06 · Advanced Arbitrage",
    title: "Term structure arbitrage: pricing anomalies between near-month and far-month contracts",
    summary: "Profit from pricing differences between different expiration months.",
    minutes: 14,
    level: "高阶",
    icon: "calendar",
    keyIdea: "The same underlying may have systematic pricing differences across different expiration months.",
    sections: [
      {
        heading: "What is term structure",
        body: [
          "Term structure refers to the relationship between option prices of different expiration dates relative to the underlying. Normally, far-month options are slightly more expensive than near-month options because they include more time value.",
          "When the term structure appears abnormal, for example, far-month options are much cheaper than near-month options, there may be an arbitrage opportunity. Common reasons include liquidity differences and differing expectations of future volatility.",
        ],
      },
      {
        heading: "Common term structure arbitrage",
        body: [
          "Time value arbitrage: buy far-month low-IV options and sell near-month high-IV options, profit from IV reversion.",
          "Roll arbitrage: when near-month options are near expiration but direction judgment is unclear, roll the position to far-month to reduce time decay risk.",
          "Term spread: buy and sell similar options with different expirations together, profit from term structure changes.",
        ],
      },
      {
        heading: "Risk warnings",
        body: [
          "Term structure arbitrage requires a deep understanding of term premium and time decay. Term structure performance varies significantly across different market environments.",
          "Arbitrage portfolios typically require higher trading frequency and risk management capabilities. It is recommended to practice sufficiently in simulation before live trading.",
        ],
        note: "Term structure arbitrage requires higher professional knowledge."
      }
    ],
    quiz: {
      question: "What is the main opportunity source of term structure arbitrage?",
      options: [
        "Directional changes of the underlying",
        "Pricing differences between options of different expiration months",
        "Changes in option volatility"
      ],
      answer: 1,
      explanation: "Term structure arbitrage uses pricing anomalies between options of different expiration months, not directional moves of the underlying."
    }
  },
  "cross-asset-arb": {
    id: "cross-asset-arb",
    chapter: "06 · Advanced Arbitrage",
    title: "Cross-asset arbitrage: price differences between ETF options and index options for the same underlying",
    summary: "Profit from pricing differences of the same underlying across different option markets.",
    minutes: 13,
    level: "高阶",
    icon: "exchange",
    keyIdea: "The same underlying may have systematic pricing differences across different markets or product types.",
    sections: [
      {
        heading: "Opportunities in cross-asset arbitrage",
        body: [
          "The same underlying may trade in different markets such as ETF options, index options, and stock options. Due to differences in liquidity, participant structure, and trading rules, option prices in different markets may not be consistent.",
          "For example, 300ETF options and CSI 300 index options both use the CSI 300 index as the underlying, but differ in trading rules, participants, and liquidity, which can create price differences. When the difference is large, you can profit by simultaneously buying from the lower-priced market and selling from the higher-priced market.",
        ],
      },
      {
        heading: "Common forms of cross-asset arbitrage",
        body: [
          "ETF option and index option arbitrage: arbitrage between ETF options and index options for the same underlying.",
          "Stock option and ETF option arbitrage: arbitrage when the same component stock has both ETF and stock options.",
          "Cross-market arbitrage: arbitrage between the same underlying across different exchanges or product types.",
        ],
      },
      {
        heading: "Risks and requirements",
        body: [
          "Cross-asset arbitrage requires a deep understanding of the rules, liquidity, and participants of different markets. Transaction costs may be relatively high and require precise capital management.",
          "The arbitrage space is usually limited and requires fast execution and good risk control. Beginners are advised to start with single-asset spread arbitrage.",
        ],
        note: "Cross-asset arbitrage requires cross-market knowledge."
      }
    ],
    quiz: {
      question: "What is the core of cross-asset arbitrage?",
      options: [
        "Predicting the direction of the underlying",
        "Capturing pricing differences of the same underlying across different markets",
        "Profiting from volatility changes"
      ],
      answer: 1,
      explanation: "Cross-asset arbitrage uses the inconsistency of option prices of the same underlying across different markets or product types, not directional prediction."
    }
  },
  "market-maker-arb": {
    id: "market-maker-arb",
    chapter: "06 · Advanced Arbitrage",
    title: "Market maker strategy: provide continuous bid-ask quotes and earn the spread",
    summary: "Market makers profit from the spread by providing liquidity, with controllable risk but requiring professional capability.",
    minutes: 16,
    level: "高阶",
    icon: "gavel",
    keyIdea: "The core of market making is providing liquidity and earning the spread while managing risk well.",
    sections: [
      {
        heading: "The role of a market maker",
        body: [
          "Market makers continuously provide bid and ask quotes in the market, buying and selling options at the same time. They profit from the bid-ask spread while taking on price risk.",
          "Market makers need to manage both the bid and ask prices simultaneously, ensuring the spread is reasonable and profitable. A spread that is too wide will lose customers, and too narrow will not be profitable enough.",
        ],
      },
      {
        heading: "Risk management of market makers",
        body: [
          "Market makers mainly manage Delta and Gamma risk, dynamically adjusting bid-ask quotes to hedge directional risk. They also need to monitor Vega to manage volatility risk.",
          "Market makers usually use algorithmic trading and automated systems, monitoring the market in real time, adjusting quotes, managing inventory, and risk metrics.",
        ],
      },
      {
        heading: "Implications for investors",
        body: [
          "Ordinary investors cannot fully replicate the market maker strategy, but can draw on its risk management philosophy: stay neutral, control risk, and profit from the spread.",
          "The market maker strategy is suitable for traders with professional systems, real-time data, and risk management capabilities, not for amateur investors.",
        ],
        note: "The market maker strategy requires professional knowledge and system support."
      }
    ],
    quiz: {
      question: "What is the main income source of a market maker?",
      options: [
        "Directional trading",
        "The bid-ask spread",
        "Volatility arbitrage"
      ],
      answer: 1,
      explanation: "Market makers profit from the bid-ask spread by continuously providing liquidity, not from directional judgment."
    }
  },
};
