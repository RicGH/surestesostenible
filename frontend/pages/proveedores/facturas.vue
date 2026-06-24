<template>
  <div v-if="cargando" class="card-pad text-ink-500">Cargando...</div>

  <div v-else-if="esAdmin" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="subir">
      <section class="card-pad bg-violet-50/40 border-violet-200">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center"><Icon name="building" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Subir a nombre de</h3>
            <p class="text-xs text-ink-500">Selecciona el proveedor para esta factura</p>
          </div>
        </div>
        <select v-model="proveedorSeleccionado" class="input">
          <option value="">— Selecciona proveedor —</option>
          <option v-for="p in proveedoresAprobados" :key="p.id" :value="p.id">
            {{ p.razon_social }} · {{ p.rfc }}
          </option>
        </select>
      </section>

      <section class="card-pad space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="fileText" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Archivos de la factura</h3>
            <p class="text-xs text-ink-500">Sube ambos archivos: PDF y XML CFDI</p>
          </div>
        </div>

        <FileDrop v-model="pdf" accept=".pdf" icon="fileText" label="Archivo PDF" hint="Representación impresa de la factura" />
        <FileDrop v-model="xml" accept=".xml" icon="document" label="Archivo XML (CFDI)" hint="El XML será leído automáticamente" @update:modelValue="previsualizar" />
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div v-if="preview && !ok">
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Datos detectados</p>
          <p class="text-3xl font-semibold mt-2 text-ink-900">${{ Number(preview.monto).toFixed(2) }}</p>
          <p class="text-xs text-ink-500 mt-1">{{ preview.moneda }} · {{ preview.fecha_emision }}</p>
          <div class="border-t border-ink-100 pt-4 mt-4 space-y-2 text-sm">
            <div><p class="text-xs text-ink-500">Emisor</p><p class="font-medium text-ink-800">{{ preview.nombre_emisor }}</p></div>
            <div><p class="text-xs text-ink-500">RFC</p><p class="font-mono">{{ preview.rfc_emisor }}</p></div>
          </div>
        </div>

        <div v-if="ok" class="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
          <div class="flex items-center gap-2 text-emerald-700 font-semibold"><Icon name="check" /> Factura enviada</div>
          <p class="text-xs text-emerald-700/80 mt-1">Folio: <span class="font-mono">{{ ok }}</span></p>
        </div>

        <button class="btn-primary w-full" :disabled="loading || !preview || !pdf || !proveedorSeleccionado" @click.prevent="subir">
          <Icon name="upload" size="w-4 h-4" /> {{ loading ? 'Enviando...' : 'Enviar factura' }}
        </button>
      </div>
    </aside>
  </div>

  <div v-else-if="!registro" class="card-pad space-y-3 max-w-2xl">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
        <Icon name="document" />
      </div>
      <div>
        <h3 class="font-semibold text-ink-900">Completa tu registro de proveedor</h3>
        <p class="text-sm text-ink-600 mt-1">Antes de subir facturas, necesitas registrar tus datos fiscales y bancarios.</p>
      </div>
    </div>
    <NuxtLink to="/proveedores/registro" class="btn-primary inline-flex">Ir a mi registro</NuxtLink>
  </div>

  <div v-else-if="registro.estado === 'pendiente'" class="card-pad space-y-3 max-w-2xl">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
        <Icon name="history" />
      </div>
      <div>
        <h3 class="font-semibold text-ink-900">Registro en revisión</h3>
        <p class="text-sm text-ink-600 mt-1">El administrador está revisando tu información. Recibirás una notificación cuando sea aprobado.</p>
      </div>
    </div>
  </div>

  <div v-else-if="registro.estado === 'rechazado'" class="card-pad space-y-3 max-w-2xl border-red-200">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-red-50 text-red-600 grid place-items-center shrink-0">
        <Icon name="alert" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-ink-900">Registro rechazado</h3>
        <p class="text-sm text-red-700 mt-1">{{ registro.motivo_rechazo }}</p>
      </div>
    </div>
    <NuxtLink to="/proveedores/registro" class="btn-primary inline-flex">Revisar mi registro</NuxtLink>
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="subir">
      <section class="card-pad space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="fileText" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Archivos de la factura</h3>
            <p class="text-xs text-ink-500">Sube ambos archivos: PDF y XML CFDI</p>
          </div>
        </div>

        <FileDrop
          v-model="pdf"
          accept=".pdf"
          icon="fileText"
          label="Archivo PDF"
          hint="Representación impresa de la factura"
        />

        <FileDrop
          v-model="xml"
          accept=".xml"
          icon="document"
          label="Archivo XML (CFDI)"
          hint="El XML será leído automáticamente para extraer los datos fiscales"
          @update:modelValue="previsualizar"
        />
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
            <select v-model="contab.proyecto" class="input">
              <option value="">Selecciona una opción</option>
              <option v-for="o in catalogos.proyecto" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Cuenta</label>
            <select v-model="contab.cuenta" class="input">
              <option value="">Selecciona una opción</option>
              <option v-for="o in catalogos.cuenta" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Partida</label>
            <select v-model="contab.partida" class="input">
              <option value="">Selecciona una opción</option>
              <option v-for="o in catalogos.partida" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Objetivo estratégico</label>
            <select v-model="contab.objetivo_estrategico" class="input">
              <option value="">Selecciona una opción</option>
              <option v-for="o in catalogos.objetivo_estrategico" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Resultado</label>
            <input v-model="contab.resultado" placeholder="Resultado" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Concepto</label>
            <input v-model="contab.concepto" placeholder="Concepto de la factura" class="input" />
          </div>
        </div>
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div v-if="!preview && !ok">
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Estado</p>
          <p class="text-lg font-semibold mt-2 text-ink-900">Sin enviar</p>
          <p class="text-xs text-ink-500 mt-1">Sube los dos archivos para continuar</p>

          <div class="border-t border-ink-100 pt-4 mt-4 space-y-3 text-sm">
            <div class="flex items-center gap-2">
              <Icon name="check" size="w-4 h-4" :class="pdf ? 'text-emerald-500' : 'text-ink-300'" />
              <span :class="pdf ? 'text-ink-700' : 'text-ink-400'">PDF cargado</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="check" size="w-4 h-4" :class="xml ? 'text-emerald-500' : 'text-ink-300'" />
              <span :class="xml ? 'text-ink-700' : 'text-ink-400'">XML cargado</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="check" size="w-4 h-4" :class="preview ? 'text-emerald-500' : 'text-ink-300'" />
              <span :class="preview ? 'text-ink-700' : 'text-ink-400'">XML validado</span>
            </div>
          </div>
        </div>

        <div v-if="preview && !ok">
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Datos detectados del XML</p>
          <p class="text-3xl font-semibold mt-2 text-ink-900">${{ Number(preview.monto).toFixed(2) }}</p>
          <p class="text-xs text-ink-500 mt-1">{{ preview.moneda }} · {{ preview.fecha_emision }}</p>

          <div class="border-t border-ink-100 pt-4 mt-4 space-y-3 text-sm">
            <div>
              <p class="text-xs text-ink-500">Emisor</p>
              <p class="font-medium text-ink-800 truncate">{{ preview.nombre_emisor }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-500">RFC</p>
              <p class="font-mono text-ink-800">{{ preview.rfc_emisor }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-500">UUID</p>
              <p class="font-mono text-xs text-ink-700 break-all">{{ preview.uuid || '—' }}</p>
            </div>
          </div>
        </div>

        <div v-if="ok" class="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
          <div class="flex items-center gap-2 text-emerald-700 font-semibold">
            <Icon name="check" /> Factura enviada
          </div>
          <p class="text-xs text-emerald-700/80 mt-1">Folio: <span class="font-mono">{{ ok }}</span></p>
          <p class="text-xs text-ink-600 mt-2">Será revisada por el administrador. Te notificaremos la decisión.</p>
        </div>

        <button class="btn-primary w-full" :disabled="loading || !preview || !pdf" @click.prevent="subir">
          <Icon name="upload" size="w-4 h-4" /> {{ loading ? 'Enviando...' : 'Enviar factura' }}
        </button>

        <NuxtLink to="/proveedores/historial" class="btn-secondary w-full">
          <Icon name="history" size="w-4 h-4" /> Ver historial
        </NuxtLink>

        <p class="text-xs text-ink-500 leading-relaxed pt-2 border-t border-ink-100">
          Asegúrate de que el XML corresponda al PDF. El RFC del emisor debe coincidir con el de tu registro.
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup>
const api = useApi();
const toast = useToast();
const auth = useAuth();
const esAdmin = computed(() => auth.rol === 'admin');
const cargando = ref(true);
const registro = ref(null);

const pdf = ref(null);
const xml = ref(null);
const contab = reactive({ proyecto: '', cuenta: '', partida: '', objetivo_estrategico: '', resultado: '', concepto: '' });
const catalogos = reactive({ proyecto: [], cuenta: [], partida: [], objetivo_estrategico: [] });
const preview = ref(null);
const loading = ref(false);
const error = ref('');
const ok = ref('');
const proveedoresAprobados = ref([]);
const proveedorSeleccionado = ref('');

onMounted(async () => {
  try {
    const tiposCatalogo = ['proyecto', 'cuenta', 'partida', 'objetivo_estrategico'];
    const [, ...catResults] = await Promise.allSettled([
      esAdmin.value
        ? api.get('/proveedores?activo=1').then((r) => { proveedoresAprobados.value = (r.data || []).filter((p) => p.estado === 'aprobado'); })
        : api.get('/proveedores/mio').then((r) => { registro.value = r.data; }),
      ...tiposCatalogo.map((t) =>
        api.get(`/catalogos?tipo=${t}`).then((r) => { catalogos[t] = (r.data || []).map((c) => c.nombre); })
      ),
    ]);
  } finally { cargando.value = false; }
});

async function previsualizar(file) {
  preview.value = null; error.value = ''; ok.value = '';
  if (!file) return;
  try {
    const fd = new FormData();
    fd.append('xml', file);
    preview.value = await api.upload('/facturas/preview-xml', fd);
    toast.info('XML validado', `${preview.value.nombre_emisor} · $${Number(preview.value.monto).toFixed(2)}`);
  } catch (e) {
    error.value = e.message;
    toast.error('XML inválido', e.message);
  }
}

async function subir() {
  if (!pdf.value || !xml.value) return;
  if (esAdmin.value && !proveedorSeleccionado.value) {
    toast.warning('Falta proveedor', 'Selecciona el proveedor para esta factura.');
    return;
  }
  loading.value = true; error.value = '';
  try {
    const fd = new FormData();
    fd.append('pdf', pdf.value);
    fd.append('xml', xml.value);
    if (esAdmin.value) fd.append('proveedor_id', String(proveedorSeleccionado.value));
    if (contab.proyecto)             fd.append('proyecto',             contab.proyecto);
    if (contab.cuenta)               fd.append('cuenta',               contab.cuenta);
    if (contab.partida)              fd.append('partida',              contab.partida);
    if (contab.objetivo_estrategico) fd.append('objetivo_estrategico', contab.objetivo_estrategico);
    if (contab.resultado)            fd.append('resultado',            contab.resultado);
    if (contab.concepto)             fd.append('concepto',             contab.concepto);
    const r = await api.upload('/facturas', fd);
    ok.value = r.folio;
    toast.success('Factura enviada', `Folio ${r.folio} · en revisión`);
    pdf.value = null; xml.value = null; preview.value = null;
    Object.assign(contab, { proyecto: '', cuenta: '', partida: '', objetivo_estrategico: '', resultado: '', concepto: '' });
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo enviar la factura', e.message);
  }
  finally { loading.value = false; }
}
</script>
