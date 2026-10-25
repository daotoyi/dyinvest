export interface LessonSection {
  heading: string;
  body: string[];
  formula?: string;
  note?: string;
}

export interface LessonQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  level: "基础" | "进阶";
  icon: string;
  keyIdea: string;
  sections: LessonSection[];
  quiz: LessonQuiz;
}

export const lessons: Lesson[] = [
  {
    id: "option-basics",
    chapter: "01 · 合约入门",
    title: "期权不是“低价股票”",
    summary: "先分清权利、义务和到期时间，再谈价格。",
    minutes: 6,
    level: "基础",
    icon: "book",
    keyIdea: "买方买到的是未来选择权，卖方卖出的是履约义务。",
    sections: [
      {
        heading: "一张合约，两个方向",
        body: [
          "认购期权赋予买方在约定时间、以约定价格买入标的的权利；认沽期权赋予的是卖出标的的权利。买方支付权利金，卖方收取权利金并承担履约义务。",
          "期权不是加了杠杆的股票。它同时受到标的价格、剩余时间、波动率和行权价影响，到期后价值可能归零。",
        ],
      },
      {
        heading: "把合约要素拆开",
        body: [
          "一张标准期权合约至少要看清：标的、认购或认沽、行权价、到期日、合约乘数、权利金和交易单位。",
          "境内 ETF 期权通常以 ETF 为标的，合约乘数、行权方式和交收规则应以当期交易所及券商规则为准。",
        ],
        note: "不要只看权利金便宜。虚值合约价格低，但到期归零的概率也更高。",
      },
    ],
    quiz: {
      question: "买入认购期权，买方获得的核心权利是什么？",
      options: ["按约定价格卖出标的", "按约定价格买入标的", "要求卖方追加保证金"],
      answer: 1,
      explanation: "认购期权的买方拥有按行权价买入标的的权利，而不是义务。",
    },
  },
  {
    id: "contract-anatomy",
    chapter: "01 · 合约入门",
    title: "读懂一张期权合约",
    summary: "标的、方向、行权价、到期日和乘数缺一不可。",
    minutes: 8,
    level: "基础",
    icon: "layers",
    keyIdea: "期权名称里的每一个数字，都对应一个风险来源。",
    sections: [
      {
        heading: "名称就是一张地图",
        body: [
          "以“300ETF购11月4100”为例，300ETF 是标的，购代表认购，11月是到期月份，4100 是行权价。",
          "行权价不是预测价格，而是未来买卖标的时使用的固定价格。标的现价与行权价之间的距离，决定了合约当前是实值、平值还是虚值。",
        ],
      },
      {
        heading: "到期日决定时间价值",
        body: [
          "距离到期越远，标的越有时间走出有利方向，期权通常也越贵。随着到期日接近，时间价值衰减会加快。",
          "ETF 期权的具体行权日和交收安排需要查询交易所规则。模拟交易也必须用同一套合约规则，否则收益结果会失真。",
        ],
      },
    ],
    quiz: {
      question: "“300ETF购11月4100”中的 4100 表示什么？",
      options: ["合约乘数", "理论价格", "行权价"],
      answer: 2,
      explanation: "4100 是行权价，通常按标的价格单位折算后展示为 4.100。",
    },
  },
  {
    id: "premium-value",
    chapter: "02 · 价格构成",
    title: "权利金里的时间价值",
    summary: "看懂内在价值、时间价值和隐含波动率的关系。",
    minutes: 10,
    level: "基础",
    icon: "calculator",
    keyIdea: "期权价格 = 内在价值 + 市场愿意支付的时间价值。",
    sections: [
      {
        heading: "内在价值先落地",
        body: [
          "认购期权的内在价值是 max(标的价格 - 行权价, 0)，认沽期权是 max(行权价 - 标的价格, 0)。",
          "内在价值为零的合约仍然可能有价格，因为到期前标的仍可能发生有利变化。这部分就是时间价值。",
        ],
        formula: "认购内在价值 = max(S − K, 0)　|　认沽内在价值 = max(K − S, 0)",
      },
      {
        heading: "波动率不是收益预测",
        body: [
          "隐含波动率反映市场用当前期权价格倒推出的未来波动预期。它上升通常有利于期权多头，下降通常不利于期权多头。",
          "高波动率意味着期权更贵，也意味着价格变化更快。判断“会涨”与判断“会涨多少、何时涨、波动率是否已经太贵”是两件事。",
        ],
        note: "方向正确也可能亏钱：买入期权后时间流逝、隐含波动率下降，都会抵消方向收益。",
      },
    ],
    quiz: {
      question: "买入期权后，哪一项通常会对持仓不利？",
      options: ["隐含波动率上升", "时间流逝", "标的价格向有利方向变化"],
      answer: 1,
      explanation: "对期权买方而言，Theta 通常代表每天损失的时间价值。",
    },
  },
  {
    id: "delta-gamma",
    chapter: "03 · 风险指标",
    title: "Delta 与 Gamma：方向与加速度",
    summary: "用 Greeks 理解组合对标的变动有多敏感。",
    minutes: 8,
    level: "进阶",
    icon: "trendUp",
    keyIdea: "Delta 看方向敞口，Gamma 看敞口变化的速度。",
    sections: [
      {
        heading: "Delta 是方向敞口",
        body: [
          "Delta 近似表示标的每变动 1 个价格单位，期权价格的方向性变化。认购 Delta 通常为正，认沽 Delta 通常为负。",
          "组合 Delta 要把每条腿按买卖方向、数量和合约乘数汇总。净 Delta 为正，组合整体偏向标的上涨；为负则偏向下跌。",
        ],
      },
      {
        heading: "Gamma 让 Delta 变化",
        body: [
          "Gamma 衡量 Delta 对标的价格变化的速度。平值附近、临近到期的期权通常 Gamma 更高。",
          "高 Gamma 不一定代表高风险，但意味着组合的方向敞口会迅速变化。卖方在标的快速穿越行权价时尤其需要关注。",
        ],
        formula: "组合 Delta = Σ(单腿 Delta × 方向 × 数量 × 合约乘数)",
      },
    ],
    quiz: {
      question: "组合净 Delta 为正，通常说明组合更偏向哪种风险？",
      options: ["标的上涨时受益", "标的下跌时受益", "完全不受标的波动影响"],
      answer: 0,
      explanation: "正 Delta 近似意味着标的上涨时组合价值增加，下跌时减少。",
    },
  },
  {
    id: "theta-vega",
    chapter: "03 · 风险指标",
    title: "Theta 与 Vega：时间和波动率",
    summary: "方向之外，还有两股力量会改变期权价值。",
    minutes: 9,
    level: "进阶",
    icon: "clock",
    keyIdea: "Theta 和 Vega 决定“等多久”和“市场有多不安”。",
    sections: [
      {
        heading: "Theta 是时间的价格",
        body: [
          "Theta 通常表示时间每过去一天，期权理论价值变化多少。期权买方通常承受负 Theta，卖方通常获得正 Theta。",
          "临近到期时，时间价值衰减往往加快。单纯买入虚值期权等待行情，需要方向变化跑赢时间损耗。",
        ],
      },
      {
        heading: "Vega 是波动率的敏感度",
        body: [
          "Vega 衡量隐含波动率每变化 1 个百分点，期权价值变化多少。买入期权通常拥有正 Vega，卖出期权通常拥有负 Vega。",
          "波动率高位不等于应该卖出。事件冲击可能让隐含波动率继续上升，卖方可能承受快速扩大的浮亏和保证金压力。",
        ],
        note: "风险指标是局部敏感度，不是完整损益预测。跨行权价、跨到期日的组合要结合情景矩阵观察。",
      },
    ],
    quiz: {
      question: "期权买方通常拥有怎样的 Theta 与 Vega 敞口？",
      options: ["负 Theta、正 Vega", "正 Theta、负 Vega", "两者都为正"],
      answer: 0,
      explanation: "买方支付时间价值并受益于波动率上升，通常呈现负 Theta、正 Vega。",
    },
  },
  {
    id: "four-structures",
    chapter: "04 · 策略结构",
    title: "四种基础盈亏结构",
    summary: "从单腿到价差，先画出最坏情况。",
    minutes: 12,
    level: "进阶",
    icon: "chart",
    keyIdea: "策略不是名字，而是一组明确的到期损益和风险边界。",
    sections: [
      {
        heading: "单腿策略最直接",
        body: [
          "买入认购表达看涨，买入认沽表达看跌。两者最大损失都以已支付权利金为限，但方向、波动率和时间判断必须同时成立。",
          "卖出认购或认沽会收取权利金，但需要保证金，并承担更大的尾部风险。卖方不应只看胜率，还要看单次极端行情的影响。",
        ],
      },
      {
        heading: "价差策略缩小风险边界",
        body: [
          "牛市看涨价差买入较低行权价认购、卖出较高行权价认购，用放弃部分上方收益换取更低的权利金成本。",
          "价差的盈亏边界更清晰，但仍然有方向、时间和波动率风险。行权价间距、净权利金和流动性都会影响实际结果。",
        ],
        note: "先确认最大亏损，再考虑最大盈利。只展示盈利曲线会掩盖策略的真实风险。",
      },
    ],
    quiz: {
      question: "牛市看涨价差通常通过哪组操作构建？",
      options: ["买入低行权价认购，卖出高行权价认购", "同时买入认购和认沽", "卖出低行权价认沽，买入高行权价认沽"],
      answer: 0,
      explanation: "买低行权价认购、卖高行权价认购，形成有限风险和有限收益的看涨价差。",
    },
  },
  {
    id: "spreads",
    chapter: "04 · 策略结构",
    title: "价差策略的交易细节",
    summary: "净权利金、行权价间距和流动性同样重要。",
    minutes: 14,
    level: "进阶",
    icon: "layers",
    keyIdea: "价差的收益上限来自结构，而不是来自更复杂的名称。",
    sections: [
      {
        heading: "先算净成本和收益上限",
        body: [
          "价差的净权利金等于买入腿支出减去卖出腿收入。对牛市看涨价差而言，最大收益通常等于行权价间距乘以合约乘数，再减去净权利金。",
          "净成本越低，盈亏平衡点越有利；但卖出腿越接近买入腿，收益空间也越小。两者不能同时兼得。",
        ],
        formula: "最大收益 ≈ (K₂ − K₁) × 乘数 − 净权利金",
      },
      {
        heading: "执行风险在盘口",
        body: [
          "多腿策略可能遇到单腿成交、买卖价差扩大和流动性不足。券商不支持组合订单时，部分成交可能暂时留下裸露头寸。",
          "模拟盘应把手续费、滑点和单腿成交都纳入成交模型，否则演示收益会明显偏乐观。",
        ],
        note: "本初版模拟盘按组合一次性记账，仅用于理解结构，不代表真实撮合结果。",
      },
    ],
    quiz: {
      question: "牛市看涨价差卖出高行权价认购，会带来什么影响？",
      options: ["降低净成本，同时限制上方收益", "消除所有风险", "增加时间价值收益且不限制收益"],
      answer: 0,
      explanation: "卖出更高行权价认购可以收到权利金、降低成本，但同时也封顶上方收益。",
    },
  },
  {
    id: "margin-risk",
    chapter: "05 · 风险控制",
    title: "保证金与卖方风险",
    summary: "卖方收权利金，但风险不会凭空消失。",
    minutes: 12,
    level: "进阶",
    icon: "shield",
    keyIdea: "保证金是履约保障，不是最大亏损的保证。",
    sections: [
      {
        heading: "保证金为什么存在",
        body: [
          "期权卖方承担履约义务，交易所和券商会要求缴纳保证金。保证金要求会随标的价格、波动率、剩余期限和持仓结构变化。",
          "保证金可用余额不足时，券商可能要求追加保证金或执行强制平仓。价格快速变化时，风险往往和流动性压力同时出现。",
        ],
      },
      {
        heading: "尾部风险要单独看",
        body: [
          "裸卖认购的理论最大亏损没有上限，裸卖认沽在标的价格接近零时风险最大。价差和组合策略可以限定部分风险，但并非没有风险。",
          "资本占用、集中度、流动性和最坏情景，应比历史胜率更优先。",
        ],
        note: "本产品中的保证金为演示估算值，实盘以合作券商和交易所的实时要求为准。",
      },
    ],
    quiz: {
      question: "关于保证金，下面哪项说法更准确？",
      options: ["保证金等于最大亏损", "保证金是履约保障，实际亏损可能更大", "卖方不需要考虑保证金"],
      answer: 1,
      explanation: "保证金是履约和风险覆盖安排，不等于极端行情下的最终亏损上限。",
    },
  },
];

export function getLesson(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}
