<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/plantillas" class="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
          <Icon name="arrow-left" size="w-4 h-4" /> Volver
        </NuxtLink>
        <div v-if="plantilla">
          <input
            v-model="plantilla.nombre"
            class="text-base font-semibold text-ink-900 bg-transparent border-0 border-b border-transparent hover:border-ink-300 focus:border-brand-500 focus:outline-none px-1 -mx-1"
          />
          <p class="text-xs text-ink-500">Plantilla · Editada {{ plantilla.updated_at }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary" :disabled="guardando" @click="guardar">
          <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
        <button class="btn-primary" :disabled="guardando" @click="usarComoDocumento">
          <Icon name="send" size="w-4 h-4" /> Usar para nuevo documento
        </button>
      </div>
    </div>

    <div v-if="cargando" class="card-pad text-center text-ink-500">Cargando...</div>

    <div v-else-if="plantilla" class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div>
        <DocumentoEditorHTML ref="editorRef" v-model="contenidoHtml" @insertar-campo="abrirAgregarCampo" />
      </div>

      <div class="space-y-3">
        <div class="card-pad space-y-3">
          <h3 class="font-semibold text-ink-900 text-sm">Datos por defecto</h3>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Descripción</label>
            <textarea v-model="plantilla.descripcion" rows="2" class="input text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Asunto del correo</label>
            <input v-model="plantilla.asunto_correo" maxlength="200" class="input text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Mensaje del correo</label>
            <textarea v-model="plantilla.mensaje_correo" rows="3" maxlength="2000" class="input text-sm" />
          </div>
        </div>

        <div class="card-pad space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink-900 text-sm">Campos dinámicos</h3>
            <button class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="abrirAgregarCampo">
              <Icon name="plus" size="w-3 h-3" /> Agregar
            </button>
          </div>
          <p v-if="!campos.length" class="text-xs text-ink-400">Los campos se llenarán al crear cada documento desde esta plantilla.</p>
          <div v-else class="space-y-1.5">
            <div v-for="(c, i) in campos" :key="i" class="p-2 rounded-lg border border-amber-200 bg-amber-50/50">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-amber-900 truncate">{{ c.label }}</p>
                  <p class="text-xs text-amber-700/80 truncate">{{ c.nombre }} · {{ c.tipo }}{{ c.requerido ? ' · requerido' : '' }}</p>
                </div>
                <button class="text-xs text-brand-600 hover:underline shrink-0" @click="insertarCampo(c)">Insertar</button>
                <button class="text-ink-400 hover:text-red-600 shrink-0" @click="quitarCampo(i)">
                  <Icon name="x" size="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="modalCampo.abierto" title="Nuevo campo dinámico" @close="modalCampo.abierto = false">
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Etiqueta visible</label>
          <input v-model="modalCampo.label" required class="input text-sm" placeholder="Ej: Nombre del cliente" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Nombre interno</label>
          <input v-model="modalCampo.nombre" required class="input text-sm font-mono" @input="modalCampo.nombre = modalCampo.nombre.replace(/[^a-z0-9_]/gi,'_').toLowerCase()" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Tipo</label>
          <select v-model="modalCampo.tipo" class="input text-sm">
            <option value="texto">Texto</option>
            <option value="numero">Número</option>
            <option value="fecha">Fecha</option>
            <option value="email">Correo</option>
            <option value="telefono">Teléfono</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="modalCampo.requerido" type="checkbox" /> Es requerido
        </label>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalCampo.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="!modalCampo.label || !modalCampo.nombre" @click="agregarCampo">Agregar e insertar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const route = useRoute();
const router = useRouter();
const api = useApi();
const toast = useToast();

const plantillaId = computed(() => Number(route.params.id));
const plantilla = ref(null);
const contenidoHtml = ref('');
const campos = ref([]);
const cargando = ref(true);
const guardando = ref(false);
const editorRef = ref(null);
const modalCampo = reactive({ abierto: false, label: '', nombre: '', tipo: 'texto', requerido: true });

async function cargar() {
  cargando.value = true;
  try {
    const r = await api.get(`/plantillas/${plantillaId.value}`);
    plantilla.value = r;
    contenidoHtml.value = r.contenido_html || '<p></p>';
    campos.value = r.campos_json || [];
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
    router.push('/admin/plantillas');
  } finally {
    cargando.value = false;
  }
}

async function guardar() {
  guardando.value = true;
  try {
    await api.put(`/plantillas/${plantillaId.value}`, {
      nombre: plantilla.value.nombre,
      descripcion: plantilla.value.descripcion || null,
      contenido_html: contenidoHtml.value,
      campos_json: campos.value,
      asunto_correo: plantilla.value.asunto_correo || null,
      mensaje_correo: plantilla.value.mensaje_correo || null,
    });
    toast.success('Plantilla guardada');
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
  } finally {
    guardando.value = false;
  }
}

async function usarComoDocumento() {
  await guardar();
  router.push({ path: '/admin/documentos/nuevo', query: { plantilla: plantillaId.value } });
}

function abrirAgregarCampo() {
  Object.assign(modalCampo, { abierto: true, label: '', nombre: '', tipo: 'texto', requerido: true });
}

function agregarCampo() {
  const c = { ...modalCampo };
  delete c.abierto;
  if (campos.value.some((x) => x.nombre === c.nombre)) { toast.warning('Ya existe ese nombre'); return; }
  campos.value.push(c);
  insertarCampo(c);
  modalCampo.abierto = false;
}

function insertarCampo(c) {
  editorRef.value?.insertarCampo({ nombre: c.nombre, label: c.label, tipo: c.tipo });
}

function quitarCampo(idx) {
  const c = campos.value[idx];
  contenidoHtml.value = (contenidoHtml.value || '').replace(
    new RegExp(`<span[^>]*data-campo="${c.nombre}"[^>]*>[^<]*</span>`, 'g'), ''
  );
  campos.value.splice(idx, 1);
}

onMounted(cargar);
</script>
