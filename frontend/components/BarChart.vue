<template>
  <div class="space-y-3">
    <svg :viewBox="`0 0 ${vbW} ${vbH}`" class="w-full" preserveAspectRatio="none" :style="{ height: `${vbH}px` }">
      <line v-for="i in 4" :key="i" :x1="0" :x2="vbW" :y1="(vbH - 30) * i / 4" :y2="(vbH - 30) * i / 4" stroke="#f1f5f9" stroke-width="1" />
      <g v-for="(s, idx) in series" :key="idx">
        <rect
          :x="x(idx) + barGap / 2"
          :y="vbH - 30 - barH(s)"
          :width="barW - barGap"
          :height="barH(s)"
          rx="4"
          class="fill-brand-500 hover:fill-brand-600 transition-colors"
        >
          <title>{{ s[labelKey] }} · ${{ Number(s[valueKey]).toLocaleString('es-MX') }} · {{ s[countKey] }} reg.</title>
        </rect>
        <text
          :x="x(idx) + barW / 2"
          :y="vbH - 12"
          text-anchor="middle"
          class="fill-ink-500"
          style="font-size: 11px"
        >{{ formatLabel(s[labelKey]) }}</text>
      </g>
    </svg>
    <div class="flex items-center justify-between text-xs text-ink-500 px-1">
      <span>Total: <strong class="text-ink-800">${{ totalMonto.toLocaleString('es-MX') }}</strong></span>
      <span>{{ totalCount }} registros</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  series: { type: Array, required: true },
  labelKey: { type: String, default: 'mes' },
  valueKey: { type: String, default: 'monto' },
  countKey: { type: String, default: 'count' },
});

const vbW = 600;
const vbH = 220;

const barW = computed(() => vbW / Math.max(props.series.length, 1));
const barGap = 12;

const max = computed(() => Math.max(...props.series.map((s) => Number(s[props.valueKey]) || 0), 1));

function barH(s) {
  const v = Number(s[props.valueKey]) || 0;
  return Math.round((v / max.value) * (vbH - 50));
}

function x(idx) {
  return idx * barW.value;
}

const totalMonto = computed(() => props.series.reduce((s, r) => s + Number(r[props.valueKey] || 0), 0));
const totalCount = computed(() => props.series.reduce((s, r) => s + Number(r[props.countKey] || 0), 0));

const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function formatLabel(s) {
  if (typeof s !== 'string') return s;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MESES_ES[Number(m[2]) - 1]} ${m[1].slice(2)}`;
  return s;
}
</script>
