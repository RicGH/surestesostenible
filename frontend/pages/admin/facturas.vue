<template>
  <div class="space-y-6">
    <div class="card-pad flex gap-3">
      <select v-model="filtros.estado" class="input w-60">
        <option value="">Todos los estados</option>
        <option value="en_revision">En revisión</option>
        <option value="aprobada">Aprobada</option>
        <option value="rechazada">Rechazada</option>
        <option value="pagada">Pagada</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Folio</th><th>Proveedor</th><th>RFC</th>
            <th>Monto</th><th>Fecha</th><th>Estado</th><th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in facturas" :key="f.id">
            <td class="font-mono text-xs">{{ f.folio }}</td>
            <td class="font-medium text-ink-800">{{ f.razon_social }}</td>
            <td class="font-mono">{{ f.rfc }}</td>
            <td>${{ Number(f.monto).toFixed(2) }} {{ f.moneda }}</td>
            <td class="text-ink-600">{{ f.fecha_emision }}</td>
            <td><EstadoBadge :estado="f.estado" /></td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="abrir(f.id)" />
                <IconButton icon="fileText" tooltip="Oficio de pago a proveedores (PDF)" @click="verOficio(f)" />
                <IconButton v-if="f.estado === 'en_revision'" icon="check" tooltip="Aprobar" variant="success" @click="aprobar(f.id)" />
                <IconButton v-if="f.estado === 'en_revision'" icon="x" tooltip="Rechazar" variant="danger" @click="abrirRechazo(f)" />
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length"><td colspan="7" class="py-12 text-center text-ink-400">Sin facturas</td></tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="detalle" :title="`Factura ${detalle.folio}`" @close="detalle = null">
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div><dt class="text-ink-500 text-xs uppercase">UUID</dt><dd class="font-mono text-xs break-all">{{ detalle.uuid_cfdi }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Emisor</dt><dd class="font-medium">{{ detalle.nombre_emisor }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">RFC</dt><dd class="font-mono">{{ detalle.rfc }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Monto</dt><dd class="font-medium">${{ Number(detalle.monto).toFixed(2) }} {{ detalle.moneda }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Fecha</dt><dd>{{ detalle.fecha_emision }}</dd></div>
        <div><dt class="text-ink-500 text-xs uppercase">Estado</dt><dd><EstadoBadge :estado="detalle.estado" /></dd></div>
      </dl>
      <div class="flex gap-2 mt-4">
        <button class="btn-secondary" @click="api.download(`/facturas/${detalle.id}/archivo/pdf`, `${detalle.folio}.pdf`)">
          <Icon name="download" size="w-4 h-4" /> Descargar PDF
        </button>
        <button class="btn-secondary" @click="api.download(`/facturas/${detalle.id}/archivo/xml`, `${detalle.folio}.xml`)">
          <Icon name="fileText" size="w-4 h-4" /> Descargar XML
        </button>
      </div>
    </Modal>

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

    <Modal v-if="modal.abierto" :title="`Rechazar ${modal.folio}`" @close="modal.abierto = false">
      <textarea v-model="modal.motivo" rows="3" class="input" placeholder="Motivo"></textarea>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazar">Confirmar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const facturas = ref([]);
const detalle = ref(null);
const filtros = reactive({ estado: '' });
const modal = reactive({ abierto: false, id: null, folio: '', motivo: '' });

async function cargar() {
  const qs = filtros.estado ? `?estado=${filtros.estado}` : '';
  const r = await api.get(`/facturas/admin${qs}`);
  facturas.value = r.data;
}
watch(filtros, cargar, { deep: true });
onMounted(cargar);

const toast = useToast();

async function abrir(id) {
  try { detalle.value = await api.get(`/facturas/${id}`); }
  catch (e) { toast.error('No se pudo abrir el detalle', e.message); }
}
async function aprobar(id) {
  try {
    await api.post(`/facturas/${id}/aprobar`);
    toast.success('Factura aprobada', 'Pasa a finanzas para el pago.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar', e.message); }
}
const oficioModal = reactive({ abierto: false, estado: '', url: null, folio: '', error: '' });

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

function abrirRechazo(f) { Object.assign(modal, { abierto: true, id: f.id, folio: f.folio, motivo: '' }); }
async function rechazar() {
  try {
    await api.post(`/facturas/${modal.id}/rechazar`, { motivo: modal.motivo });
    toast.success('Factura rechazada');
    modal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}
</script>
