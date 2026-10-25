<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, watch } from "vue";

interface Props {
  values: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  showReference?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: "#0e6f5c",
  fillColor: "rgba(14, 111, 92, 0.08)",
  height: 120,
  showReference: true,
});

const instance = getCurrentInstance();
const canvasId = `mini-line-${instance?.uid ?? Date.now()}`;

function draw() {
  const values = props.values.length > 1 ? props.values : [0, 0];
  const query = uni.createSelectorQuery().in(instance?.proxy as never);
  query
    .select(`#${canvasId}`)
    .boundingClientRect((rect) => {
      const box = rect as UniApp.NodeInfo | null;
      const width = box?.width || 320;
      const height = box?.height || props.height;
      const ctx = uni.createCanvasContext(canvasId, instance?.proxy as never);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const pad = 6;
      const span = max - min || 1;
      const mapX = (index: number) =>
        pad + (index / (values.length - 1)) * (width - pad * 2);
      const mapY = (value: number) =>
        height - pad - ((value - min) / span) * (height - pad * 2);

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      values.forEach((value, index) => {
        if (index === 0) ctx.moveTo(mapX(index), mapY(value));
        else ctx.lineTo(mapX(index), mapY(value));
      });
      ctx.lineTo(mapX(values.length - 1), height);
      ctx.lineTo(mapX(0), height);
      ctx.closePath();
      ctx.setFillStyle(props.fillColor);
      ctx.fill();

      ctx.beginPath();
      values.forEach((value, index) => {
        if (index === 0) ctx.moveTo(mapX(index), mapY(value));
        else ctx.lineTo(mapX(index), mapY(value));
      });
      ctx.setStrokeStyle(props.color);
      ctx.setLineWidth(2);
      ctx.setLineJoin("round");
      ctx.setLineCap("round");
      ctx.stroke();

      if (props.showReference) {
        const first = values[0] ?? 0;
        if (first >= min && first <= max) {
          const y = mapY(first);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.setStrokeStyle("rgba(109, 122, 118, 0.2)");
          ctx.setLineWidth(1);
          ctx.setLineDash([3, 4], 0);
          ctx.stroke();
          ctx.setLineDash([], 0);
        }
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
  () => [props.values, props.color, props.fillColor],
  scheduleDraw,
  { deep: true },
);
</script>

<template>
  <view class="mini-line" :style="{ height: `${height}px` }">
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      class="mini-line__canvas"
      :style="{ height: `${height}px` }"
    />
  </view>
</template>

<style scoped>
.mini-line {
  width: 100%;
  overflow: hidden;
}

.mini-line__canvas {
  display: block;
  width: 100%;
}
</style>
