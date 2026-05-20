<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon :name="icon" /></div>
      <div>
        <h3 class="font-semibold text-ink-900 text-sm">{{ title }}</h3>
        <p class="text-xs text-ink-500">{{ subtitle }}</p>
      </div>
    </div>
    <ul v-if="items.length" class="divide-y divide-ink-100">
      <li v-for="(item, idx) in items" :key="idx" class="px-5 py-3 flex items-center gap-3">
        <span class="w-6 h-6 rounded-full bg-ink-100 text-ink-600 text-xs font-semibold grid place-items-center shrink-0">{{ idx + 1 }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink-800 truncate">{{ item[nameKey] || '—' }}</p>
          <div class="h-1.5 bg-ink-100 rounded-full mt-1.5 overflow-hidden">
            <div class="h-full bg-brand-500 rounded-full" :style="{ width: `${pct(item)}%` }" />
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-semibold text-ink-900">${{ Number(item.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
          <p class="text-xs text-ink-500">{{ item.count }} reg.</p>
        </div>
      </li>
    </ul>
    <div v-else class="px-5 py-12 text-center text-ink-400 text-sm">Sin datos</div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: 'chart' },
  items: { type: Array, required: true },
  nameKey: { type: String, default: 'nombre' },
});

const max = computed(() => Math.max(...props.items.map((i) => Number(i.monto || 0)), 1));
function pct(item) {
  return Math.round((Number(item.monto || 0) / max.value) * 100);
}
</script>
