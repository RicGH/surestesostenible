<template>
  <div v-if="!check.cargado" class="card-pad text-ink-500">Cargando...</div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="enviar">
      <div v-if="check.activa && !esAdmin" class="card-pad bg-amber-50/50 border-amber-200">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <Icon name="alert" />
          </div>
          <div class="flex-1">
            <p class="font-semibold text-amber-800 text-sm">Ya tienes un viático abierto</p>
            <p class="text-xs text-ink-700 mt-1">{{ check.motivo }}</p>
            <NuxtLink :to="`/viaticos/${check.activa.id}`" class="text-xs text-brand-600 hover:text-brand-700 font-medium mt-2 inline-flex items-center gap-1">
              <Icon name="eye" size="w-3 h-3" /> Ver solicitud activa
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-if="duplicadoDesde" class="card-pad bg-brand-50/50 border-brand-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 grid place-items-center shrink-0">
            <Icon name="copy" />
          </div>
          <div class="flex-1">
            <p class="font-semibold text-brand-800 text-sm">Duplicado de {{ duplicadoDesde }}</p>
            <p class="text-xs text-ink-600 mt-0.5">Revisa los datos, ajusta lo que necesites y envíalo cuando esté listo.</p>
          </div>
          <button type="button" class="btn-ghost text-xs" @click="limpiarDuplicado">Limpiar</button>
        </div>
      </div>

      <section v-if="esAdmin" class="card-pad bg-violet-50/40 border-violet-200">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center"><Icon name="users" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Crear a nombre de</h3>
            <p class="text-xs text-ink-500">Selecciona el colaborador para esta solicitud</p>
          </div>
        </div>
        <select v-model="colaboradorSeleccionado" class="input" @change="check.activa = null; check.refrescar?.()">
          <option value="">— Selecciona colaborador —</option>
          <option v-for="c in colaboradores" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.email }}</option>
        </select>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="plane" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Información del viaje</h3>
            <p class="text-xs text-ink-500">Destino, fechas y motivo</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Destino</label>
          <input v-model="form.destino" required placeholder="Ciudad, país" class="input" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Fecha inicio</label>
            <DateInput v-model="form.fecha_inicio" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Fecha fin</label>
            <DateInput v-model="form.fecha_fin" :min-date="form.fecha_inicio || null" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Motivo del viaje</label>
          <textarea v-model="form.motivo" required rows="3" placeholder="Describe brevemente el objetivo del viaje" class="input"></textarea>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="document" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Justificante de salida</h3>
            <p class="text-xs text-ink-500">Documento de respaldo para el administrador (opcional)</p>
          </div>
        </div>
        <FileDrop
          v-model="justificante"
          accept=".pdf,image/*"
          icon="upload"
          label="Justificante de salida"
          hint="PDF o imagen · arrastra o haz clic para seleccionar"
        />
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon name="wallet" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Desglose de viáticos</h3>
            <p class="text-xs text-ink-500">Distribuye el monto solicitado por categoría</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoriaInput v-model="form.monto_vuelos"     icon="plane"     label="Vuelos / transporte aéreo" />
          <CategoriaInput v-model="form.monto_hospedaje"  icon="building"  label="Hospedaje" />
          <CategoriaInput v-model="form.monto_alimentos"  icon="receipt"   label="Alimentos" />
          <CategoriaInput v-model="form.monto_transporte" icon="briefcase" label="Transporte local" />
          <CategoriaInput v-model="form.monto_otros"      icon="document"  label="Otros gastos" class="md:col-span-2" />
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-ink-100">
          <span class="text-sm text-ink-600">Total solicitado</span>
          <span class="text-xl font-semibold text-ink-900">${{ total.toFixed(2) }}</span>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Icon name="briefcase" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Contabilidad</h3>
            <p class="text-xs text-ink-500">Asignación contable (opcional)</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Proyecto</label>
            <input v-model="form.proyecto" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Cuenta</label>
            <input v-model="form.cuenta" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Partida</label>
            <input v-model="form.partida" class="input" />
          </div>
        </div>
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div>
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Total solicitado</p>
          <p class="text-3xl font-semibold mt-2 text-ink-900">${{ total.toFixed(2) }}</p>
          <p class="text-xs text-ink-500 mt-1">Suma de todas las categorías</p>
        </div>

        <div class="border-t border-ink-100 pt-4 space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-ink-500">Destino</span>
            <span class="font-medium text-ink-800 truncate ml-2">{{ form.destino || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-ink-500">Duración</span>
            <span class="font-medium text-ink-800">{{ duracionTexto }}</span>
          </div>
        </div>

        <div class="border-t border-ink-100 pt-4 space-y-2 text-sm">
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold mb-2">Desglose</p>
          <ResumenLinea label="Vuelos"     :monto="form.monto_vuelos" :total="total" />
          <ResumenLinea label="Hospedaje"  :monto="form.monto_hospedaje" :total="total" />
          <ResumenLinea label="Alimentos"  :monto="form.monto_alimentos" :total="total" />
          <ResumenLinea label="Transporte" :monto="form.monto_transporte" :total="total" />
          <ResumenLinea label="Otros"      :monto="form.monto_otros" :total="total" />
        </div>

        <div v-if="ok" class="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          <p class="font-semibold">Solicitud enviada</p>
          <p class="text-xs mt-0.5">Folio: <span class="font-mono">{{ ok }}</span></p>
        </div>

        <div class="space-y-2">
          <button class="btn-primary w-full" :disabled="loading" @click.prevent="enviar">
            <Icon name="send" size="w-4 h-4" /> {{ loading ? 'Enviando...' : 'Enviar solicitud' }}
          </button>
          <NuxtLink to="/viaticos/historial" class="btn-secondary w-full">
            <Icon name="history" size="w-4 h-4" /> Ver historial
          </NuxtLink>
        </div>

        <p class="text-xs text-ink-500 leading-relaxed pt-2 border-t border-ink-100">
          Tu solicitud será revisada por el administrador. Recibirás una notificación con la decisión.
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup>
const api = useApi();
const route = useRoute();
const router = useRouter();
const auth = useAuth();
const check = usePuedoCrearViatico();
const esAdmin = computed(() => auth.rol === 'admin');
const colaboradores = ref([]);
const colaboradorSeleccionado = ref('');

const form = reactive({
  destino: '', fecha_inicio: '', fecha_fin: '', motivo: '',
  monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0,
  proyecto: '', cuenta: '', partida: '',
});
const loading = ref(false);
const error = ref('');
const ok = ref('');
const duplicadoDesde = ref('');
const justificante = ref(null);

const VACIO = {
  destino: '', fecha_inicio: '', fecha_fin: '', motivo: '',
  monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0,
  proyecto: '', cuenta: '', partida: '',
};

async function cargarDesde(id) {
  try {
    const sol = await api.get(`/viaticos/${id}`);
    duplicadoDesde.value = sol.folio;
    Object.assign(form, {
      destino: sol.destino || '',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: sol.motivo || '',
      monto_vuelos: Number(sol.monto_vuelos) || 0,
      monto_hospedaje: Number(sol.monto_hospedaje) || 0,
      monto_alimentos: Number(sol.monto_alimentos) || 0,
      monto_transporte: Number(sol.monto_transporte) || 0,
      monto_otros: Number(sol.monto_otros) || 0,
      proyecto: sol.proyecto || '',
      cuenta: sol.cuenta || '',
      partida: sol.partida || '',
    });
  } catch (e) {
    error.value = `No se pudo cargar la solicitud original: ${e.message}`;
  }
}

function limpiarDuplicado() {
  duplicadoDesde.value = '';
  Object.assign(form, VACIO);
  router.replace({ query: {} });
}

onMounted(async () => {
  if (esAdmin.value) {
    try {
      const r = await api.get('/users?rol=colaborador&activo=1');
      colaboradores.value = r.data || [];
    } catch {}
  } else {
    await check.refrescar();
  }
  if (route.query.desde) await cargarDesde(route.query.desde);
});

const total = computed(() =>
  Number(form.monto_vuelos || 0)
  + Number(form.monto_hospedaje || 0)
  + Number(form.monto_alimentos || 0)
  + Number(form.monto_transporte || 0)
  + Number(form.monto_otros || 0)
);

const duracionTexto = computed(() => {
  if (!form.fecha_inicio || !form.fecha_fin) return '—';
  const ini = new Date(form.fecha_inicio);
  const fin = new Date(form.fecha_fin);
  const dias = Math.round((fin - ini) / (1000 * 60 * 60 * 24)) + 1;
  if (isNaN(dias) || dias < 1) return '—';
  return `${dias} día${dias > 1 ? 's' : ''}`;
});

const toast = useToast();

async function enviar() {
  if (total.value <= 0) {
    error.value = 'Debes asignar un monto en al menos una categoría';
    toast.warning('Falta información', error.value);
    return;
  }
  if (esAdmin.value && !colaboradorSeleccionado.value) {
    error.value = 'Selecciona el colaborador para esta solicitud';
    toast.warning('Falta colaborador', error.value);
    return;
  }
  error.value = ''; ok.value = ''; loading.value = true;
  try {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
    if (esAdmin.value) fd.append('colaborador_id', colaboradorSeleccionado.value);
    if (justificante.value) fd.append('justificante', justificante.value);
    const r = await api.upload('/viaticos', fd);
    ok.value = r.folio;
    toast.success('Solicitud enviada', `Folio ${r.folio} · pendiente de aprobación`);
    Object.assign(form, VACIO);
    justificante.value = null;
    duplicadoDesde.value = '';
    if (route.query.desde) router.replace({ query: {} });
    await check.refrescar();
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo enviar', e.message);
    await check.refrescar();
  } finally { loading.value = false; }
}
</script>
