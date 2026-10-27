<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, watch } from "vue";
import { getAppLocale, translate } from "../i18n";

export interface PayoffPoint {
  price: number;
  value: number;
}

interface Props {
  expiry: PayoffPoint[];
  current?: PayoffPoint[];
  spot: number;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  current: () => [],
  height: 292,
});

const instance = getCurrentInstance();
const canvasId = `payoff-${instance?.uid ?? Date.now()}`;

function niceMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 10000) {
    const suffix = getAppLocale() === "en" ? "w" : "万";
    return `${(value / 10000).toFixed(1)}${suffix}`;
  }
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function draw() {
  const expiry = props.expiry;
  if (expiry.length < 2) return;
  const current = props.current.length > 1 ? props.current : expiry;
  const query = uni.createSelectorQuery().in(instance?.proxy as never);
  query
    .select(`#${canvasId}`)
    .boundingClientRect((rect) => {
      const box = rect as UniApp.NodeInfo | null;
      const width = box?.width || 680;
      const height = box?.height || props.height;
      const ctx = uni.createCanvasContext(canvasId, instance?.proxy as never);
      const compact = width < 520;
      const pad = {
        top: 18,
        right: compact ? 12 : 20,
        bottom: 34,
        left: compact ? 46 : 58,
      };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const values = [...expiry, ...current].map((point) => point.value);
      const minValue = Math.min(...values, 0);
      const maxValue = Math.max(...values, 0);
      const valuePad = Math.max((maxValue - minValue) * 0.12, 1);
      const lowValue = minValue - valuePad;
      const highValue = maxValue + valuePad;
      const minPrice = expiry[0]?.price ?? 0;
      const maxPrice = expiry[expiry.length - 1]?.price ?? 1;
      const x = (price: number) =>
        pad.left + ((price - minPrice) / (maxPrice - minPrice || 1)) * plotWidth;
      const y = (value: number) =>
        pad.top +
        ((highValue - value) / (highValue - lowValue || 1)) * plotHeight;

      ctx.clearRect(0, 0, width, height);
      ctx.setFillStyle("#ffffff");
      ctx.fillRect(0, 0, width, height);

      ctx.setStrokeStyle("#e8eeeb");
      ctx.setLineWidth(1);
      for (let index = 0; index < 4; index += 1) {
        const value = lowValue + ((highValue - lowValue) * index) / 3;
        const lineY = y(value);
        ctx.beginPath();
        ctx.moveTo(pad.left, lineY);
        ctx.lineTo(width - pad.right, lineY);
        ctx.stroke();
      }

      const zeroY = y(0);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(width - pad.right, zeroY);
      ctx.setStrokeStyle("#aab6b2");
      ctx.setLineWidth(1);
      ctx.stroke();

      const spotX = x(props.spot);
      if (spotX >= pad.left && spotX <= width - pad.right) {
        ctx.beginPath();
        ctx.moveTo(spotX, pad.top);
        ctx.lineTo(spotX, height - pad.bottom);
        ctx.setStrokeStyle("#8f9c98");
        ctx.setLineDash([4, 5], 0);
        ctx.stroke();
        ctx.setLineDash([], 0);

        ctx.setFillStyle("#6d7a76");
        ctx.setFontSize(11);
        ctx.setTextAlign("center");
        ctx.fillText(translate("strategy.spot"), spotX, pad.top - 4);
      }

      if (current !== expiry) {
        ctx.beginPath();
        current.forEach((point, index) => {
          if (index === 0) ctx.moveTo(x(point.price), y(point.value));
          else ctx.lineTo(x(point.price), y(point.value));
        });
        ctx.setStrokeStyle("#7896b0");
        ctx.setLineWidth(1.5);
        ctx.setLineDash([5, 4], 0);
        ctx.stroke();
        ctx.setLineDash([], 0);
      }

      ctx.beginPath();
      expiry.forEach((point, index) => {
        if (index === 0) ctx.moveTo(x(point.price), y(point.value));
        else ctx.lineTo(x(point.price), y(point.value));
      });
      ctx.setStrokeStyle("#0e6f5c");
      ctx.setLineWidth(2.4);
      ctx.setLineJoin("round");
      ctx.stroke();

      ctx.setFontSize(compact ? 10 : 11);
      ctx.setFillStyle("#7b8783");
      ctx.setTextAlign("right");
      for (let index = 0; index < 4; index += 1) {
        const value = lowValue + ((highValue - lowValue) * index) / 3;
        ctx.fillText(niceMoney(value), pad.left - 8, y(value) + 3);
      }

      ctx.setTextAlign("center");
      const ticks = compact ? 4 : 6;
      for (let index = 0; index < ticks; index += 1) {
        const price = minPrice + ((maxPrice - minPrice) * index) / (ticks - 1);
        ctx.fillText(price.toFixed(2), x(price), height - 12);
      }

      ctx.setFontSize(10);
      ctx.setFillStyle("#8e9a96");
      ctx.setTextAlign("left");
      ctx.fillText(translate("strategy.expiryPnl"), pad.left, height - 1);
      if (current !== expiry) {
        ctx.setFillStyle("#7896b0");
        ctx.fillText(translate("strategy.currentValue"), pad.left + 62, height - 1);
      }
      ctx.draw();
    })
    .exec();
}

function scheduleDraw() {
  void nextTick(() => {
    setTimeout(draw, 40);
  });
}

onMounted(scheduleDraw);
watch(
  () => [props.expiry, props.current, props.spot],
  scheduleDraw,
  { deep: true },
);
</script>

<template>
  <view class="payoff-chart" :style="{ height: `${height}px` }">
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      class="payoff-chart__canvas"
      :style="{ height: `${height}px` }"
    />
  </view>
</template>

<style scoped>
.payoff-chart {
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
}

.payoff-chart__canvas {
  display: block;
  width: 100%;
}
</style>
