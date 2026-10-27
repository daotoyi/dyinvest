import { computed, reactive, watch } from "vue";
import { CONTRACT_MULTIPLIER, findQuote, findQuoteById, underlying } from "../data/options";
import type {
  OptionSide,
  OptionType,
  PaperAccountState,
  PaperOrder,
  PaperOrderLeg,
  PaperPosition,
  StrategyLeg,
} from "../domain/types";
import { round } from "../domain/optionMath";
import { optionDisplayName } from "../data/options";
import { translate } from "../i18n";
import {
  pushUserDataset,
  registerDatasetHandler,
} from "../services/userDataSync";

const STORAGE_KEY = "options-lab-paper-v2";
const INITIAL_EQUITY = 200000;
const FEE_PER_LEG = 2.5;
const MARGIN_RATE = 0.15;

function nowLabel() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createSeedState(): PaperAccountState {
  const seedQuote = findQuote("call", 4.1);
  const entryPremium = seedQuote ? round(seedQuote.premium * 0.91, 4) : 0.05;
  const cost = entryPremium * CONTRACT_MULTIPLIER + FEE_PER_LEG;
  const initialOrder: PaperOrder = {
    id: "SIM-20261023-001",
    createdAt: "10/23 10:12",
    title: translate("paper.buyContract", {
      contract: optionDisplayName("call", 4.1),
    }),
    subtitle: translate("paper.samplePosition"),
    status: translate("paper.filled"),
    cashFlow: -cost,
    quantity: 1,
  };
  const seededEquity = 199982;
  return {
    cash: INITIAL_EQUITY - cost,
    realizedPnl: 0,
    positions: seedQuote
      ? [
          {
            key: seedQuote.id,
            quoteId: seedQuote.id,
            type: "call",
            strike: 4.1,
            expiry: seedQuote.expiry,
            netQty: 1,
            avgPremium: entryPremium,
          },
        ]
      : [],
    orders: [initialOrder],
    equityHistory: [200000, 200038, 200012, 199956, 200024, 199994, seededEquity],
  };
}

function loadState(): PaperAccountState {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY) as Partial<PaperAccountState> | null;
    if (
      saved &&
      typeof saved.cash === "number" &&
      Array.isArray(saved.positions) &&
      Array.isArray(saved.orders) &&
      Array.isArray(saved.equityHistory)
    ) {
      return {
        cash: saved.cash,
        realizedPnl: Number(saved.realizedPnl ?? 0),
        positions: saved.positions as PaperPosition[],
        orders: saved.orders as PaperOrder[],
        equityHistory: saved.equityHistory,
      };
    }
  } catch {
    // Fall back to the documented sample account.
  }
  return createSeedState();
}

const state = reactive<PaperAccountState>(loadState());
let applyingCloudState = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function isValidPaperState(value: unknown): value is PaperAccountState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PaperAccountState>;
  return (
    typeof candidate.cash === "number" &&
    typeof candidate.realizedPnl === "number" &&
    Array.isArray(candidate.positions) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.equityHistory)
  );
}

function persist() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(state)));
  } catch {
    // The cloud copy remains authoritative when local storage is unavailable.
  }
}

function scheduleCloudPush(delay = 800) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushUserDataset("paper", JSON.parse(JSON.stringify(state))).catch(
      () => undefined,
    );
  }, delay);
}

watch(
  state,
  (value) => {
    persist();
    if (!applyingCloudState) scheduleCloudPush();
  },
  { deep: true },
);

registerDatasetHandler("paper", (payload) => {
  applyingCloudState = true;
  if (isValidPaperState(payload)) {
    Object.assign(state, {
      cash: payload.cash,
      realizedPnl: Number(payload.realizedPnl ?? 0),
      positions: payload.positions,
      orders: payload.orders,
      equityHistory: payload.equityHistory,
    });
    persist();
  }
  setTimeout(() => {
    applyingCloudState = false;
    if (payload === null) scheduleCloudPush(0);
  }, 0);
});

function currentPremium(position: PaperPosition) {
  return findQuoteById(position.quoteId)?.premium ?? position.avgPremium;
}

const optionValue = computed(() =>
  state.positions.reduce(
    (total, position) =>
      total + position.netQty * currentPremium(position) * CONTRACT_MULTIPLIER,
    0,
  ),
);

const totalEquity = computed(() => state.cash + optionValue.value);
const unrealizedPnl = computed(() =>
  state.positions.reduce(
    (total, position) =>
      total +
      position.netQty *
        (currentPremium(position) - position.avgPremium) *
        CONTRACT_MULTIPLIER,
    0,
  ),
);
const shortContracts = computed(() =>
  state.positions.reduce(
    (total, position) => total + Math.max(-position.netQty, 0),
    0,
  ),
);
const marginUsed = computed(
  () =>
    shortContracts.value *
    underlying.spot *
    CONTRACT_MULTIPLIER *
    MARGIN_RATE,
);
const availableCash = computed(() => Math.max(totalEquity.value - marginUsed.value, 0));
const totalReturn = computed(
  () => (totalEquity.value - INITIAL_EQUITY) / INITIAL_EQUITY,
);
const activePositions = computed(() =>
  state.positions.filter((position) => position.netQty !== 0),
);

function getPosition(quoteId: string) {
  return state.positions.find((position) => position.quoteId === quoteId);
}

function signedQuantity(side: OptionSide, quantity: number) {
  return side === "buy" ? quantity : -quantity;
}

function updatePosition(
  type: OptionType,
  strike: number,
  quoteId: string,
  side: OptionSide,
  quantity: number,
  premium: number,
  allowCross = false,
) {
  const orderSignedQty = signedQuantity(side, quantity);
  let position = getPosition(quoteId);
  if (!position) {
    const quote = findQuoteById(quoteId);
    if (!quote) throw new Error(translate("paper.contractNotFound"));
    state.positions.push({
      key: quoteId,
      quoteId,
      type,
      strike,
      expiry: quote.expiry,
      netQty: orderSignedQty,
      avgPremium: premium,
    });
    return;
  }

  const currentSigned = position.netQty;
  const sameDirection = currentSigned === 0 || Math.sign(currentSigned) === Math.sign(orderSignedQty);
  if (sameDirection) {
    const totalQty = Math.abs(currentSigned) + quantity;
    position.avgPremium = round(
      (Math.abs(currentSigned) * position.avgPremium + quantity * premium) / totalQty,
      6,
    );
    position.netQty += orderSignedQty;
    return;
  }

  if (quantity > Math.abs(currentSigned) && !allowCross) {
    throw new Error(translate("paper.noReverse"));
  }
  const closedQty = Math.min(quantity, Math.abs(currentSigned));
  state.realizedPnl +=
    (premium - position.avgPremium) * currentSigned * CONTRACT_MULTIPLIER * closedQty;
  position.netQty += orderSignedQty;
  if (position.netQty === 0) position.avgPremium = 0;
}

function recordOrder(order: Omit<PaperOrder, "id" | "createdAt" | "status">) {
  state.orders.unshift({
    ...order,
    id: `SIM-${Date.now()}-${state.orders.length + 1}`,
    createdAt: nowLabel(),
    status: translate("paper.filled"),
  });
  state.orders = state.orders.slice(0, 30);
}

function appendEquitySnapshot() {
  state.equityHistory.push(totalEquity.value);
  if (state.equityHistory.length > 40) state.equityHistory.shift();
}

function placeOrder(input: {
  type: OptionType;
  strike: number;
  side: OptionSide;
  quantity: number;
  price: number;
}) {
  const quote = findQuote(input.type, input.strike);
  if (!quote) throw new Error(translate("paper.contractNotFound"));
  const quantity = Math.max(Math.floor(input.quantity), 1);
  const premium = Math.max(input.price, 0.0001);
  const gross = premium * CONTRACT_MULTIPLIER * quantity;
  const fee = FEE_PER_LEG;
  const signed = signedQuantity(input.side, quantity);
  const existing = getPosition(quote.id);
  const openingShort =
    input.side === "sell" &&
    (!existing || existing.netQty >= 0);
  const closing = existing && Math.sign(existing.netQty) !== signed;

  if (openingShort) {
    const additionalMargin =
      underlying.spot * CONTRACT_MULTIPLIER * MARGIN_RATE * quantity;
    if (availableCash.value < additionalMargin + fee) {
      throw new Error(translate("paper.insufficientMargin"));
    }
  }
  if (input.side === "buy" && !closing && state.cash < gross + fee) {
    throw new Error(translate("paper.insufficientCash"));
  }

  const cashFlow = -signed * gross - fee;
  state.cash += cashFlow;
  updatePosition(
    input.type,
    input.strike,
    quote.id,
    input.side,
    quantity,
    premium,
  );
  recordOrder({
    title: translate(
      input.side === "buy" ? "paper.buyContract" : "paper.sellContract",
      { contract: optionDisplayName(input.type, input.strike) },
    ),
    subtitle: translate("paper.limitOrder", {
      qty: quantity,
      price: premium.toFixed(4),
    }),
    cashFlow,
    quantity,
  });
  appendEquitySnapshot();
}

function placeStrategy(legs: StrategyLeg[], strategyName: string) {
  if (!legs.length) throw new Error(translate("paper.noLegs"));
  let netCash = 0;
  let openingMargin = 0;
  const orderLegs: PaperOrderLeg[] = legs.map((leg) => {
    const signed = signedQuantity(leg.side, leg.quantity);
    netCash -= signed * leg.premium * CONTRACT_MULTIPLIER;
    if (leg.side === "sell") {
      openingMargin +=
        underlying.spot *
        CONTRACT_MULTIPLIER *
        MARGIN_RATE *
        leg.quantity;
    }
    return {
      type: leg.type,
      side: leg.side,
      quantity: leg.quantity,
      strike: leg.strike,
      premium: leg.premium,
    };
  });
  netCash -= legs.length * FEE_PER_LEG;
  const requiredCash = Math.max(-netCash, 0) + openingMargin;
  if (availableCash.value < requiredCash) {
    throw new Error(translate("paper.insufficientCombo"));
  }

  for (const leg of legs) {
    updatePosition(
      leg.type,
      leg.strike,
      leg.quoteId,
      leg.side,
      leg.quantity,
      leg.premium,
    );
  }
  state.cash += netCash;
  recordOrder({
    title: translate("paper.strategyCombo", { name: strategyName }),
    subtitle: translate("paper.strategySubtitle", { legs: legs.length }),
    cashFlow: netCash,
    quantity: legs.reduce((total, leg) => total + leg.quantity, 0),
    legs: orderLegs,
  });
  appendEquitySnapshot();
}

function reset() {
  Object.assign(state, createSeedState());
}

function estimateMargin(quantity = 1) {
  return underlying.spot * CONTRACT_MULTIPLIER * MARGIN_RATE * quantity;
}

export function usePaperAccount() {
  return {
    state,
    initialEquity: INITIAL_EQUITY,
    totalEquity,
    availableCash,
    marginUsed,
    unrealizedPnl,
    totalReturn,
    activePositions,
    currentPremium,
    placeOrder,
    placeStrategy,
    reset,
    estimateMargin,
  };
}
