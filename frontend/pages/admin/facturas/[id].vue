<template>
  <div v-if="cargando" class="card-pad text-ink-500">Cargando...</div>

  <div v-else-if="!factura" class="card-pad text-center py-12">
    <p class="text-ink-600">{{ errorCarga || 'Factura no encontrada' }}</p>
    <NuxtLink to="/admin/facturas" class="btn-secondary mt-4 inline-flex">Volver a facturas</NuxtLink>
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="guardar">
      <section class="card-pad space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="fileText" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Archivos de la factura</h3>
            <p class="text-xs text-ink-500">PDF y XML CFDI cargados por el proveedor</p>
          </div>
        </div>

        <div
          v-for="a in archivos"
          :key="a.tipo"
          class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 flex items-center gap-3"
        >
          <div :class="['w-10 h-10 rounded-lg grid place-items-center shrink-0', a.clase]">
            <Icon :name="a.icono" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink-800">{{ a.titulo }}</p>
            <p class="text-xs text-emerald-700 truncate">
              <Icon name="check" size="w-3 h-3" class="inline -mt-0.5" /> Cargado · {{ factura.folio }}.{{ a.tipo }}
            </p>
          </div>
          <button type="button" class="btn-secondary text-sm" @click="verArchivo(a)">
            <Icon name="eye" size="w-4 h-4" /> Ver
          </button>
          <button type="button" class="btn-secondary text-sm" @click="api.download(`/facturas/${factura.id}/archivo/${a.tipo}`, `${factura.folio}.${a.tipo}`)">
            <Icon name="download" size="w-4 h-4" />
          </button>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Icon name="briefcase" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Contabilidad</h3>
            <p class="text-xs text-ink-500">Asignación contable de la factura</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="c in CAMPOS" :key="c.key">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">{{ c.label }}</label>
            <select v-model="form[c.key]" class="input">
              <option value="">Selecciona una opción</option>
              <!-- Valor guardado que ya no está en el catálogo (p. ej. capturado a mano antes) -->
              <option v-if="form[c.key] && !catalogos[c.key].includes(form[c.key])" :value="form[c.key]">{{ form[c.key] }}</option>
              <option v-for="o in catalogos[c.key]" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>

          <!-- Concepto: texto libre, no sale de catálogo -->
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Concepto</label>
            <input
              v-model="form.concepto"
              type="text"
              maxlength="255"
              placeholder="Escribe el concepto de la factura"
              class="input"
            />
          </div>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="shield" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Autorización</h3>
            <p class="text-xs text-ink-500">Personas que solicitan y autorizan el pago (aparecen en el oficio de pago)</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Autorizado por</label>
            <select v-model="form.autoriza_nombre" class="input">
              <option value="">Selecciona quien autoriza</option>
              <option v-if="form.autoriza_nombre && !autorizadores.some((a) => a.nombre === form.autoriza_nombre)" :value="form.autoriza_nombre">{{ form.autoriza_nombre }}</option>
              <option v-for="a in autorizadores" :key="a.id" :value="a.nombre">{{ a.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Solicitado por</label>
            <select v-model="form.solicita_nombre" class="input">
              <option value="">Selecciona quien solicita</option>
              <!-- Valor guardado que ya no está en la lista de usuarios (p. ej. usuario inactivo) -->
              <option v-if="form.solicita_nombre && !usuarios.some((u) => u.nombre === form.solicita_nombre)" :value="form.solicita_nombre">{{ form.solicita_nombre }}</option>
              <option v-for="u in usuarios" :key="u.id" :value="u.nombre">{{ u.nombre }}</option>
            </select>
          </div>
        </div>
      </section>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div>
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Factura</p>
          <p class="font-mono text-sm text-ink-800 mt-1">{{ factura.folio }}</p>
          <p class="text-3xl font-semibold mt-2 text-ink-900">${{ Number(factura.monto).toFixed(2) }}</p>
          <p class="text-xs text-ink-500 mt-1">{{ factura.moneda }} · {{ factura.fecha_emision }}</p>
          <div class="mt-3"><EstadoBadge :estado="factura.estado" /></div>
        </div>

        <div class="border-t border-ink-100 pt-4 space-y-2 text-sm">
          <div><p class="text-xs text-ink-500">Proveedor</p><p class="font-medium text-ink-800">{{ factura.razon_social || factura.nombre_emisor }}</p></div>
          <div><p class="text-xs text-ink-500">RFC</p><p class="font-mono">{{ factura.rfc || factura.rfc_emisor }}</p></div>
          <div><p class="text-xs text-ink-500">UUID</p><p class="font-mono text-xs break-all">{{ factura.uuid_cfdi }}</p></div>
        </div>

        <button class="btn-primary w-full" :disabled="guardando" @click.prevent="guardar">
          <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
        <button class="btn-secondary w-full" @click.prevent="verOficio">
          <Icon name="fileText" size="w-4 h-4" /> Ver oficio de pago
        </button>
        <NuxtLink to="/admin/facturas" class="btn-secondary w-full justify-center">
          Volver a facturas
        </NuxtLink>
      </div>
    </aside>

    <FileViewer v-if="visor" v-bind="visor" @close="visor = null" />

    <Modal v-if="oficioModal.abierto" title="Oficio de pago a proveedores" size="sm" @close="oficioModal.abierto = false">
      <div class="py-4 text-center">
        <template v-if="oficioModal.estado === 'generando'">
          <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
          <p class="mt-4 font-semibold text-ink-800">Generando documento…</p>
          <p class="text-sm text-ink-500 mt-1">Preparando el oficio de <span class="font-mono">{{ factura.folio }}</span>. Esto puede tardar unos segundos.</p>
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
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const route = useRoute();

const CAMPOS = [
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'partida', label: 'Partida' },
  { key: 'objetivo_estrategico', label: 'Objetivo estratégico' },
  { key: 'resultado', label: 'Resultado' },
];

const archivos = [
  { tipo: 'pdf', titulo: 'Archivo PDF', icono: 'fileText', clase: 'bg-red-50 text-red-500' },
  { tipo: 'xml', titulo: 'Archivo XML (CFDI)', icono: 'document', clase: 'bg-brand-50 text-brand-600' },
];

const cargando = ref(true);
const errorCarga = ref('');
const guardando = ref(false);
const oficioModal = reactive({ abierto: false, estado: '', url: null, error: '' });
const factura = ref(null);
const visor = ref(null);
const autorizadores = ref([]);
// Todos los usuarios del sistema, sin importar el rol (selector "Solicitado por")
const usuarios = ref([]);
const catalogos = reactive(Object.fromEntries(CAMPOS.map((c) => [c.key, []])));
const form = reactive({ ...Object.fromEntries(CAMPOS.map((c) => [c.key, ''])), concepto: '', autoriza_nombre: '', solicita_nombre: '' });

onMounted(async () => {
  try {
    const id = Number(route.params.id);
    const [f] = await Promise.all([
      api.get(`/facturas/${id}`),
      api.get('/users/autorizadores').then((r) => { autorizadores.value = r.data || []; }).catch(() => {}),
      api.get('/users/nombres').then((r) => { usuarios.value = r.data || []; }).catch(() => {}),
      ...CAMPOS.map((c) =>
        api.get(`/catalogos?tipo=${c.key}`).then((r) => { catalogos[c.key] = (r.data || []).map((x) => x.nombre); }).catch(() => {})
      ),
    ]);
    factura.value = f;
    CAMPOS.forEach((c) => { form[c.key] = f[c.key] || ''; });
    form.concepto = f.concepto || '';
    form.autoriza_nombre = f.autoriza_nombre || '';
    form.solicita_nombre = f.solicita_nombre || '';
  } catch (e) {
    errorCarga.value = e.message;
  } finally {
    cargando.value = false;
  }
});

function verArchivo(a) {
  visor.value = {
    path: `/facturas/${factura.value.id}/archivo/${a.tipo}`,
    title: a.titulo,
    subtitle: `${factura.value.folio} · ${factura.value.razon_social || factura.value.nombre_emisor || ''}`,
    downloadName: `${factura.value.folio}.${a.tipo}`,
  };
}

async function guardar() {
  guardando.value = true;
  try {
    await api.put(`/facturas/${factura.value.id}/contabilidad`, { ...form });
    toast.success('Factura actualizada', `${factura.value.folio} guardada correctamente.`);
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
  } finally {
    guardando.value = false;
  }
}

// Mismo flujo que la bandeja: modal "Generando documento…" y al terminar se abre el PDF
async function verOficio() {
  if (oficioModal.abierto && oficioModal.estado === 'generando') return;
  Object.assign(oficioModal, { abierto: true, estado: 'generando', url: null, error: '' });
  try {
    // El oficio se genera con lo guardado: guardar primero lo que esté en pantalla
    await api.put(`/facturas/${factura.value.id}/contabilidad`, { ...form });
    const { url } = await api.viewBlob(`/facturas/${factura.value.id}/oficio`);
    oficioModal.url = url;
    oficioModal.estado = 'listo';
    const win = window.open(url, '_blank');
    if (win) oficioModal.abierto = false;
  } catch (e) {
    oficioModal.estado = 'error';
    oficioModal.error = e.message;
  }
}
</script>
