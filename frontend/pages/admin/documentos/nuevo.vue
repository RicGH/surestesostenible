<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <NuxtLink to="/admin/documentos" class="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
      <Icon name="arrow-left" size="w-4 h-4" /> Volver a documentos
    </NuxtLink>

    <div class="card-pad space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-ink-900">Nuevo documento para firma</h2>
        <p class="text-sm text-ink-500 mt-1">Importa un PDF, crea uno desde cero o úsalo desde una plantilla.</p>
      </div>

      <div class="flex border-b border-ink-200">
        <button
          v-for="t in tabs"
          :key="t.id"
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800',
          ]"
          @click="tab = t.id"
        >
          <Icon :name="t.icon" size="w-4 h-4" /> {{ t.label }}
        </button>
      </div>

      <div v-if="tab === 'importar'" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre del documento</label>
          <input v-model="formImp.nombre" required maxlength="200" class="input" placeholder="Ej: Contrato de servicios Cliente XYZ" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Descripción (opcional)</label>
          <textarea v-model="formImp.descripcion" rows="2" class="input" placeholder="Notas internas sobre este documento" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Archivo PDF</label>
          <FileDrop v-model="formImp.archivo" accept="application/pdf,.pdf" label="Selecciona el PDF a firmar" hint="Solo PDF, máximo 25 MB" icon="document" />
        </div>
        <p v-if="errorImp" class="text-sm text-red-600">{{ errorImp }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <NuxtLink to="/admin/documentos" class="btn-secondary">Cancelar</NuxtLink>
          <button class="btn-primary" :disabled="!puedeImportar || cargando" @click="subirImportado">
            {{ cargando ? 'Subiendo...' : 'Continuar a editor' }}
          </button>
        </div>
      </div>

      <div v-else-if="tab === 'word'" class="space-y-5">
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
          <Icon name="alert" size="w-4 h-4" class="shrink-0 mt-0.5" />
          <p>Importa un archivo <strong>.docx</strong> o <strong>.doc</strong> (Word). Se convertirá automáticamente a HTML editable y podrás editarlo como si fuera un documento creado desde cero. Para mejores resultados usa .docx (Word moderno).</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre del documento</label>
          <input v-model="formDocx.nombre" required maxlength="200" class="input" placeholder="Ej: Contrato cliente XYZ" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Descripción (opcional)</label>
          <textarea v-model="formDocx.descripcion" rows="2" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Archivo Word</label>
          <FileDrop v-model="formDocx.archivo" accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" label="Selecciona el archivo Word (.doc o .docx)" hint=".doc o .docx, máximo 25 MB" icon="fileText" />
        </div>
        <p v-if="errorDocx" class="text-sm text-red-600">{{ errorDocx }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <NuxtLink to="/admin/documentos" class="btn-secondary">Cancelar</NuxtLink>
          <button class="btn-primary" :disabled="!puedeDocx || cargando" @click="importarDocx">
            {{ cargando ? 'Convirtiendo...' : 'Convertir y abrir editor' }}
          </button>
        </div>
      </div>

      <div v-else-if="tab === 'crear'" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre del documento</label>
          <input v-model="formNew.nombre" required maxlength="200" class="input" placeholder="Ej: Carta de no adeudo" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Descripción (opcional)</label>
          <textarea v-model="formNew.descripcion" rows="2" class="input" />
        </div>
        <p v-if="errorNew" class="text-sm text-red-600">{{ errorNew }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <NuxtLink to="/admin/documentos" class="btn-secondary">Cancelar</NuxtLink>
          <button class="btn-primary" :disabled="!puedeCrear || cargando" @click="crearDesdeCero">
            {{ cargando ? 'Creando...' : 'Abrir editor' }}
          </button>
        </div>
      </div>

      <div v-else-if="tab === 'plantilla'" class="space-y-5">
        <div class="relative">
          <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input v-model="busquedaPlant" placeholder="Buscar plantillas..." class="input pl-9" />
        </div>
        <p v-if="!plantillasFiltradas.length" class="text-center text-ink-400 text-sm py-8">
          <span v-if="!plantillas.length">No tienes plantillas guardadas. <NuxtLink to="/admin/plantillas/nuevo" class="text-brand-600 hover:underline">Crear primera plantilla</NuxtLink></span>
          <span v-else>Sin resultados</span>
        </p>
        <div v-else class="space-y-2 max-h-96 overflow-auto">
          <button
            v-for="p in plantillasFiltradas"
            :key="p.id"
            class="w-full text-left p-3 rounded-lg border border-ink-200 hover:border-brand-400 hover:bg-brand-50/40 transition-all"
            :disabled="cargando"
            @click="usarPlantilla(p)"
          >
            <p class="font-medium text-ink-800">{{ p.nombre }}</p>
            <p v-if="p.descripcion" class="text-xs text-ink-500 mt-1 line-clamp-2">{{ p.descripcion }}</p>
            <p class="text-xs text-ink-400 mt-1">Actualizada {{ p.updated_at }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const router = useRouter();

const tabs = [
  { id: 'importar', label: 'Importar PDF', icon: 'upload' },
  { id: 'word', label: 'Importar Word', icon: 'fileText' },
  { id: 'crear', label: 'Crear desde cero', icon: 'edit' },
  { id: 'plantilla', label: 'Usar plantilla', icon: 'document' },
];
const tab = ref('importar');
const cargando = ref(false);

const formImp = reactive({ nombre: '', descripcion: '', archivo: null });
const errorImp = ref('');
const puedeImportar = computed(() => formImp.nombre.trim().length >= 2 && formImp.archivo);

const formDocx = reactive({ nombre: '', descripcion: '', archivo: null });
const errorDocx = ref('');
const puedeDocx = computed(() => formDocx.nombre.trim().length >= 2 && formDocx.archivo);

const formNew = reactive({ nombre: '', descripcion: '' });
const errorNew = ref('');
const puedeCrear = computed(() => formNew.nombre.trim().length >= 2);

const plantillas = ref([]);
const busquedaPlant = ref('');
const plantillasFiltradas = computed(() => {
  const q = busquedaPlant.value.trim().toLowerCase();
  return plantillas.value.filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
});

watch(tab, async (t) => {
  if (t === 'plantilla' && !plantillas.value.length) {
    try {
      const r = await api.get('/plantillas');
      plantillas.value = r.data || [];
    } catch (e) { console.warn(e); }
  }
});

async function subirImportado() {
  if (!puedeImportar.value) return;
  cargando.value = true; errorImp.value = '';
  try {
    const fd = new FormData();
    fd.append('nombre', formImp.nombre.trim());
    if (formImp.descripcion) fd.append('descripcion', formImp.descripcion.trim());
    fd.append('archivo', formImp.archivo);
    const r = await api.upload('/documentos', fd);
    toast.success('Documento subido', formImp.nombre);
    router.push(`/admin/documentos/${r.id}/editor`);
  } catch (e) {
    errorImp.value = e.message;
    toast.error('No se pudo subir', e.message);
  } finally {
    cargando.value = false;
  }
}

async function importarDocx() {
  if (!puedeDocx.value) return;
  cargando.value = true; errorDocx.value = '';
  try {
    const fd = new FormData();
    fd.append('nombre', formDocx.nombre.trim());
    if (formDocx.descripcion) fd.append('descripcion', formDocx.descripcion.trim());
    fd.append('archivo', formDocx.archivo);
    const r = await api.upload('/documentos/importar-docx', fd);
    toast.success('Word convertido', formDocx.nombre);
    router.push(`/admin/documentos/${r.id}/editor-html`);
  } catch (e) {
    errorDocx.value = e.message;
    toast.error('No se pudo importar', e.message);
  } finally {
    cargando.value = false;
  }
}

async function crearDesdeCero() {
  if (!puedeCrear.value) return;
  cargando.value = true; errorNew.value = '';
  try {
    const r = await api.post('/documentos/crear-html', {
      nombre: formNew.nombre.trim(),
      descripcion: formNew.descripcion.trim() || null,
      contenido_html: '<h1>' + formNew.nombre.trim() + '</h1><p></p>',
      campos: [],
    });
    toast.success('Documento creado', formNew.nombre);
    router.push(`/admin/documentos/${r.id}/editor-html`);
  } catch (e) {
    errorNew.value = e.message;
    toast.error('No se pudo crear', e.message);
  } finally {
    cargando.value = false;
  }
}

async function usarPlantilla(p) {
  cargando.value = true;
  try {
    const detalle = await api.get(`/plantillas/${p.id}`);
    const r = await api.post('/documentos/crear-html', {
      nombre: detalle.nombre,
      descripcion: detalle.descripcion,
      contenido_html: detalle.contenido_html,
      plantilla_id: detalle.id,
      campos: detalle.campos_json || [],
    });
    toast.success('Documento creado desde plantilla', detalle.nombre);
    router.push(`/admin/documentos/${r.id}/editor-html`);
  } catch (e) {
    toast.error('No se pudo crear', e.message);
  } finally {
    cargando.value = false;
  }
}
</script>
