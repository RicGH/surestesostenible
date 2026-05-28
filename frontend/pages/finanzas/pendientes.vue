<template>
  <div class="space-y-6">
    <p class="text-sm text-ink-500">{{ facturas.length }} factura(s) pendientes de pago</p>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Folio</th><th>Proveedor</th><th>RFC</th>
            <th>Monto</th><th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in facturas" :key="f.id">
            <td class="font-mono text-xs">{{ f.folio }}</td>
            <td class="font-medium text-ink-800">{{ f.razon_social }}</td>
            <td class="font-mono">{{ f.rfc }}</td>
            <td class="font-medium">${{ Number(f.monto).toFixed(2) }} {{ f.moneda }}</td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="download" tooltip="Descargar PDF" @click="api.download(`/facturas/${f.id}/archivo/pdf`, `${f.folio}.pdf`)" />
                <IconButton icon="fileText" tooltip="Descargar XML" @click="api.download(`/facturas/${f.id}/archivo/xml`, `${f.folio}.xml`)" />
                <IconButton icon="wallet" tooltip="Registrar pago" variant="success" @click="abrirPago(f)" />
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length"><td colspan="5" class="py-12 text-center text-ink-400">Sin facturas pendientes</td></tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="modal.abierto" :title="`Registrar pago de ${modal.folio}`" @close="modal.abierto = false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Referencia <span class="text-red-500">*</span></label>
          <input v-model="modal.referencia" required placeholder="Folio bancario, SPEI, etc." class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Comprobante de pago <span class="text-red-500">*</span></label>
          <FileDrop
            v-model="comprobante"
            accept=".pdf,image/*"
            icon="receipt"
            label="Subir comprobante"
            hint="PDF o imagen del recibo bancario · arrastra o haz clic"
          />
        </div>
        <p v-if="!puedeConfirmar" class="text-xs text-ink-500">Ambos campos son obligatorios para confirmar el pago.</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-success" :disabled="enviando || !puedeConfirmar" @click="pagar">{{ enviando ? 'Subiendo...' : 'Confirmar pago' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const facturas = ref([]);
const comprobante = ref(null);
const modal = reactive({ abierto: false, id: null, folio: '', referencia: '' });
const enviando = ref(false);

const puedeConfirmar = computed(() => !!comprobante.value && !!modal.referencia?.trim());

async function cargar() {
  const r = await api.get('/facturas/admin?estado=aprobada');
  facturas.value = r.data;
}
onMounted(cargar);

function abrirPago(f) {
  Object.assign(modal, { abierto: true, id: f.id, folio: f.folio, referencia: '' });
  comprobante.value = null;
}

const toast = useToast();

async function pagar() {
  if (!comprobante.value) return;
  enviando.value = true;
  try {
    const fd = new FormData();
    fd.append('comprobante', comprobante.value);
    if (modal.referencia) fd.append('referencia', modal.referencia);
    await api.upload(`/facturas/${modal.id}/pagar`, fd);
    toast.success('Pago registrado', `Factura ${modal.folio}`);
    modal.abierto = false; comprobante.value = null;
    cargar();
  } catch (e) { toast.error('No se pudo registrar el pago', e.message); }
  finally { enviando.value = false; }
}
</script>
