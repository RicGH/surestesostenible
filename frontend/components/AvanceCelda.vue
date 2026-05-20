<template>
  <div class="min-w-[180px]">
    <div class="flex items-center justify-between text-xs mb-1">
      <span class="text-ink-500">${{ Number(gastado).toFixed(2) }} / ${{ Number(total).toFixed(2) }}</span>
      <span class="font-medium" :class="pct > 100 ? 'text-red-600' : 'text-ink-700'">{{ pct }}%</span>
    </div>
    <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden">
      <div
        class="h-full transition-all"
        :class="pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
        :style="{ width: `${Math.min(100, pct)}%` }"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  total: { type: [Number, String], default: 0 },
  gastado: { type: [Number, String], default: 0 },
});

const pct = computed(() => {
  const t = Number(props.total) || 0;
  if (!t) return 0;
  return Math.round((Number(props.gastado) / t) * 100);
});
</script>
