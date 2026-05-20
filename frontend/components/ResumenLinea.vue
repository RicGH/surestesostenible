<template>
  <div class="flex items-center justify-between gap-3">
    <span class="text-ink-500 text-xs">{{ label }}</span>
    <div class="flex items-center gap-2 flex-1 justify-end">
      <div v-if="total > 0" class="hidden sm:block w-16 h-1 rounded-full bg-ink-100 overflow-hidden">
        <div class="h-full bg-brand-500" :style="{ width: `${pct}%` }" />
      </div>
      <span class="font-medium text-ink-800 text-xs tabular-nums">${{ Number(monto || 0).toFixed(2) }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  monto: { type: [Number, String], default: 0 },
  total: { type: [Number, String], default: 0 },
});
const pct = computed(() => {
  const t = Number(props.total) || 0;
  if (!t) return 0;
  return Math.min(100, (Number(props.monto || 0) / t) * 100);
});
</script>
