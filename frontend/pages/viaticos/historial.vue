<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-ink-500">{{ solicitudes.length }} solicitud(es)</p>
      <button class="btn-primary" @click="$router.push('/viaticos/nueva')">
        <Icon name="plus" size="w-4 h-4" /> Solicitar viáticos
      </button>
    </div>

    <div v-if="check.cargado && check.enUso > 0" class="card-pad border-amber-200 bg-amber-50/40">
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
          <Icon name="alert" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-amber-800">
            {{ check.lleno ? `Llegaste al máximo de ${check.limite} viáticos abiertos` : `Tienes ${check.enUso} de ${check.limite} viáticos abiertos en uso` }}
          </h3>
          <p class="text-sm text-ink-700 mt-0.5">{{ check.motivo }}</p>
          <button type="button" class="text-sm text-brand-600 hover:text-brand-700 font-medium mt-2 inline-flex items-center gap-1" @click="filtros.soloActiva = true">
            <Icon name="eye" size="w-4 h-4" /> Ver mis viáticos activos
          </button>
        </div>
      </div>
    </div>

    <div class="card-pad space-y-3">
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <input v-model="filtros.folio" placeholder="Folio" class="input" />
        <input v-model="filtros.destino" placeholder="Destino" class="input" />
        <select v-model="filtros.estado" class="input">
          <option value="">Estado</option>
          <option>pendiente</option>
          <option>aprobado</option>
          <option>pagado</option>
          <option>rechazado</option>
          <option>en_proceso</option>
          <option>cerrado</option>
        </select>
        <input v-model="filtros.proyecto" placeholder="Proyecto" class="input" />
        <DateInput v-model="filtros.desde" placeholder="Desde" />
        <DateInput v-model="filtros.hasta" placeholder="Hasta" :min-date="filtros.desde || null" />
      </div>
      <label class="flex items-center gap-2 text-sm text-ink-700 cursor-pointer w-fit">
        <input v-model="filtros.soloActiva" type="checkbox" class="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
        <span>Solo viáticos activos</span>
        <span class="text-xs text-ink-400">(con factura cargada · en proceso)</span>
      </label>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Folio</th><th>Destino</th><th>Fechas</th><th>Total</th><th>Estado</th><th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in solicitudesFiltradas" :key="s.id" :class="esActiva(s) ? 'bg-emerald-50/50 hover:bg-emerald-50' : ''">
            <td class="font-mono text-xs">
              {{ s.folio }}
              <span v-if="esActiva(s)" class="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold uppercase tracking-wide">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activa
              </span>
            </td>
            <td class="font-medium text-ink-800">{{ s.destino }}</td>
            <td class="text-ink-600">{{ s.fecha_inicio }} → {{ s.fecha_fin }}</td>
            <td>${{ Number(s.monto_total).toFixed(2) }}</td>
            <td><EstadoBadge :estado="s.estado" /></td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=historial`)" />
                <IconButton icon="copy" tooltip="Duplicar viaje" @click="duplicar(s.id)" />
                <IconButton v-if="s.estado === 'pendiente'" icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=historial`)" />
                <IconButton v-if="s.estado === 'rechazado' && s.permite_edicion" icon="edit" tooltip="Corregir solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=historial`)" />
              </div>
            </td>
          </tr>
          <tr v-if="!solicitudesFiltradas.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin resultados</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const router = useRouter();
const solicitudes = ref([]);
const filtros = reactive({ folio: '', destino: '', estado: '', proyecto: '', desde: '', hasta: '', soloActiva: false });
const check = usePuedoCrearViatico();

const SERVER_KEYS = ['folio', 'destino', 'estado', 'proyecto', 'desde', 'hasta'];

async function cargar() {
  const params = SERVER_KEYS.reduce((acc, k) => {
    if (filtros[k]) acc[k] = filtros[k];
    return acc;
  }, {});
  const qs = new URLSearchParams(params).toString();
  const r = await api.get(`/viaticos/mias${qs ? '?' + qs : ''}`);
  solicitudes.value = r.data;
}
watch(() => SERVER_KEYS.map((k) => filtros[k]), cargar);

onMounted(() => {
  cargar();
  check.refrescar();
});

// Un viático está "activo" cuando ya tiene factura(s) cargada(s), es decir en_proceso.
function esActiva(s) {
  return s.estado === 'en_proceso';
}

const solicitudesFiltradas = computed(() => {
  if (!filtros.soloActiva) return solicitudes.value;
  return solicitudes.value.filter(esActiva);
});

function duplicar(id) {
  router.push(`/viaticos/nueva?desde=${id}`);
}
</script>
