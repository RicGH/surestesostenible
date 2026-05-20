<template>
  <div class="flex flex-col items-center gap-4">
    <svg :viewBox="`0 0 ${size} ${size}`" class="w-44 h-44">
      <circle :cx="cx" :cy="cy" :r="radius" fill="none" stroke="#f1f5f9" :stroke-width="stroke" />
      <circle
        v-for="seg in segments"
        :key="seg.key"
        :cx="cx" :cy="cy" :r="radius"
        fill="none"
        :stroke="seg.color"
        :stroke-width="stroke"
        :stroke-dasharray="`${seg.length} ${circumference}`"
        :stroke-dashoffset="seg.offset"
        stroke-linecap="butt"
        :transform="`rotate(-90 ${cx} ${cy})`"
        class="transition-all"
      >
        <title>{{ seg.label }}: {{ seg.value }} ({{ seg.pct }}%)</title>
      </circle>
      <text :x="cx" :y="cy - 4" text-anchor="middle" class="fill-ink-900" style="font-size: 22px; font-weight: 600">{{ total }}</text>
      <text :x="cx" :y="cy + 14" text-anchor="middle" class="fill-ink-500" style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px">Total</text>
    </svg>
    <ul class="w-full space-y-1.5 text-sm">
      <li v-for="seg in segments" :key="seg.key" class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ background: seg.color }" />
          <span class="truncate text-ink-700">{{ seg.label }}</span>
        </span>
        <span class="text-ink-500 text-xs shrink-0">
          <strong class="text-ink-900">{{ seg.value }}</strong> · {{ seg.pct }}%
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  series: { type: Array, required: true },
  labelKey: { type: String, default: 'estado' },
  valueKey: { type: String, default: 'count' },
  colors: { type: Object, default: () => ({}) },
});

const size = 160;
const stroke = 22;
const cx = size / 2;
const cy = size / 2;
const radius = (size - stroke) / 2;
const circumference = 2 * Math.PI * radius;

const FALLBACK = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#64748b'];

const total = computed(() => props.series.reduce((s, r) => s + Number(r[props.valueKey] || 0), 0));

const segments = computed(() => {
  let acc = 0;
  return props.series.map((r, i) => {
    const value = Number(r[props.valueKey] || 0);
    const pct = total.value ? Math.round((value / total.value) * 100) : 0;
    const length = total.value ? (value / total.value) * circumference : 0;
    const offset = -acc;
    acc += length;
    const label = String(r[props.labelKey] || '').replace(/_/g, ' ');
    return {
      key: r[props.labelKey],
      label,
      value,
      pct,
      length,
      offset,
      color: props.colors[r[props.labelKey]] || FALLBACK[i % FALLBACK.length],
    };
  });
});
</script>
