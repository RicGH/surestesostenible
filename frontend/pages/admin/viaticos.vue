<template>
  <div class="space-y-6">
    <div class="flex items-center gap-1 border-b border-ink-200 overflow-x-auto overflow-y-hidden">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                 tab === t.id
                   ? 'border-brand-600 text-brand-700'
                   : 'border-transparent text-ink-500 hover:text-ink-800']"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
                       tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600']">
          {{ counts[t.id] || 0 }}
        </span>
      </button>
    </div>

    <div class="card-pad grid grid-cols-1 gap-3" :class="tab === 'todos' ? 'md:grid-cols-5' : 'md:grid-cols-4'">
      <div class="md:col-span-2 relative">
        <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input v-model="filtros.q" :placeholder="placeholderBusqueda" class="input pl-9" />
      </div>
      <DateInput v-model="filtros.desde" placeholder="Desde" />
      <DateInput v-model="filtros.hasta" placeholder="Hasta" :min-date="filtros.desde || null" />
      <select v-if="tab === 'todos'" v-model="filtros.estado" class="input">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="aprobado">Aprobado</option>
        <option value="pagado">Pagado</option>
        <option value="en_proceso">En proceso</option>
        <option value="rechazado">Rechazado</option>
        <option value="cerrado">Cerrado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <div v-if="hayFiltros" class="md:col-span-full flex items-center gap-2 text-xs text-ink-500">
        <span>{{ resultadosFiltrados }} resultado(s)</span>
        <button class="text-brand-600 hover:text-brand-700 font-medium" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </div>
    </div>

    <section v-if="tab === 'pendientes'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Fechas</th><th>Avance</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in pendientesFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td class="text-ink-600">{{ s.fecha_inicio }} → {{ s.fecha_fin }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="check" tooltip="Aprobar" variant="success" @click="aprobar(s.id)" />
                  <IconButton icon="x" tooltip="Rechazar" variant="danger" @click="abrirRechazo(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!pendientesFiltrados.length"><td colspan="6" class="py-12 text-center text-ink-400">{{ pendientes.length ? 'Sin coincidencias con los filtros' : 'Sin solicitudes pendientes' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'ajustes'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio viaje</th><th>Colaborador</th><th>Motivo</th><th>Monto</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="a in ajustesFiltrados" :key="a.id">
              <td class="font-mono text-xs">{{ a.solicitud_folio }}</td>
              <td class="font-medium text-ink-800">{{ a.colaborador_nombre }}</td>
              <td>{{ a.motivo }}</td>
              <td class="font-medium">+${{ Number(a.monto_total).toFixed(2) }}</td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver viaje" variant="primary" @click="$router.push(`/viaticos/${a.solicitud_id}?from=admin`)" />
                  <IconButton icon="check" tooltip="Aprobar ajuste" variant="success" @click="aprobarAjuste(a.id)" />
                  <IconButton icon="x" tooltip="Rechazar ajuste" variant="danger" @click="abrirRechazoAjuste(a)" />
                </div>
              </td>
            </tr>
            <tr v-if="!ajustesFiltrados.length"><td colspan="5" class="py-12 text-center text-ink-400">{{ ajustes.length ? 'Sin coincidencias con los filtros' : 'Sin ajustes pendientes' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'activos'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th>Comprobantes</th><th>Estado</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in activosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><span class="badge-blue">{{ s.gastos_count }}</span></td>
              <td><EstadoBadge :estado="s.estado" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver comprobantes" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="check" tooltip="Cerrar viáticos" variant="success" @click="abrirCerrar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!activosFiltrados.length"><td colspan="7" class="py-12 text-center text-ink-400">{{ activos.length ? 'Sin coincidencias con los filtros' : 'Sin viáticos activos' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'rechazados'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th>Motivo</th><th>Edición</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in rechazadosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td class="text-sm text-ink-600 max-w-md">{{ s.motivo_rechazo || '—' }}</td>
              <td>
                <span v-if="s.permite_edicion" class="badge-blue">Permitida</span>
                <span v-else class="badge-gray">Bloqueada</span>
              </td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                </div>
              </td>
            </tr>
            <tr v-if="!rechazadosFiltrados.length"><td colspan="7" class="py-12 text-center text-ink-400">{{ rechazados.length ? 'Sin coincidencias con los filtros' : 'Sin viajes rechazados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'cerrados'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in cerradosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                </div>
              </td>
            </tr>
            <tr v-if="!cerradosFiltrados.length"><td colspan="5" class="py-12 text-center text-ink-400">{{ cerrados.length ? 'Sin coincidencias con los filtros' : 'Sin viajes cerrados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'todos'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Fechas</th><th>Avance</th><th>Estado</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in todosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td class="text-ink-600 text-xs">{{ s.fecha_inicio }} → {{ s.fecha_fin }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><EstadoBadge :estado="s.estado" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                </div>
              </td>
            </tr>
            <tr v-if="!todosFiltrados.length"><td colspan="7" class="py-12 text-center text-ink-400">{{ todos.length ? 'Sin coincidencias con los filtros' : 'Sin resultados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="modal.abierto" :title="`Rechazar ${modal.folio}`" @close="modal.abierto = false">
      <textarea v-model="modal.motivo" rows="3" class="input" placeholder="Motivo del rechazo"></textarea>
      <label class="flex items-center gap-2 text-sm mt-3">
        <input v-model="modal.permiteEdicion" type="checkbox" />
        Permitir corrección por precio alto
      </label>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazar">Confirmar</button>
      </template>
    </Modal>

    <Modal v-if="modalAjuste.abierto" title="Rechazar ajuste" @close="modalAjuste.abierto = false">
      <textarea v-model="modalAjuste.motivo" rows="3" class="input" placeholder="Motivo"></textarea>
      <template #footer>
        <button class="btn-secondary" @click="modalAjuste.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazarAjuste">Confirmar</button>
      </template>
    </Modal>

    <Modal v-if="cerrarModal.abierto" :title="`Cerrar viáticos ${cerrarModal.folio}`" @close="cerrarModal.abierto = false">
      <div class="space-y-3 text-sm">
        <p class="text-ink-700">¿Confirmas el cierre? Una vez cerrado no se podrán agregar más comprobantes.</p>
        <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 text-xs space-y-1">
          <p><span class="text-ink-500">Total:</span> <strong>${{ Number(cerrarModal.total).toFixed(2) }}</strong></p>
          <p><span class="text-ink-500">Gastado:</span> <strong>${{ Number(cerrarModal.gastado).toFixed(2) }}</strong></p>
          <p><span class="text-ink-500">Diferencia:</span>
            <strong :class="cerrarModal.total - cerrarModal.gastado < 0 ? 'text-red-600' : 'text-emerald-600'">
              ${{ (cerrarModal.total - cerrarModal.gastado).toFixed(2) }}
            </strong>
          </p>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cerrarModal.abierto = false">Cancelar</button>
        <button class="btn-success" @click="confirmarCierre">Cerrar viáticos</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const tab = ref('pendientes');
const tabs = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'ajustes',    label: 'Ajustes' },
  { id: 'activos',    label: 'Activos' },
  { id: 'rechazados', label: 'Rechazados' },
  { id: 'cerrados',   label: 'Cerrados' },
  { id: 'todos',      label: 'Todos' },
];

const pendientes = ref([]);
const ajustes = ref([]);
const activos = ref([]);
const rechazados = ref([]);
const cerrados = ref([]);
const todos = ref([]);

const filtros = reactive({ q: '', desde: '', hasta: '', estado: '' });

const placeholderBusqueda = computed(() => {
  if (tab.value === 'ajustes') return 'Buscar por folio, colaborador o motivo';
  return 'Buscar por folio, colaborador o destino';
});

const hayFiltros = computed(() => !!filtros.q || !!filtros.desde || !!filtros.hasta || !!filtros.estado);

function limpiarFiltros() {
  filtros.q = ''; filtros.desde = ''; filtros.hasta = ''; filtros.estado = '';
}

function coincideTexto(s, campos) {
  if (!filtros.q) return true;
  const q = filtros.q.toLowerCase();
  return campos.some((c) => String(s[c] || '').toLowerCase().includes(q));
}

function dentroDeRango(s) {
  const ini = s.fecha_inicio || s.created_at;
  const fin = s.fecha_fin || s.created_at;
  if (filtros.desde && (ini || '').slice(0, 10) < filtros.desde) return false;
  if (filtros.hasta && (fin || '').slice(0, 10) > filtros.hasta) return false;
  return true;
}

function filtrarSolicitudes(arr) {
  return arr.filter((s) => coincideTexto(s, ['folio', 'colaborador_nombre', 'destino']) && dentroDeRango(s));
}

const pendientesFiltrados = computed(() => filtrarSolicitudes(pendientes.value));
const activosFiltrados    = computed(() => filtrarSolicitudes(activos.value));
const rechazadosFiltrados = computed(() => filtrarSolicitudes(rechazados.value));
const cerradosFiltrados   = computed(() => filtrarSolicitudes(cerrados.value));
const todosFiltrados = computed(() => filtrarSolicitudes(todos.value).filter((s) => !filtros.estado || s.estado === filtros.estado));

const ajustesFiltrados = computed(() => ajustes.value.filter((a) => {
  if (!coincideTexto(a, ['solicitud_folio', 'colaborador_nombre', 'motivo'])) return false;
  if (filtros.desde && (a.created_at || '').slice(0, 10) < filtros.desde) return false;
  if (filtros.hasta && (a.created_at || '').slice(0, 10) > filtros.hasta) return false;
  return true;
}));

const tabFiltrado = computed(() => ({
  pendientes: pendientesFiltrados.value,
  ajustes: ajustesFiltrados.value,
  activos: activosFiltrados.value,
  rechazados: rechazadosFiltrados.value,
  cerrados: cerradosFiltrados.value,
  todos: todosFiltrados.value,
}));

const resultadosFiltrados = computed(() => (tabFiltrado.value[tab.value] || []).length);

const counts = computed(() => ({
  pendientes: pendientes.value.length,
  ajustes: ajustes.value.length,
  activos: activos.value.length,
  rechazados: rechazados.value.length,
  cerrados: cerrados.value.length,
  todos: todos.value.length,
}));

const modal = reactive({ abierto: false, id: null, folio: '', motivo: '', permiteEdicion: false });
const modalAjuste = reactive({ abierto: false, id: null, motivo: '' });
const cerrarModal = reactive({ abierto: false, id: null, folio: '', total: 0, gastado: 0 });

function pct(s) {
  if (!s.monto_total) return 0;
  return Math.round((Number(s.monto_gastado) / Number(s.monto_total)) * 100);
}

async function cargar() {
  const [a, b, c, d, e, f] = await Promise.all([
    api.get('/viaticos/pendientes'),
    api.get('/viaticos-ajustes/pendientes'),
    api.get('/viaticos/activos'),
    api.get('/viaticos/rechazados'),
    api.get('/viaticos/cerrados'),
    api.get('/viaticos/todos'),
  ]);
  pendientes.value = a.data; ajustes.value = b.data;
  activos.value = c.data; rechazados.value = d.data; cerrados.value = e.data;
  todos.value = f.data;
}

onMounted(cargar);

const toast = useToast();

async function aprobar(id) {
  try {
    await api.post(`/viaticos/${id}/aprobar`);
    toast.success('Solicitud aprobada', 'Pasa a finanzas para el pago.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar', e.message); }
}
function abrirRechazo(s) { Object.assign(modal, { abierto: true, id: s.id, folio: s.folio, motivo: '', permiteEdicion: false }); }
async function rechazar() {
  try {
    await api.post(`/viaticos/${modal.id}/rechazar`, { motivo: modal.motivo, permite_edicion: modal.permiteEdicion });
    toast.success('Solicitud rechazada', `${modal.folio} fue rechazada.`);
    modal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

async function aprobarAjuste(id) {
  try {
    await api.post(`/viaticos-ajustes/${id}/aprobar`);
    toast.success('Ajuste aprobado', 'Pasa a finanzas para el pago.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar el ajuste', e.message); }
}
function abrirRechazoAjuste(a) { Object.assign(modalAjuste, { abierto: true, id: a.id, motivo: '' }); }
async function rechazarAjuste() {
  try {
    await api.post(`/viaticos-ajustes/${modalAjuste.id}/rechazar`, { motivo: modalAjuste.motivo });
    toast.success('Ajuste rechazado');
    modalAjuste.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

function abrirCerrar(s) {
  Object.assign(cerrarModal, { abierto: true, id: s.id, folio: s.folio, total: s.monto_total, gastado: s.monto_gastado });
}
async function confirmarCierre() {
  try {
    await api.post(`/viaticos/${cerrarModal.id}/cerrar`);
    toast.success('Viáticos cerrados', `${cerrarModal.folio} se cerró correctamente.`);
    cerrarModal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo cerrar', e.message); }
}
</script>
