<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Plantillas de contrato</h1>
        <p class="text-sm text-ink-500 mt-0.5">Gestiona los contratos .docx que se envían a los proveedores.</p>
      </div>
      <button class="btn-primary" @click="subirModal.abierto = true">
        <Icon name="upload" size="w-4 h-4" /> Subir plantilla
      </button>
    </div>

    <div v-if="cargando" class="card-pad text-center text-ink-500">Cargando...</div>

    <div v-else-if="!plantillas.length" class="card-pad text-center text-ink-400 py-12">
      <Icon name="document" size="w-10 h-10" class="mx-auto mb-3 opacity-30" />
      <p class="font-medium">Sin plantillas</p>
      <p class="text-sm mt-1">Sube un archivo .docx con etiquetas «CAMPO» para empezar.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="p in plantillas"
        :key="p.id"
        class="card-pad space-y-3 flex flex-col"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-ink-900 truncate">{{ p.nombre }}</p>
            <p v-if="p.descripcion" class="text-xs text-ink-500 mt-0.5 line-clamp-2">{{ p.descripcion }}</p>
          </div>
          <button class="text-ink-400 hover:text-red-600 shrink-0 p-1" title="Eliminar plantilla" @click="confirmarEliminar(p)">
            <Icon name="trash" size="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1">
          <p class="text-xs font-medium text-ink-600 mb-2">Etiquetas detectadas</p>
          <div v-if="p.etiquetas_json?.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[11px] text-ink-500">
            <span class="inline-flex items-center gap-1">
              <span class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-300"></span>
              Verde: se toma automáticamente del proveedor
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="inline-block w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300"></span>
              Amarillo: se llena manualmente al enviar
            </span>
          </div>
          <hr class="border-ink-100 mb-2" />
          <div v-if="!p.etiquetas_json?.length" class="text-xs text-ink-400 italic">Sin etiquetas «»</div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="e in p.etiquetas_json"
              :key="e.etiqueta"
              :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                       e.mapa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                               : 'bg-amber-50 text-amber-700 border border-amber-200']"
              :title="e.mapa ? `Auto: campo «${e.mapa}» del proveedor` : 'Requiere llenado manual'"
            >
              «{{ e.etiqueta }}»
              <Icon :name="e.mapa ? 'check' : 'edit'" size="w-3 h-3" />
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-ink-100">
          <div class="flex items-center justify-between text-xs text-ink-400">
            <span>{{ p.creado_por_nombre }}</span>
            <span>{{ formatDate(p.created_at) }}</span>
          </div>
          <div class="mt-2 text-xs text-ink-400 flex gap-3">
            <span class="text-emerald-600 font-medium">
              {{ p.etiquetas_json?.filter((e) => e.mapa).length || 0 }} auto
            </span>
            <span class="text-amber-600 font-medium">
              {{ p.etiquetas_json?.filter((e) => !e.mapa).length || 0 }} manual
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal subir plantilla -->
    <Modal v-if="subirModal.abierto" title="Subir plantilla de contrato" @close="cerrarSubir">
      <div class="space-y-4">
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          El archivo .docx debe tener etiquetas entre «guillemetes» como <strong>«RFC»</strong>, <strong>«RAZÓN_SOCIAL»</strong>, <strong>«DOMICILIO»</strong>, etc.
          Estas se reemplazarán automáticamente con los datos del proveedor al generar el contrato.
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre de la plantilla</label>
          <input v-model="subirModal.form.nombre" required maxlength="200" class="input" placeholder="Ej: Contrato de servicios profesionales" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Descripción (opcional)</label>
          <textarea v-model="subirModal.form.descripcion" rows="2" class="input" placeholder="Para qué tipo de proveedor aplica este contrato" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Archivo Word (.docx)</label>
          <FileDrop
            v-model="subirModal.form.archivo"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            label="Selecciona el contrato (.doc o .docx)"
            hint=".doc o .docx con etiquetas «CAMPO», máximo 25 MB"
            icon="fileText"
          />
        </div>
        <p v-if="subirModal.error" class="text-sm text-red-600">{{ subirModal.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cerrarSubir">Cancelar</button>
        <button class="btn-primary" :disabled="!puedeSub || subirModal.guardando" @click="subirPlantilla">
          {{ subirModal.guardando ? 'Subiendo...' : 'Subir plantilla' }}
        </button>
      </template>
    </Modal>

    <!-- Modal confirmar eliminar -->
    <Modal v-if="eliminarModal.abierto" title="Eliminar plantilla" @close="eliminarModal.abierto = false">
      <p class="text-sm text-ink-700">
        ¿Estás seguro de eliminar <strong>{{ eliminarModal.plantilla?.nombre }}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <button class="btn-secondary" @click="eliminarModal.abierto = false">Cancelar</button>
        <button class="btn-danger" :disabled="eliminarModal.eliminando" @click="eliminarPlantilla">
          {{ eliminarModal.eliminando ? 'Eliminando...' : 'Eliminar' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();

const cargando = ref(true);
const plantillas = ref([]);

const subirModal = reactive({
  abierto: false, guardando: false, error: '',
  form: { nombre: '', descripcion: '', archivo: null },
});
const eliminarModal = reactive({ abierto: false, eliminando: false, plantilla: null });

const puedeSub = computed(() =>
  subirModal.form.nombre.trim().length >= 2 && subirModal.form.archivo
);

async function cargar() {
  cargando.value = true;
  try {
    const r = await api.get('/contratos/plantillas');
    plantillas.value = r.data || [];
  } catch (e) { toast.error('No se pudieron cargar las plantillas', e.message); }
  finally { cargando.value = false; }
}
onMounted(cargar);

function cerrarSubir() {
  subirModal.abierto = false;
  Object.assign(subirModal.form, { nombre: '', descripcion: '', archivo: null });
  subirModal.error = '';
}

async function subirPlantilla() {
  if (!puedeSub.value) return;
  subirModal.guardando = true; subirModal.error = '';
  try {
    const fd = new FormData();
    fd.append('nombre', subirModal.form.nombre.trim());
    if (subirModal.form.descripcion) fd.append('descripcion', subirModal.form.descripcion.trim());
    fd.append('archivo', subirModal.form.archivo);
    await api.upload('/contratos/plantillas', fd);
    toast.success('Plantilla subida', subirModal.form.nombre);
    cerrarSubir();
    cargar();
  } catch (e) {
    subirModal.error = e.message;
    toast.error('No se pudo subir', e.message);
  } finally { subirModal.guardando = false; }
}

function confirmarEliminar(p) {
  Object.assign(eliminarModal, { abierto: true, eliminando: false, plantilla: p });
}

async function eliminarPlantilla() {
  eliminarModal.eliminando = true;
  try {
    await api.del(`/contratos/plantillas/${eliminarModal.plantilla.id}`);
    toast.success('Plantilla eliminada');
    eliminarModal.abierto = false;
    cargar();
  } catch (e) { toast.error('No se pudo eliminar', e.message); }
  finally { eliminarModal.eliminando = false; }
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
</script>
