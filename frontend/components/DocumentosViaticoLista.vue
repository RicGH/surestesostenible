<template>
  <div class="space-y-2">
    <p class="text-xs uppercase tracking-wide text-ink-400">Documentos del viático</p>
    <div
      v-for="d in DOCUMENTOS"
      :key="d.key"
      class="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5"
    >
      <div class="w-8 h-8 shrink-0 rounded-lg grid place-items-center" :class="d.clase">
        <Icon :name="d.icono" size="w-4 h-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-medium text-ink-800 text-sm">{{ d.titulo }}</p>
        <p class="text-xs text-ink-500">{{ d.detalle }}</p>
      </div>
      <button type="button" class="btn-secondary text-xs !px-2.5 !py-1.5" @click="ver(d)">
        <Icon name="eye" size="w-4 h-4" /> Ver
      </button>
    </div>
    <p v-if="documento" class="text-xs text-ink-500">
      Se enviaron a firma juntos el {{ fecha(documento.enviado_at) }}.
      <button type="button" class="text-brand-600 hover:underline font-medium" @click="$emit('ver-firmado')">
        {{ documento.estado === 'firmado' ? 'Ver PDF firmado' : 'Ver PDF enviado' }}
      </button>
    </p>

    <FileViewer
      v-if="visor"
      :path="visor.path"
      :title="visor.titulo"
      :subtitle="viatico.folio"
      :download-name="visor.descarga"
      @close="visor = null"
    />
  </div>
</template>

<script setup>
// Lista de los documentos que se manejan por viático (oficio de comisión e
// informe de comisión con gastos y bitácoras) con su vista previa al momento.
const props = defineProps({
  viatico: { type: Object, required: true }, // { id, folio }
  documento: { type: Object, default: null }, // envío a firma (si lo hay)
});
defineEmits(['ver-firmado']);

const DOCUMENTOS = [
  {
    key: 'oficio',
    titulo: 'Oficio de comisión',
    detalle: 'Oficio de comisión y ministración de viáticos',
    icono: 'fileText',
    clase: 'bg-brand-50 text-brand-600',
    ruta: (id) => `/viaticos/${id}/oficio`,
    archivo: (folio) => `oficio-${folio}.pdf`,
  },
  {
    key: 'informe',
    titulo: 'Informe de comisión',
    detalle: 'Informe de comisión con gastos y bitácoras',
    icono: 'book',
    clase: 'bg-violet-50 text-violet-600',
    ruta: (id) => `/viaticos/${id}/informe/pdf`,
    archivo: (folio) => `informe-comision-${folio}.pdf`,
  },
];

const visor = ref(null);
function ver(d) {
  visor.value = {
    path: d.ruta(props.viatico.id),
    titulo: d.titulo,
    descarga: d.archivo(props.viatico.folio),
  };
}

function fecha(v) {
  if (!v) return '—';
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${String(v).replace(' ', 'T')}Z`);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
</script>
