<template>
  <div class="space-y-6">
    <p class="text-sm text-ink-500">{{ facturas.length }} pago(s) realizado(s)</p>
    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr><th>Folio</th><th>Proveedor</th><th>Monto</th><th>Fecha</th><th class="!text-center">Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in facturas" :key="f.id">
            <td class="font-mono text-xs">{{ f.folio }}</td>
            <td class="font-medium text-ink-800">{{ f.razon_social }}</td>
            <td class="font-medium">${{ Number(f.monto).toFixed(2) }} {{ f.moneda }}</td>
            <td>{{ f.fecha_emision }}</td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="abrir(f.id)" />
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length"><td colspan="5" class="py-12 text-center text-ink-400">Sin pagos</td></tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="detalle" :title="`Factura ${detalle.folio}`" @close="detalle = null">
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div><dt class="text-ink-500 text-xs uppercase">UUID</dt><dd class="font-mono text-xs break-all">{{ detalle.uuid_cfdi || '—' }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Emisor</dt><dd class="font-medium">{{ detalle.nombre_emisor || '—' }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">RFC</dt><dd class="font-mono">{{ detalle.rfc }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Monto</dt><dd class="font-medium">${{ Number(detalle.monto).toFixed(2) }} {{ detalle.moneda }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Fecha</dt><dd>{{ detalle.fecha_emision }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Estado</dt><dd><EstadoBadge :estado="detalle.estado" /></dd></div>
      </dl>
      <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ink-100">
        <button class="btn-secondary" @click="verArchivo(`/facturas/${detalle.id}/archivo/pdf`, 'PDF de la factura', `${detalle.folio}.pdf`)">
          <Icon name="eye" size="w-4 h-4" /> Ver PDF
        </button>
        <button class="btn-secondary" @click="verArchivo(`/facturas/${detalle.id}/comprobante`, 'Comprobante de pago', `pago-${detalle.folio}.pdf`)">
          <Icon name="eye" size="w-4 h-4" /> Ver comprobante
        </button>
        <button class="btn-secondary" @click="api.download(`/facturas/${detalle.id}/archivo/xml`, `${detalle.folio}.xml`)">
          <Icon name="fileText" size="w-4 h-4" /> Descargar XML
        </button>
      </div>
    </Modal>

    <FileViewer
      v-if="visor.abierto"
      :path="visor.path"
      :title="visor.title"
      :subtitle="visor.subtitle"
      :download-name="visor.downloadName"
      @close="visor.abierto = false"
    />
  </div>
</template>

<script setup>
const api = useApi();
const toast = useToast();
const facturas = ref([]);
const detalle = ref(null);
const visor = reactive({ abierto: false, path: '', title: '', subtitle: '', downloadName: '' });

onMounted(async () => {
  const r = await api.get('/facturas/admin?estado=pagada');
  facturas.value = r.data;
});

async function abrir(id) {
  try {
    detalle.value = await api.get(`/facturas/${id}`);
  } catch (e) {
    toast.error('No se pudo abrir el detalle', e.message);
  }
}

function verArchivo(path, title, downloadName) {
  Object.assign(visor, { abierto: true, path, title, subtitle: detalle.value?.folio || '', downloadName });
}
</script>
