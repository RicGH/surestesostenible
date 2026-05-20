<template>
  <div>
    <label class="flex items-center gap-2 text-sm font-medium text-ink-700 mb-1.5">
      <Icon :name="icon" size="w-4 h-4" class="text-ink-500" />
      {{ label }}
    </label>
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
      <input
        :value="modelValue"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        class="input pl-7"
        @input="$emit('update:modelValue', Number($event.target.value) || 0)"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], default: 0 },
  icon: { type: String, required: true },
  label: { type: String, required: true },
});
defineEmits(['update:modelValue']);
</script>
