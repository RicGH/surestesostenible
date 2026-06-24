<template>
  <div class="space-y-6">
    <div class="card-pad grid grid-cols-2 md:grid-cols-5 gap-3">
      <input v-model="filtros.folio" placeholder="Folio" class="input" />
      <select v-model="filtros.estado" class="input">
        <option value="">Todos</option>
        <option value="en_revision">En revisión</option>
        <option value="aprobada">Aprobada</option>
        <option value="rechazada">Rechazada</option>
        <option value="pagada">Pagada</option>
      </select>
      <DateInput v-model="filtros.desde" placeholder="Desde" />
      <DateInput v-model="filtros.hasta" placeholder="Hasta" :min-date="filtros.desde || null" />
      <button class="btn-secondary" @click="cargar">Filtrar</button>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Folio</th><th>UUID</th><th>Fecha</th>
            <th>Monto</th><th>Estado</th><th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in facturas" :key="f.id">
            <td class="font-mono text-xs">{{ f.folio }}</td>
            <td class="font-mono text-xs text-ink-500">{{ (f.uuid_cfdi || '').slice(0, 8) }}…</td>
            <td>{{ f.fecha_emision }}</td>
            <td class="font-medium">${{ Number(f.monto).toFixed(2) }} {{ f.moneda }}</td>
            <td><EstadoBadge :estado="f.estado" /></td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="fileText" tooltip="Oficio de pago (PDF)" @click="verOficio(f)" />
                <IconButton v-if="f.estado === 'pagada'" icon="download" tooltip="Descargar comprobante de pago" variant="success" @click="descargarComprobante(f.id, f.folio)" />
                <IconButton v-if="f.estado === 'rechazada'" icon="alert" tooltip="Ver motivo del rechazo" variant="danger" @click="verMotivo(f.id)" />
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin facturas</td></tr>
        </tbody>
      </table>
    </div>
    <Modal v-if="oficioModal.abierto" title="Oficio de pago a proveedores" size="sm" @close="oficioModal.abierto = false">
      <div class="py-4 text-center">
        <template v-if="oficioModal.estado === 'generando'">
          <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
          <p class="mt-4 font-semibold text-ink-800">Generando documento…</p>
          <p class="text-sm text-ink-500 mt-1">Preparando el oficio de <span class="font-mono">{{ oficioModal.folio }}</span>. Esto puede tardar unos segundos.</p>
        </template>
        <template v-else-if="oficioModal.estado === 'listo'">
          <div class="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="check" /></div>
          <p class="mt-4 font-semibold text-ink-800">Documento listo</p>
          <p class="text-sm text-ink-500 mt-1">Tu navegador bloqueó la pestaña automática. Ábrelo manualmente.</p>
          <a :href="oficioModal.url" target="_blank" class="btn-primary mt-4 inline-flex" @click="oficioModal.abierto = false">
            <Icon name="eye" size="w-4 h-4" /> Abrir documento
          </a>
        </template>
        <template v-else>
          <div class="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 grid place-items-center"><Icon name="alert" /></div>
          <p class="mt-4 font-semibold text-ink-800">No se pudo generar</p>
          <p class="text-sm text-red-600 mt-1">{{ oficioModal.error }}</p>
        </template>
      </div>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const facturas = ref([]);
const filtros = reactive({ folio: '', estado: '', desde: '', hasta: '' });

async function cargar() {
  const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const r = await api.get(`/facturas/mias${qs ? '?' + qs : ''}`);
  facturas.value = r.data;
}
onMounted(cargar);

const toast = useToast();
const oficioModal = reactive({ abierto: false, estado: 'generando', url: null, folio: '', error: '' });

async function verOficio(f) {
  Object.assign(oficioModal, { abierto: true, estado: 'generando', url: null, folio: f.folio, error: '' });
  try {
    const { url } = await api.viewBlob(`/facturas/${f.id}/oficio`);
    oficioModal.url = url;
    oficioModal.estado = 'listo';
    const win = window.open(url, '_blank');
    if (win) oficioModal.abierto = false;
  } catch (e) {
    oficioModal.estado = 'error';
    oficioModal.error = e.message;
  }
}
async function descargarComprobante(id, folio) {
  try {
    await api.download(`/facturas/${id}/comprobante`, `pago-${folio}.pdf`);
    toast.success('Comprobante descargado', `pago-${folio}.pdf`);
  } catch (e) { toast.error('No se pudo descargar', e.message); }
}
async function verMotivo(id) {
  try {
    const f = await api.get(`/facturas/${id}`);
    toast.warning('Motivo del rechazo', f.motivo_rechazo);
  } catch (e) { toast.error('Error', e.message); }
}
</script>
