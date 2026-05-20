<template>
  <ClientOnly>
    <VueDatePicker
      v-model="modelo"
      :format="'dd/MM/yyyy'"
      :preview-format="'dd/MM/yyyy'"
      :enable-time-picker="false"
      :clearable="clearable"
      :placeholder="placeholder || 'dd/mm/aaaa'"
      :auto-apply="true"
      :locale="'es'"
      :select-text="'Aplicar'"
      :cancel-text="'Cancelar'"
      :now-button-label="'Hoy'"
      :format-locale="es"
      :teleport="true"
      :disabled="disabled"
      :min-date="minDate"
      :max-date="maxDate"
      :enable-seconds="false"
      :input-class-name="'dp-custom-input'"
      menu-class-name="dp-custom-menu"
    />
    <template #fallback>
      <input type="text" :value="modelValue" :placeholder="placeholder || 'dd/mm/aaaa'" class="input" readonly />
    </template>
  </ClientOnly>
</template>

<script setup>
import { es } from 'date-fns/locale';

const props = defineProps({
  modelValue: { type: [String, Date, null], default: null },
  placeholder: String,
  clearable: { type: Boolean, default: true },
  disabled: Boolean,
  minDate: [String, Date, null],
  maxDate: [String, Date, null],
});
const emit = defineEmits(['update:modelValue']);

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return null;
}

function toIso(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const modelo = computed({
  get: () => toDate(props.modelValue),
  set: (v) => emit('update:modelValue', v ? toIso(v) : ''),
});
</script>
