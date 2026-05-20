<template>
  <div class="card p-5 relative overflow-hidden">
    <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" :class="bgGlow" />
    <div class="flex items-start justify-between gap-3 relative">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">{{ label }}</p>
        <p class="text-2xl font-semibold text-ink-900 mt-2 truncate">{{ value }}</p>
        <p v-if="sub" class="text-xs text-ink-500 mt-1">{{ sub }}</p>
      </div>
      <div class="w-10 h-10 rounded-lg grid place-items-center shrink-0" :class="bgIcon">
        <Icon :name="icon" size="w-5 h-5" />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, default: 'chart' },
  color: { type: String, default: 'brand' },
  sub: { type: String, default: '' },
});

const PALETTE = {
  brand: { icon: 'bg-brand-50 text-brand-600', glow: 'bg-brand-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', glow: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', glow: 'bg-emerald-500' },
  violet: { icon: 'bg-violet-50 text-violet-600', glow: 'bg-violet-500' },
  red: { icon: 'bg-red-50 text-red-600', glow: 'bg-red-500' },
};

const bgIcon = computed(() => PALETTE[props.color]?.icon || PALETTE.brand.icon);
const bgGlow = computed(() => PALETTE[props.color]?.glow || PALETTE.brand.glow);
</script>
