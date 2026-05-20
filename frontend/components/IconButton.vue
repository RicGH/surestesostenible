<template>
  <button
    ref="btnEl"
    type="button"
    :aria-label="tooltip"
    :disabled="disabled"
    :class="[
      'inline-grid place-items-center w-8 h-8 rounded-lg transition-colors',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      variantClass,
    ]"
    @mouseenter="mostrar"
    @mouseleave="ocultar"
    @focus="mostrar"
    @blur="ocultar"
    @click="onClick"
  >
    <Icon :name="icon" size="w-4 h-4" />
  </button>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <span
        v-if="visible"
        :style="estilo"
        class="fixed z-[100] pointer-events-none whitespace-nowrap
               px-2 py-1 rounded-md bg-ink-900 text-white text-[11px] font-medium shadow-card"
      >
        {{ tooltip }}
      </span>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  icon: { type: String, required: true },
  tooltip: { type: String, required: true },
  variant: { type: String, default: 'default' },
  disabled: Boolean,
});
const emit = defineEmits(['click']);

const VARIANTS = {
  default: 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
  primary: 'text-brand-600 hover:text-white hover:bg-brand-600',
  success: 'text-emerald-600 hover:text-white hover:bg-emerald-600',
  danger:  'text-red-600 hover:text-white hover:bg-red-600',
  warning: 'text-amber-600 hover:text-white hover:bg-amber-600',
};

const variantClass = computed(() => VARIANTS[props.variant] || VARIANTS.default);
const btnEl = ref(null);
const visible = ref(false);
const estilo = ref({ top: '0px', left: '0px' });

function calcular() {
  if (!btnEl.value) return;
  const r = btnEl.value.getBoundingClientRect();
  estilo.value = {
    top: `${r.top - 30}px`,
    left: `${r.left + r.width / 2}px`,
    transform: 'translateX(-50%)',
  };
}

function mostrar() {
  if (props.disabled) return;
  calcular();
  visible.value = true;
}

function ocultar() {
  visible.value = false;
}

function onClick(e) {
  visible.value = false;
  emit('click', e);
}
</script>
