<template>
  <!-- Estado de firma del oficio de comisión: Autoriza (1) → Recibe (2) -->
  <button
    type="button"
    class="text-left group"
    :title="fila.oficio_documento_id ? 'Ver firmantes del oficio' : 'Enviar oficio a firma'"
    @click="$emit('click')"
  >
    <template v-if="!fila.oficio_documento_id">
      <span class="text-xs text-ink-400 group-hover:text-brand-600 group-hover:underline">Sin enviar</span>
    </template>
    <template v-else>
      <span class="flex items-center gap-1.5">
        <span
          v-for="(rol, i) in ['Autoriza', 'Recibe']"
          :key="rol"
          :title="`${rol}: ${i < firmados ? 'firmó' : 'pendiente'}`"
          :class="['w-2.5 h-2.5 rounded-full', i < firmados ? 'bg-emerald-500' : 'bg-ink-200']"
        ></span>
        <span class="text-sm font-medium text-brand-600 group-hover:text-brand-700 group-hover:underline">
          {{ firmados }} / {{ total }}
        </span>
      </span>
      <span :class="['block text-xs mt-0.5', completo ? 'text-emerald-600' : 'text-amber-600']">
        {{ completo ? 'Firmado' : `Falta: ${fila.oficio_falta}` }}
      </span>
    </template>
  </button>
</template>

<script setup>
const props = defineProps({ fila: { type: Object, required: true } });
defineEmits(['click']);

const total = computed(() => Number(props.fila.oficio_total_firmantes) || 2);
const firmados = computed(() => Number(props.fila.oficio_total_firmados) || 0);
const completo = computed(() => props.fila.oficio_estado === 'firmado' || (firmados.value >= total.value && total.value > 0));
</script>
