<template>
  <div v-if="!check.cargado && !modoEdicion" class="card-pad text-ink-500">Cargando...</div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="enviar">
      <div
        v-if="!modoEdicion && !esAdmin && check.enUso > 0"
        :class="['card-pad', check.lleno ? 'bg-amber-50/50 border-amber-200' : 'bg-brand-50/50 border-brand-200']"
      >
        <div class="flex items-start gap-3">
          <div
            :class="['w-10 h-10 rounded-lg grid place-items-center shrink-0',
                     check.lleno ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700']"
          >
            <Icon name="alert" />
          </div>
          <div class="flex-1">
            <p :class="['font-semibold text-sm', check.lleno ? 'text-amber-800' : 'text-brand-800']">
              {{ check.lleno ? `Llegaste al máximo de ${check.limite} viáticos abiertos` : `Viáticos abiertos: ${check.enUso} de ${check.limite}` }}
            </p>
            <p class="text-xs text-ink-700 mt-1">{{ check.motivo }}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              <NuxtLink
                v-for="v in check.abiertos"
                :key="v.id"
                :to="`/viaticos/${v.id}`"
                class="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
              >
                <Icon name="eye" size="w-3 h-3" /> {{ v.folio }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-if="modoEdicion" class="card-pad bg-amber-50/50 border-amber-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <Icon name="edit" />
          </div>
          <div class="flex-1">
            <p class="font-semibold text-amber-800 text-sm">Editando viático <span class="font-mono">{{ editandoFolio }}</span></p>
            <p class="text-xs text-ink-600 mt-0.5">Modifica los datos y guarda los cambios.</p>
          </div>
          <button type="button" class="btn-ghost text-xs" @click="cancelarEdicion">Cancelar</button>
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
            <h3 class="font-semibold text-ink-900">{{ modoEdicion ? 'Colaborador' : 'Crear a nombre de' }}</h3>
            <p class="text-xs text-ink-500">{{ modoEdicion ? 'Titular de esta solicitud' : 'Selecciona el colaborador para esta solicitud' }}</p>
          </div>
        </div>
        <select v-model="colaboradorSeleccionado" :disabled="modoEdicion" class="input disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed" @change="check.activa = null; check.refrescar?.()">
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

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Autorizado por</label>
            <select v-model="form.autoriza_nombre" class="input">
              <option value="">Selecciona quien autoriza</option>
              <option v-for="a in autorizadores" :key="a.id" :value="a.nombre">{{ a.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Recibe el viático</label>
            <input v-model="form.recibe_nombre" disabled placeholder="Nombre de quien recibe" class="input disabled:bg-ink-50 disabled:text-ink-400 disabled:cursor-not-allowed" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Selector de cuenta guardada -->
          <div v-if="cuentasBancarias.length && !cambiarBancarios" class="col-span-2">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Cuenta bancaria</label>
            <select v-model="cuentaSeleccionada" class="input" @change="seleccionarCuenta">
              <option value="">— Selecciona una cuenta —</option>
              <option v-for="c in cuentasBancarias" :key="c.id" :value="String(c.id)">
                {{ c.clabe_bancaria }}{{ c.banco ? ' — ' + c.banco : '' }}
              </option>
            </select>
          </div>

          <!-- Inputs manuales cuando cambiarBancarios o sin cuentas guardadas -->
          <template v-else>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">CLABE bancaria</label>
              <input v-model="form.clabe_bancaria" inputmode="numeric" maxlength="18" placeholder="18 dígitos" class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Banco</label>
              <select v-model="form.banco" class="input">
                <option value="">Selecciona banco</option>
                <option v-if="form.banco && !catalogos.banco.includes(form.banco)" :value="form.banco">{{ form.banco }}</option>
                <option v-for="b in catalogos.banco" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
          </template>
        </div>

        <div class="flex items-center justify-between mt-1">
          <p class="text-xs text-ink-500 flex items-center gap-1.5">
            <Icon name="sparkles" size="w-3 h-3" class="text-brand-500" />
            <span v-if="!cuentasBancarias.length">Sin cuentas guardadas — los datos se guardarán al enviar</span>
            <span v-else-if="cambiarBancarios">Datos nuevos — se guardarán al enviar</span>
            <span v-else>{{ cuentasBancarias.length }} cuenta{{ cuentasBancarias.length > 1 ? 's' : '' }} guardada{{ cuentasBancarias.length > 1 ? 's' : '' }}</span>
          </p>
          <label v-if="cuentasBancarias.length" class="flex items-center gap-2 cursor-pointer select-none">
            <span class="text-xs text-ink-600">{{ cambiarBancarios ? 'Usar cuenta guardada' : 'Usar datos diferentes' }}</span>
            <button
              type="button"
              :class="['relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                       cambiarBancarios ? 'bg-brand-600' : 'bg-ink-200']"
              @click="toggleCambiarBancarios"
            >
              <span
                :class="['inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                         cambiarBancarios ? 'translate-x-4' : 'translate-x-0.5']"
              ></span>
            </button>
          </label>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="document" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Justificante de salida</h3>
            <p class="text-xs text-ink-500">Documentos de respaldo para el administrador (opcional · puedes subir varios)</p>
          </div>
        </div>
        <MultiFileDrop
          v-model="justificantes"
          :existentes="justificantesExistentes"
          accept=".pdf,image/*"
          icon="upload"
          label="Justificantes de salida"
          hint="PDF o imagen · arrastra o haz clic · puedes seleccionar varios"
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
          <CategoriaInput v-model="form.monto_vuelos"     icon="plane"     label="Vuelos / transporte aéreo" hint="Boletos de avión y cargos relacionados con vuelos (equipaje, cambios)." />
          <CategoriaInput v-model="form.monto_hospedaje"  icon="building"  label="Hospedaje" hint="Hotel u otro alojamiento durante el viaje, incluyendo impuestos." />
          <CategoriaInput v-model="form.monto_alimentos"  icon="receipt"   label="Alimentos" hint="Comidas y bebidas durante el viaje (desayuno, comida, cena)." />
          <CategoriaInput v-model="form.monto_transporte" icon="briefcase" label="Transporte local" hint="Transporte terrestre en el destino: taxis, autobús, gasolina, casetas, estacionamiento." />
          <CategoriaInput v-model="form.monto_otros"      icon="document"  label="Otros gastos" class="md:col-span-2" hint="Gastos necesarios no contemplados en las demás categorías." />
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Proyecto</label>
            <select v-model="form.proyecto" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.proyecto && !catalogos.proyecto.includes(form.proyecto)" :value="form.proyecto">{{ form.proyecto }}</option>
              <option v-for="o in catalogos.proyecto" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Cuenta</label>
            <select v-model="form.cuenta" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.cuenta && !catalogos.cuenta.includes(form.cuenta)" :value="form.cuenta">{{ form.cuenta }}</option>
              <option v-for="o in catalogos.cuenta" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Partida</label>
            <select v-model="form.partida" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.partida && !catalogos.partida.includes(form.partida)" :value="form.partida">{{ form.partida }}</option>
              <option v-for="o in catalogos.partida" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Objetivo estratégico</label>
            <select v-model="form.objetivo_estrategico" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.objetivo_estrategico && !catalogos.objetivo_estrategico.includes(form.objetivo_estrategico)" :value="form.objetivo_estrategico">{{ form.objetivo_estrategico }}</option>
              <option v-for="o in catalogos.objetivo_estrategico" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Resultado</label>
            <select v-model="form.resultado" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.resultado && !catalogos.resultado.includes(form.resultado)" :value="form.resultado">{{ form.resultado }}</option>
              <option v-for="o in catalogos.resultado" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Donante</label>
            <select v-model="form.donante" class="input">
              <option value="">Selecciona una opción</option>
              <option v-if="form.donante && !catalogos.donante.includes(form.donante)" :value="form.donante">{{ form.donante }}</option>
              <option v-for="o in catalogos.donante" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
        </div>
        <p v-if="sinCatalogos" class="text-xs text-ink-400">
          Los valores se administran en <NuxtLink to="/admin/catalogos" class="text-brand-600 hover:underline">Catálogos</NuxtLink>.
        </p>
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
            <Icon :name="modoEdicion ? 'check' : 'send'" size="w-4 h-4" />
            {{ loading ? (modoEdicion ? 'Guardando...' : 'Enviando...') : (modoEdicion ? 'Guardar cambios' : 'Enviar solicitud') }}
          </button>
          <button v-if="modoEdicion" type="button" class="btn-secondary w-full" @click="cancelarEdicion">
            <Icon name="x" size="w-4 h-4" /> Cancelar
          </button>
          <NuxtLink v-else to="/viaticos/historial" class="btn-secondary w-full">
            <Icon name="history" size="w-4 h-4" /> Ver historial
          </NuxtLink>
        </div>

        <p v-if="!modoEdicion" class="text-xs text-ink-500 leading-relaxed pt-2 border-t border-ink-100">
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
const autorizadores = ref([]);
const colaboradorSeleccionado = ref('');

// "Recibe el viático" = el colaborador que recibe. Para el colaborador es su propio
// nombre; para el admin, el del colaborador seleccionado. Se autollenará mientras el
// usuario no escriba algo distinto a mano.
const nombreColaborador = computed(() => {
  if (esAdmin.value) {
    const c = colaboradores.value.find((x) => x.id === Number(colaboradorSeleccionado.value));
    return c?.nombre || '';
  }
  return auth.user?.nombre || '';
});
const recibeAutollenado = ref(true);

// Modo edición
const editandoId = ref(null);
const editandoFolio = ref('');
const modoEdicion = computed(() => !!editandoId.value);
const justificantesExistentes = ref([]); // archivos ya guardados en el servidor

// Cuentas bancarias guardadas del usuario/colaborador
const cuentasBancarias = ref([]);
const cuentaSeleccionada = ref('');
const cambiarBancarios = ref(false);

async function cargarCuentasBancarias(userId = null) {
  try {
    const url = userId ? `/users/${userId}/cuentas-bancarias` : '/auth/cuentas-bancarias';
    const r = await api.get(url);
    cuentasBancarias.value = r.data || [];
    cambiarBancarios.value = false;
    if (cuentasBancarias.value.length > 0) {
      cuentaSeleccionada.value = String(cuentasBancarias.value[0].id);
      form.clabe_bancaria = cuentasBancarias.value[0].clabe_bancaria;
      form.banco = cuentasBancarias.value[0].banco;
    } else {
      cuentaSeleccionada.value = '';
      form.clabe_bancaria = '';
      form.banco = '';
    }
  } catch {
    cuentasBancarias.value = [];
  }
}

const catalogos = reactive({ proyecto: [], cuenta: [], partida: [], objetivo_estrategico: [], resultado: [], donante: [], banco: [] });
const sinCatalogos = computed(() =>
  !catalogos.proyecto.length && !catalogos.cuenta.length && !catalogos.partida.length &&
  !catalogos.objetivo_estrategico.length && !catalogos.resultado.length && !catalogos.donante.length
);

async function cargarCatalogos() {
  const tipos = ['proyecto', 'cuenta', 'partida', 'objetivo_estrategico', 'resultado', 'donante', 'banco'];
  await Promise.all(tipos.map(async (t) => {
    try {
      const r = await api.get(`/catalogos?tipo=${t}`);
      catalogos[t] = (r.data || []).map((c) => c.nombre);
    } catch { catalogos[t] = []; }
  }));
}

const form = reactive({
  destino: '', fecha_inicio: '', fecha_fin: '', motivo: '',
  autoriza_nombre: '', recibe_nombre: '', clabe_bancaria: '', banco: '',
  monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0,
  proyecto: '', cuenta: '', partida: '', objetivo_estrategico: '', resultado: '', donante: '',
});
const loading = ref(false);
const error = ref('');
const ok = ref('');
const duplicadoDesde = ref('');
const justificantes = ref([]);

const VACIO = {
  destino: '', fecha_inicio: '', fecha_fin: '', motivo: '',
  autoriza_nombre: '', recibe_nombre: '', clabe_bancaria: '', banco: '',
  monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0,
  proyecto: '', cuenta: '', partida: '', objetivo_estrategico: '', resultado: '', donante: '',
};

async function cargarParaEdicion(id) {
  try {
    const sol = await api.get(`/viaticos/${id}`);
    editandoId.value = id;
    editandoFolio.value = sol.folio || '';
    if (esAdmin.value && sol.colaborador_id) {
      colaboradorSeleccionado.value = sol.colaborador_id;
      await cargarCuentasBancarias(sol.colaborador_id);
    } else {
      await cargarCuentasBancarias();
    }

    // Cargar justificantes existentes con preview para imágenes
    const jList = sol.justificantes || [];
    justificantesExistentes.value = jList.map((j) => {
      const nombre = j.nombre_original || j.archivo?.split('/').pop() || 'archivo';
      const esImagen = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(nombre);
      return { id: j.id, nombre, esImagen, blobUrl: null };
    });
    // Fetch async de thumbnails autenticados
    jList.forEach(async (j, idx) => {
      const entry = justificantesExistentes.value[idx];
      if (!entry) return;
      try {
        const { url } = await api.viewBlob(`/viaticos/${id}/justificantes/${j.id}`);
        entry.blobUrl = url;
      } catch {}
    });

    Object.assign(form, {
      destino: sol.destino || '',
      fecha_inicio: (sol.fecha_inicio || '').slice(0, 10),
      fecha_fin: (sol.fecha_fin || '').slice(0, 10),
      motivo: sol.motivo || '',
      autoriza_nombre: sol.autoriza_nombre || '',
      recibe_nombre: sol.recibe_nombre || '',
      clabe_bancaria: sol.clabe_bancaria || '',
      banco: sol.banco || '',
      monto_vuelos: Number(sol.monto_vuelos) || 0,
      monto_hospedaje: Number(sol.monto_hospedaje) || 0,
      monto_alimentos: Number(sol.monto_alimentos) || 0,
      monto_transporte: Number(sol.monto_transporte) || 0,
      monto_otros: Number(sol.monto_otros) || 0,
      proyecto: sol.proyecto || '',
      cuenta: sol.cuenta || '',
      partida: sol.partida || '',
      objetivo_estrategico: sol.objetivo_estrategico || '',
      resultado: sol.resultado || '',
      donante: sol.donante || '',
    });
    // Mostrar inputs manuales con los valores guardados
    cambiarBancarios.value = true;
    recibeAutollenado.value = false;
  } catch (e) {
    error.value = `No se pudo cargar el viático: ${e.message}`;
  }
}

function cancelarEdicion() {
  const from = route.query.from;
  if (from === 'admin') router.push('/admin/viaticos');
  else router.push('/viaticos/historial');
}

async function cargarDesde(id) {
  try {
    const sol = await api.get(`/viaticos/${id}`);
    duplicadoDesde.value = sol.folio;
    // Al duplicar se usan los datos bancarios de la solicitud original.
    cambiarBancarios.value = true;
    Object.assign(form, {
      destino: sol.destino || '',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: sol.motivo || '',
      autoriza_nombre: sol.autoriza_nombre || '',
      clabe_bancaria: sol.clabe_bancaria || '',
      banco: sol.banco || '',
      monto_vuelos: Number(sol.monto_vuelos) || 0,
      monto_hospedaje: Number(sol.monto_hospedaje) || 0,
      monto_alimentos: Number(sol.monto_alimentos) || 0,
      monto_transporte: Number(sol.monto_transporte) || 0,
      monto_otros: Number(sol.monto_otros) || 0,
      proyecto: sol.proyecto || '',
      cuenta: sol.cuenta || '',
      partida: sol.partida || '',
      objetivo_estrategico: sol.objetivo_estrategico || '',
      resultado: sol.resultado || '',
      donante: sol.donante || '',
    });
  } catch (e) {
    error.value = `No se pudo cargar la solicitud original: ${e.message}`;
  }
}

function limpiarDuplicado() {
  duplicadoDesde.value = '';
  Object.assign(form, VACIO);
  recibeAutollenado.value = true;
  form.recibe_nombre = nombreColaborador.value;
  cargarCuentasBancarias(esAdmin.value && colaboradorSeleccionado.value ? Number(colaboradorSeleccionado.value) : null);
  router.replace({ query: {} });
}

onMounted(async () => {
  cargarCatalogos();
  try { const r = await api.get('/users/autorizadores'); autorizadores.value = r.data || []; } catch {}
  if (esAdmin.value) {
    try {
      const r = await api.get('/users?rol=colaborador&activo=1');
      colaboradores.value = r.data || [];
    } catch {}
  }
  if (route.query.editar) {
    await cargarParaEdicion(Number(route.query.editar));
  } else {
    await check.refrescar();
    await cargarCuentasBancarias();
    if (route.query.desde) await cargarDesde(route.query.desde);
  }
});

watch(nombreColaborador, (nombre) => {
  if (recibeAutollenado.value) form.recibe_nombre = nombre;
}, { immediate: true });

watch(colaboradorSeleccionado, async (id) => {
  await cargarCuentasBancarias(id ? Number(id) : null);
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

function seleccionarCuenta() {
  const cuenta = cuentasBancarias.value.find((c) => String(c.id) === cuentaSeleccionada.value);
  if (cuenta) {
    form.clabe_bancaria = cuenta.clabe_bancaria;
    form.banco = cuenta.banco;
  }
}

function toggleCambiarBancarios() {
  cambiarBancarios.value = !cambiarBancarios.value;
  if (cambiarBancarios.value) {
    form.clabe_bancaria = '';
    form.banco = '';
  } else {
    const cuenta = cuentasBancarias.value.find((c) => String(c.id) === cuentaSeleccionada.value)
      || cuentasBancarias.value[0];
    if (cuenta) {
      cuentaSeleccionada.value = String(cuenta.id);
      form.clabe_bancaria = cuenta.clabe_bancaria;
      form.banco = cuenta.banco;
    }
  }
}

async function enviar() {
  if (total.value <= 0) {
    error.value = 'Debes asignar un monto en al menos una categoría';
    toast.warning('Falta información', error.value);
    return;
  }
  if (!modoEdicion.value && esAdmin.value && !colaboradorSeleccionado.value) {
    error.value = 'Selecciona el colaborador para esta solicitud';
    toast.warning('Falta colaborador', error.value);
    return;
  }
  error.value = ''; ok.value = ''; loading.value = true;
  try {
    // Modo edición: PUT con JSON + subir justificantes nuevos
    if (modoEdicion.value) {
      await api.put(`/viaticos/${editandoId.value}`, { ...form });
      if (justificantes.value.length > 0) {
        const fd = new FormData();
        justificantes.value.forEach((f) => fd.append('justificantes', f));
        await api.upload(`/viaticos/${editandoId.value}/justificantes`, fd);
      }
      // Guardar cuenta bancaria nueva si ingresó datos diferentes
      if (cambiarBancarios.value && form.clabe_bancaria) {
        const existe = cuentasBancarias.value.some((c) => c.clabe_bancaria === form.clabe_bancaria);
        if (!existe) {
          try {
            const uid = esAdmin.value && colaboradorSeleccionado.value ? Number(colaboradorSeleccionado.value) : null;
            const url = uid ? `/users/${uid}/cuentas-bancarias` : '/auth/cuentas-bancarias';
            await api.post(url, { clabe_bancaria: form.clabe_bancaria, banco: form.banco });
          } catch {}
        }
      }
      toast.success('Viático actualizado', `${editandoFolio.value} actualizado correctamente.`);
      cancelarEdicion();
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
    if (esAdmin.value) fd.append('colaborador_id', colaboradorSeleccionado.value);
    justificantes.value.forEach((f) => fd.append('justificantes', f));
    const r = await api.upload('/viaticos', fd);
    ok.value = r.folio;
    toast.success('Solicitud enviada', `Folio ${r.folio} · pendiente de aprobación`);

    // Guardar cuenta bancaria si es nueva
    if (cambiarBancarios.value && form.clabe_bancaria) {
      const existe = cuentasBancarias.value.some((c) => c.clabe_bancaria === form.clabe_bancaria);
      if (!existe) {
        try {
          const userId = esAdmin.value && colaboradorSeleccionado.value ? Number(colaboradorSeleccionado.value) : null;
          const url = userId ? `/users/${userId}/cuentas-bancarias` : '/auth/cuentas-bancarias';
          await api.post(url, { clabe_bancaria: form.clabe_bancaria, banco: form.banco });
        } catch {}
      }
    }

    Object.assign(form, VACIO);
    recibeAutollenado.value = true;
    form.recibe_nombre = nombreColaborador.value;
    justificantes.value = [];
    duplicadoDesde.value = '';
    if (route.query.desde) router.replace({ query: {} });
    await cargarCuentasBancarias(esAdmin.value && colaboradorSeleccionado.value ? Number(colaboradorSeleccionado.value) : null);
    await check.refrescar();
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo enviar', e.message);
    await check.refrescar();
  } finally { loading.value = false; }
}
</script>
