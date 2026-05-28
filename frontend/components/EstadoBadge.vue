<template>
  <span :class="cls">{{ label }}</span>
</template>

<script setup>
const props = defineProps({ estado: String });

const MAP = {
  pendiente:    { cls: 'badge-amber',  label: 'Pendiente' },
  en_revision:  { cls: 'badge-amber',  label: 'En revisión' },
  aprobado:     { cls: 'badge-green',  label: 'Aprobado' },
  aprobada:     { cls: 'badge-green',  label: 'Aprobada' },
  rechazado:    { cls: 'badge-red',    label: 'Rechazado' },
  rechazada:    { cls: 'badge-red',    label: 'Rechazada' },
  en_proceso:   { cls: 'badge-blue',   label: 'En proceso' },
  cerrado:      { cls: 'badge-gray',   label: 'Cerrado' },
  cancelado:    { cls: 'badge-gray',   label: 'Cancelado' },
  cancelada:    { cls: 'badge-gray',   label: 'Cancelada' },
  pagada:       { cls: 'badge-green',  label: 'Pagada' },
  pagado:       { cls: 'badge-violet', label: 'Pagado · listo para usar' },
  activo:       { cls: 'badge-green',  label: 'Activo' },
  inactivo:     { cls: 'badge-gray',   label: 'Inactivo' },
  borrador:     { cls: 'badge-gray',   label: 'Borrador' },
  enviado:      { cls: 'badge-blue',   label: 'Enviado' },
  parcial:      { cls: 'badge-amber',  label: 'Firma parcial' },
  firmado:      { cls: 'badge-green',  label: 'Firmado' },
  declinado:    { cls: 'badge-red',    label: 'Declinado' },
  error:        { cls: 'badge-red',    label: 'Error' },
};

const cls = computed(() => MAP[props.estado]?.cls || 'badge-gray');
const label = computed(() => MAP[props.estado]?.label || props.estado);
</script>
