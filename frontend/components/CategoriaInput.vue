<template>
  <div>
    <label class="flex items-center gap-2 text-sm font-medium text-ink-700 mb-1.5">
      <Icon :name="icon" size="w-4 h-4" class="text-ink-500" />
      {{ label }}
      <button
        v-if="hint"
        ref="helpEl"
        type="button"
        tabindex="-1"
        class="text-ink-400 hover:text-brand-600 transition-colors"
        :aria-label="hint"
        @mouseenter="mostrar"
        @mouseleave="ocultar"
        @focus="mostrar"
        @blur="ocultar"
      >
        <Icon name="help" size="w-3.5 h-3.5" />
      </button>
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

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        leave-active-class="transition-opacity duration-100"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <span
          v-if="hint && visible"
          :style="estilo"
          class="fixed z-[100] pointer-events-none max-w-[240px]
                 px-2.5 py-1.5 rounded-md bg-ink-900 text-white text-[11px] font-medium leading-snug shadow-card"
        >
          {{ hint }}
        </span>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  icon: { type: String, required: true },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
});
defineEmits(['update:modelValue']);

const helpEl = ref(null);
const visible = ref(false);
const estilo = ref({ top: '0px', left: '0px' });

function calcular() {
  if (!helpEl.value) return;
  const r = helpEl.value.getBoundingClientRect();
  estilo.value = {
    top: `${r.bottom + 6}px`,
    left: `${r.left + r.width / 2}px`,
    transform: 'translateX(-50%)',
  };
}

function mostrar() {
  calcular();
  visible.value = true;
}

function ocultar() {
  visible.value = false;
}
</script>
