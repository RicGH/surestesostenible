<template>
  <div class="space-y-6">
    <div class="flex items-center gap-1 border-b border-ink-200 overflow-x-auto overflow-y-hidden">
      <button v-for="t in tabs" :key="t.id"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                 tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800']"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
                       tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600']">
          {{ counts[t.id] || 0 }}
        </span>
      </button>
    </div>

    <section v-if="tab === 'por_pagar'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Tipo</th><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Monto</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="r in porPagar" :key="`${r.tipo}-${r.id}-${r.ajuste_id || ''}`">
              <td>
                <span :class="r.tipo === 'ajuste' ? 'badge-amber' : 'badge-blue'">
                  {{ r.tipo === 'ajuste' ? 'Ajuste' : 'Solicitud' }}
                </span>
              </td>
              <td class="font-mono text-xs">{{ r.folio }}</td>
              <td class="font-medium text-ink-800">{{ r.colaborador_nombre }}</td>
              <td>
                {{ r.destino }}
                <span v-if="r.tipo === 'ajuste'" class="block text-xs text-ink-500 mt-0.5">{{ r.ajuste_motivo }}</span>
              </td>
              <td class="font-medium">${{ Number(r.monto_total).toFixed(2) }}</td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle del viaje" variant="primary" @click="$router.push(`/viaticos/${r.id}?from=finanzas`)" />
                  <IconButton icon="wallet" tooltip="Registrar abono" variant="success" @click="abrirPago(r)" />
                </div>
              </td>
            </tr>
            <tr v-if="!porPagar.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin viáticos por pagar</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'historial'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Tipo</th><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Monto</th><th>Avance del viático</th><th>Fecha</th><th>Referencia</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="p in historial" :key="p.id">
              <td>
                <span :class="p.tipo === 'ajuste' ? 'badge-amber' : 'badge-blue'">
                  {{ p.tipo === 'ajuste' ? 'Ajuste' : 'Solicitud' }}
                </span>
              </td>
              <td class="font-mono text-xs">{{ p.folio }}</td>
              <td class="font-medium text-ink-800">{{ p.colaborador_nombre }}</td>
              <td>{{ p.destino }}</td>
              <td class="font-medium">${{ Number(p.monto).toFixed(2) }}</td>
              <td class="min-w-[180px]">
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-ink-700 font-medium">${{ Number(p.monto_gastado || 0).toFixed(2) }}</span>
                    <span class="text-ink-500">/ ${{ Number(p.monto_total || 0).toFixed(2) }}</span>
                  </div>
                  <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      class="h-full transition-all"
                      :class="avance(p) >= 100 ? 'bg-red-500' : avance(p) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                      :style="{ width: `${Math.min(100, avance(p))}%` }"
                    />
                  </div>
                  <p class="text-[10px] text-ink-500">{{ avance(p).toFixed(0) }}% gastado · {{ p.estado }}</p>
                </div>
              </td>
              <td class="text-ink-600">{{ formatFecha(p.fecha_pago) }}</td>
              <td class="text-ink-500 text-xs">{{ p.referencia || '—' }}</td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle del viático" variant="primary" @click="$router.push(`/viaticos/${p.solicitud_id}?from=finanzas`)" />
                </div>
              </td>
            </tr>
            <tr v-if="!historial.length"><td colspan="9" class="py-12 text-center text-ink-400">Sin pagos registrados</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="modal.abierto" :title="`Registrar abono · ${modal.folio}`" @close="modal.abierto = false">
      <div class="space-y-4">
        <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 text-sm">
          <div class="flex justify-between"><span class="text-ink-500">Tipo</span><span class="font-medium">{{ modal.tipo === 'ajuste' ? 'Ajuste' : 'Solicitud' }}</span></div>
          <div class="flex justify-between mt-1"><span class="text-ink-500">Colaborador</span><span class="font-medium">{{ modal.colaborador }}</span></div>
          <div class="flex justify-between mt-1"><span class="text-ink-500">Monto a abonar</span><span class="font-semibold text-ink-900">${{ Number(modal.monto).toFixed(2) }}</span></div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Referencia <span class="text-ink-400 text-xs font-normal">(opcional)</span></label>
          <input v-model="modal.referencia" placeholder="Folio bancario, SPEI, etc." class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Comprobante de transferencia <span class="text-ink-400 text-xs font-normal">(opcional)</span></label>
          <FileDrop
            v-model="comprobante"
            accept=".pdf,image/*"
            icon="receipt"
            label="Subir comprobante"
            hint="PDF o imagen del recibo bancario · arrastra o haz clic"
          />
        </div>
        <p class="text-xs text-ink-500">Puedes registrar el abono sin comprobante ni referencia si aún no los tienes.</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-success" :disabled="enviando" @click="confirmar">{{ enviando ? 'Subiendo...' : 'Confirmar abono' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const tab = ref('por_pagar');
const tabs = [
  { id: 'por_pagar', label: 'Por pagar' },
  { id: 'historial', label: 'Historial' },
];

const porPagar = ref([]);
const historial = ref([]);
const comprobante = ref(null);
const enviando = ref(false);
const modal = reactive({ abierto: false, tipo: '', id: null, ajuste_id: null, folio: '', colaborador: '', monto: 0, referencia: '' });

const counts = computed(() => ({ por_pagar: porPagar.value.length, historial: historial.value.length }));

async function cargar() {
  const [a, b] = await Promise.all([
    api.get('/viaticos/por-pagar'),
    api.get('/viaticos/pagos-historial'),
  ]);
  porPagar.value = a.data; historial.value = b.data;
}
onMounted(cargar);

function abrirPago(r) {
  Object.assign(modal, {
    abierto: true,
    tipo: r.tipo,
    id: r.id,
    ajuste_id: r.ajuste_id,
    folio: r.folio,
    colaborador: r.colaborador_nombre,
    monto: r.monto_total,
    referencia: '',
  });
  comprobante.value = null;
}

const toast = useToast();

async function confirmar() {
  enviando.value = true;
  try {
    const fd = new FormData();
    if (comprobante.value) fd.append('comprobante', comprobante.value);
    if (modal.referencia) fd.append('referencia', modal.referencia);
    const url = modal.tipo === 'ajuste'
      ? `/viaticos-ajustes/${modal.ajuste_id}/pagar`
      : `/viaticos/${modal.id}/pagar`;
    await api.upload(url, fd);
    toast.success('Abono registrado', `${modal.folio} · $${Number(modal.monto).toFixed(2)}`);
    modal.abierto = false; comprobante.value = null;
    cargar();
  } catch (e) { toast.error('No se pudo registrar el abono', e.message); }
  finally { enviando.value = false; }
}

function formatFecha(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function avance(p) {
  const total = Number(p.monto_total || 0);
  if (!total) return 0;
  return (Number(p.monto_gastado || 0) / total) * 100;
}
</script>
