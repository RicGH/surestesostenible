<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/documentos" class="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
          <Icon name="arrow-left" size="w-4 h-4" /> Volver
        </NuxtLink>
        <div v-if="doc">
          <h2 class="text-base font-semibold text-ink-900">{{ doc.nombre }}</h2>
          <div class="flex items-center gap-2 text-xs text-ink-500">
            <EstadoBadge :estado="doc.estado" />
            <span v-if="doc.envelope_id">Envelope: {{ doc.envelope_id }}</span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button v-if="puedeEditar" class="btn-secondary" :disabled="guardando" @click="guardar()">
          <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando...' : 'Guardar borrador' }}
        </button>
        <button v-if="puedeEditar" class="btn-primary" :disabled="!puedeEnviar || enviando" @click="abrirEnviar">
          <Icon name="send" size="w-4 h-4" /> {{ enviando ? 'Enviando...' : 'Enviar a DocuSign' }}
        </button>
        <button v-if="doc?.estado === 'firmado'" class="btn-primary" @click="descargarFirmado">
          <Icon name="download" size="w-4 h-4" /> Descargar firmado
        </button>
      </div>
    </div>

    <div v-if="cargando" class="card-pad text-center text-ink-500">Cargando documento...</div>

    <div v-else-if="doc" class="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4">
      <!-- SIDEBAR IZQUIERDO -->
      <div class="space-y-3">
        <div class="card-pad space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink-900 text-sm">Firmantes</h3>
            <button v-if="puedeEditar" class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="abrirAgregarFirmante">
              <Icon name="plus" size="w-3 h-3" /> Agregar
            </button>
          </div>
          <p v-if="!firmantes.length" class="text-xs text-ink-400">Agrega firmantes para colocar sus tags.</p>
          <div v-else class="space-y-2">
            <div
              v-for="(f, i) in firmantes"
              :key="f.id || `tmp-${i}`"
              :class="['p-2 rounded-lg border cursor-pointer transition-all', firmanteSeleccionado === f.id && modoInsercion === 'tag' ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-400']"
              @click="seleccionarFirmante(f)"
            >
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full shrink-0" :style="{ background: f.color }" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-ink-900 truncate">{{ f.nombre }}</p>
                  <p class="text-xs text-ink-500 truncate">{{ f.email }}</p>
                </div>
                <button v-if="puedeEditar" class="text-ink-400 hover:text-red-600 shrink-0" @click.stop="quitarFirmante(i)">
                  <Icon name="x" size="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="puedeEditar" class="card-pad space-y-2">
          <h4 class="text-xs font-semibold text-ink-700 uppercase tracking-wide">Modo de inserción</h4>
          <div class="grid grid-cols-2 gap-1">
            <button :class="['btn-secondary !py-1 text-xs', modoInsercion === 'tag' ? '!bg-ink-900 !text-white' : '']" @click="modoInsercion = 'tag'">Tag</button>
            <button :class="['btn-secondary !py-1 text-xs', modoInsercion === 'texto' ? '!bg-ink-900 !text-white' : '']" @click="modoInsercion = 'texto'">Texto</button>
            <!-- <button :class="['btn-secondary !py-1 text-xs', modoInsercion === 'campo' ? '!bg-ink-900 !text-white' : '']" @click="modoInsercion = 'campo'">Campo</button> -->
          </div>
          <div v-if="modoInsercion === 'tag'" class="space-y-1">
            <p v-if="!firmanteSeleccionado" class="text-xs text-ink-500">Selecciona un firmante arriba.</p>
            <select v-else v-model="tipoTagActivo" class="input text-sm">
              <option value="firma">Firma</option>
              <option value="iniciales">Iniciales</option>
              <option value="fecha">Fecha</option>
            </select>
          </div>
          <div v-else-if="modoInsercion === 'texto'">
            <p class="text-xs text-ink-500">Haz click sobre el PDF para añadir un bloque de texto.</p>
          </div>
          <!-- <div v-else-if="modoInsercion === 'campo'">
            <p v-if="!campoSeleccionado" class="text-xs text-ink-500">Selecciona o crea un campo abajo.</p>
            <div v-else class="text-xs text-ink-700 p-1.5 rounded bg-amber-50 border border-amber-200">
              <strong>{{ campoSeleccionado.label }}</strong> · {{ campoSeleccionado.nombre }}
            </div>
          </div> -->
        </div>

        <!-- <div class="card-pad space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink-900 text-sm">Campos dinámicos</h3>
            <button v-if="puedeEditar" class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="abrirAgregarCampo">
              <Icon name="plus" size="w-3 h-3" /> Crear
            </button>
          </div>
          <p v-if="!campos.length" class="text-xs text-ink-400">Crea campos y luego haz click en el PDF en modo "Campo" para colocarlos.</p>
          <div v-else class="space-y-1.5">
            <div
              v-for="(c, i) in campos"
              :key="c.id || `tmp-c-${i}`"
              :class="['p-2 rounded-lg border cursor-pointer transition-all',
                       campoSeleccionado?.nombre === c.nombre && modoInsercion === 'campo'
                         ? 'border-amber-600 bg-amber-100/60'
                         : 'border-amber-200 bg-amber-50/50 hover:border-amber-400']"
              @click="seleccionarCampo(c)"
            >
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-amber-900 truncate">{{ c.label }}</p>
                  <p class="text-xs text-amber-700/80 truncate">{{ c.nombre }} · {{ c.tipo }}{{ c.requerido ? ' · req' : '' }}</p>
                </div>
                <button v-if="puedeEditar" class="text-ink-400 hover:text-red-600 shrink-0" @click.stop="quitarCampo(i)">
                  <Icon name="x" size="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div> -->
      </div>

      <!-- VISOR PDF -->
      <div class="card overflow-hidden">
        <div class="px-4 py-2 border-b border-ink-100 flex items-center gap-3 text-sm">
          <button class="text-ink-500 hover:text-ink-900" :disabled="escala <= 0.5" @click="cambiarEscala(-0.25)"><Icon name="minus" size="w-4 h-4" /></button>
          <span class="text-ink-700 text-xs">{{ Math.round(escala * 100) }}%</span>
          <button class="text-ink-500 hover:text-ink-900" :disabled="escala >= 2.5" @click="cambiarEscala(0.25)"><Icon name="plus" size="w-4 h-4" /></button>
          <span class="text-ink-400 text-xs ml-auto" v-if="numPaginas">{{ numPaginas }} página(s)</span>
        </div>
        <div ref="visorRef" class="overflow-auto bg-ink-100 p-4 flex flex-col items-center gap-4" style="max-height: calc(100vh - 220px)">
          <div v-for="p in paginasArr" :key="`page-${p}`" class="relative shadow-lg bg-white">
            <canvas
              :ref="(el) => setCanvasRef(p, el)"
              :class="['block', cursorPagina]"
              @click="(e) => onClickPagina(e, p)"
            />
            <!-- TAGS DOCUSIGN -->
            <div
              v-for="t in tagsEnPagina(p)"
              :key="`tag-${t._key}`"
              class="absolute group flex items-center justify-center text-xs font-medium select-none"
              :class="[puedeEditar ? 'cursor-move' : '']"
              :style="estiloTag(t)"
              @mousedown="(e) => iniciarArrastre(e, t, 'tag')"
            >
              <span class="text-white drop-shadow pointer-events-none">{{ tipoTagLabel(t.tipo) }}</span>
              <button v-if="puedeEditar" class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-ink-300 text-ink-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 grid place-items-center opacity-0 group-hover:opacity-100" @click.stop="eliminarTag(t)">
                <Icon name="x" size="w-3 h-3" />
              </button>
            </div>
            <!-- ANOTACIONES (texto + campo) -->
            <div
              v-for="a in anotacionesEnPagina(p)"
              :key="`anot-${a._key}`"
              class="absolute group select-text"
              :class="[puedeEditar ? 'cursor-move' : '']"
              :style="estiloAnotacion(a)"
              @mousedown="(e) => iniciarArrastre(e, a, 'anotacion')"
            >
              <div v-if="a.tipo === 'texto'"
                   class="w-full h-full px-1 py-0.5"
                   :style="estiloTextoAnotacion(a)"
                   :contenteditable="puedeEditar"
                   @blur="(e) => actualizarTextoAnotacion(a, e.target.innerText)"
                   @mousedown.stop
                   v-text="a.contenido"
              />
              <div v-else
                   class="w-full h-full px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 text-xs font-semibold rounded flex items-center"
                   :style="{ fontSize: `${(a.font_size || 11) * escala}px` }"
              >
                <span class="pointer-events-none">{ {{ labelCampo(a.campo_nombre) }} }</span>
              </div>
              <button v-if="puedeEditar" class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-ink-300 text-ink-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 grid place-items-center opacity-0 group-hover:opacity-100" @click.stop="eliminarAnotacion(a)">
                <Icon name="x" size="w-3 h-3" />
              </button>
              <div v-if="puedeEditar && a.tipo === 'texto'" class="absolute -top-7 left-0 hidden group-hover:flex items-center gap-1 bg-white border border-ink-200 rounded shadow-sm px-1.5 py-0.5 text-xs">
                <button class="px-1 hover:bg-ink-50 rounded" @click.stop="cambiarFontSize(a, -1)">A−</button>
                <span class="text-ink-600">{{ a.font_size || 11 }}</span>
                <button class="px-1 hover:bg-ink-50 rounded" @click.stop="cambiarFontSize(a, 1)">A+</button>
                <button :class="['px-1 rounded font-bold', a.bold ? 'bg-ink-900 text-white' : 'hover:bg-ink-50']" @click.stop="toggleBold(a)">B</button>
                <input type="color" :value="a.color || '#111111'" class="w-5 h-5 p-0 border-0 cursor-pointer" @input.stop="(e) => cambiarColor(a, e.target.value)" />
              </div>
            </div>
          </div>
          <p v-if="!numPaginas" class="text-center text-ink-400 py-12">Cargando PDF...</p>
        </div>
      </div>

      <!-- SIDEBAR DERECHO -->
      <div class="space-y-3">
        <div class="card-pad space-y-3">
          <h3 class="font-semibold text-ink-900 text-sm">Datos del envío</h3>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Asunto del correo</label>
            <input v-model="meta.asunto_correo" :disabled="!puedeEditar" maxlength="200" class="input text-sm" :placeholder="`Firma requerida: ${doc.nombre}`" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Mensaje del correo</label>
            <textarea v-model="meta.mensaje_correo" :disabled="!puedeEditar" rows="3" maxlength="2000" class="input text-sm" placeholder="Por favor revisa y firma este documento." />
          </div>
        </div>
        <div class="card-pad space-y-2">
          <h3 class="font-semibold text-ink-900 text-sm">Resumen</h3>
          <p class="text-xs text-ink-600">{{ tags.length }} tag(s) de firma</p>
          <p class="text-xs text-ink-600">{{ anotaciones.filter(a => a.tipo === 'texto').length }} bloque(s) de texto</p>
          <p class="text-xs text-ink-600">{{ anotaciones.filter(a => a.tipo === 'campo').length }} campo(s) colocado(s)</p>
          <p class="text-xs text-ink-600">{{ campos.length }} campo(s) definido(s)</p>
        </div>
      </div>
    </div>

    <!-- MODAL AGREGAR FIRMANTE -->
    <Modal v-if="modalFirmante.abierto" title="Agregar firmante" @close="modalFirmante.abierto = false">
      <div class="space-y-4">
        <div class="flex border-b border-ink-200">
          <button v-for="t in ['usuario','proveedor','externo']" :key="t"
            :class="['px-3 py-2 text-sm font-medium border-b-2 -mb-px', modalFirmante.tipo === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800']"
            @click="modalFirmante.tipo = t">{{ tipoLabel(t) }}</button>
        </div>
        <div v-if="modalFirmante.tipo === 'usuario'" class="space-y-2">
          <input v-model="modalFirmante.buscarUsuario" placeholder="Buscar por nombre o correo" class="input text-sm" />
          <div class="max-h-64 overflow-auto space-y-1">
            <button v-for="u in usuariosFiltrados" :key="u.id" class="w-full text-left p-2 rounded-lg border border-ink-200 hover:border-brand-400 hover:bg-brand-50/50 text-sm" @click="elegirUsuario(u)">
              <p class="font-medium text-ink-800">{{ u.nombre }}</p>
              <p class="text-xs text-ink-500">{{ u.email }} · {{ u.rol }}</p>
            </button>
            <p v-if="!usuariosFiltrados.length" class="text-xs text-ink-400 text-center py-4">Sin resultados</p>
          </div>
        </div>
        <div v-else-if="modalFirmante.tipo === 'proveedor'" class="space-y-2">
          <input v-model="modalFirmante.buscarProv" placeholder="Buscar por razón social o RFC" class="input text-sm" />
          <div class="max-h-64 overflow-auto space-y-1">
            <button v-for="p in proveedoresFiltrados" :key="p.id" class="w-full text-left p-2 rounded-lg border border-ink-200 hover:border-brand-400 hover:bg-brand-50/50 text-sm" @click="elegirProveedor(p)">
              <p class="font-medium text-ink-800">{{ p.razon_social }}</p>
              <p class="text-xs text-ink-500">{{ p.email }} · {{ p.rfc }}</p>
            </button>
            <p v-if="!proveedoresFiltrados.length" class="text-xs text-ink-400 text-center py-4">Sin resultados</p>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Nombre completo</label>
            <input v-model="modalFirmante.nombre" required class="input text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Correo</label>
            <input v-model="modalFirmante.email" type="email" required class="input text-sm" />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalFirmante.abierto = false">Cancelar</button>
        <button v-if="modalFirmante.tipo === 'externo'" class="btn-primary" :disabled="!modalFirmante.nombre || !modalFirmante.email" @click="agregarExterno">Agregar</button>
      </template>
    </Modal>

    <!-- MODAL CAMPO -->
    <Modal v-if="modalCampo.abierto" title="Nuevo campo dinámico" @close="modalCampo.abierto = false">
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Etiqueta visible</label>
          <input v-model="modalCampo.label" required class="input text-sm" placeholder="Ej: Nombre del cliente" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Nombre interno (sin espacios)</label>
          <input v-model="modalCampo.nombre" required class="input text-sm font-mono" placeholder="Ej: nombre_cliente" @input="modalCampo.nombre = modalCampo.nombre.replace(/[^a-z0-9_]/gi,'_').toLowerCase()" />
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
        <button class="btn-primary" :disabled="!modalCampo.label || !modalCampo.nombre" @click="agregarCampo">Crear</button>
      </template>
    </Modal>

    <!-- MODAL ENVIAR (campos) -->
    <Modal v-if="modalEnviar.abierto" title="Llenar campos antes de enviar" @close="modalEnviar.abierto = false">
      <div class="space-y-3">
        <p v-if="!modalEnviar.campos.length" class="text-sm text-ink-500">Este documento no tiene campos para llenar. Se enviará tal cual.</p>
        <template v-else>
          <p class="text-sm text-ink-600">Estos valores se estamparán en el PDF antes de enviar a DocuSign:</p>
          <div v-for="c in modalEnviar.campos" :key="c.nombre" class="space-y-1">
            <label class="block text-xs font-medium text-ink-700">
              {{ c.label }}<span v-if="c.requerido" class="text-red-500">*</span>
              <span class="text-ink-400 font-normal">· {{ c.nombre }}</span>
            </label>
            <input v-model="modalEnviar.valores[c.nombre]" :type="inputType(c.tipo)" :required="c.requerido" class="input text-sm" />
          </div>
        </template>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalEnviar.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="enviando" @click="confirmarEnviar">
          <Icon name="send" size="w-4 h-4" /> {{ enviando ? 'Enviando...' : 'Enviar a DocuSign' }}
        </button>
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
const config = useRuntimeConfig();
const auth = useAuth();

const docId = computed(() => Number(route.params.id));

const doc = ref(null);
const firmantes = ref([]);
const tags = ref([]);
const anotaciones = ref([]);
const campos = ref([]);
const meta = reactive({ asunto_correo: '', mensaje_correo: '' });
const cargando = ref(true);
const guardando = ref(false);
const enviando = ref(false);

const numPaginas = ref(0);
const paginasArr = computed(() => Array.from({ length: numPaginas.value }, (_, i) => i + 1));
const canvasMap = {};
const renderTasks = {};
const renderedScale = {};
const dimensionesPagina = ref({});
const escala = ref(1.25);
let pdfDoc = null;
const tipoTagActivo = ref('firma');
const firmanteSeleccionado = ref(null);
const campoSeleccionado = ref(null);
const modoInsercion = ref('tag');

const COLORES = ['#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0891b2', '#ca8a04'];
const puedeEditar = computed(() => doc.value?.estado === 'borrador');

const cursorPagina = computed(() => {
  if (!puedeEditar.value) return '';
  if (modoInsercion.value === 'tag' && firmanteSeleccionado.value) return 'cursor-crosshair';
  if (modoInsercion.value === 'texto') return 'cursor-text';
  if (modoInsercion.value === 'campo' && campoSeleccionado.value) return 'cursor-crosshair';
  return '';
});

const puedeEnviar = computed(() => {
  if (!puedeEditar.value || !firmantes.value.length) return false;
  return firmantes.value.every((f) => tags.value.some((t) => Number(t.firmante_id) === Number(f.id)));
});

const modalFirmante = reactive({ abierto: false, tipo: 'usuario', buscarUsuario: '', buscarProv: '', nombre: '', email: '' });
const modalCampo = reactive({ abierto: false, label: '', nombre: '', tipo: 'texto', requerido: true });
const modalEnviar = reactive({ abierto: false, campos: [], valores: {} });

const usuarios = ref([]);
const proveedores = ref([]);

const usuariosFiltrados = computed(() => {
  const q = modalFirmante.buscarUsuario.trim().toLowerCase();
  return usuarios.value.filter((u) => !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
});
const proveedoresFiltrados = computed(() => {
  const q = modalFirmante.buscarProv.trim().toLowerCase();
  return proveedores.value.filter((p) => !q || (p.razon_social || '').toLowerCase().includes(q) || (p.rfc || '').toLowerCase().includes(q));
});

function tipoLabel(t) { return { usuario: 'Usuario interno', proveedor: 'Proveedor', externo: 'Externo' }[t] || t; }
function tipoTagLabel(t) { return { firma: 'Firma', iniciales: 'Iniciales', fecha: 'Fecha', texto: 'Texto' }[t] || t; }
function inputType(t) { return { texto: 'text', numero: 'number', fecha: 'date', email: 'email', telefono: 'tel' }[t] || 'text'; }
function labelCampo(nombre) {
  const c = campos.value.find((x) => x.nombre === nombre);
  return c?.label || nombre;
}

let keyCounter = 1;
function asignarKey(o) { o._key = keyCounter++; return o; }

function setCanvasRef(p, el) {
  if (el) {
    canvasMap[p] = el;
    if (pdfDoc && renderedScale[p] !== escala.value) renderizarPagina(p);
  } else {
    delete canvasMap[p];
  }
}

async function cargar() {
  cargando.value = true;
  try {
    const d = await api.get(`/documentos/${docId.value}`);
    if (d.tipo === 'creado') {
      router.replace(`/admin/documentos/${docId.value}/editor-html`);
      return;
    }
    doc.value = d;
    firmantes.value = (d.firmantes || []).map((f, i) => ({
      ...f,
      id: Number(f.id),
      color: f.color || COLORES[i % COLORES.length],
    }));
    tags.value = (d.tags || []).map((t) => asignarKey({
      ...t,
      firmante_id: Number(t.firmante_id),
      pagina: Number(t.pagina),
      x: Number(t.x), y: Number(t.y),
      ancho: Number(t.ancho), alto: Number(t.alto),
    }));
    anotaciones.value = (d.anotaciones || []).map((a) => asignarKey({
      ...a,
      pagina: Number(a.pagina),
      x: Number(a.x), y: Number(a.y),
      ancho: Number(a.ancho), alto: Number(a.alto),
      font_size: Number(a.font_size),
      bold: !!a.bold,
    }));
    campos.value = d.campos || [];
    meta.asunto_correo = d.asunto_correo || '';
    meta.mensaje_correo = d.mensaje_correo || '';
    await nextTick();
    await cargarPdf();
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
    router.push('/admin/documentos');
  } finally {
    cargando.value = false;
  }
}

let pdfjsLib = null;
async function cargarPdf() {
  try {
    pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const res = await fetch(`${config.public.apiBase}/documentos/${docId.value}/archivo`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) throw new Error('No se pudo descargar el PDF');
    const buf = await res.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    numPaginas.value = pdfDoc.numPages;
    await nextTick();
    for (let i = 1; i <= pdfDoc.numPages; i++) await renderizarPagina(i);
  } catch (err) {
    console.error('[PDF.js] Error cargando PDF:', err);
    toast.error('Error al cargar PDF', err.message || 'Ver consola');
  }
}

async function renderizarPagina(p) {
  if (!pdfDoc) return;
  const canvas = canvasMap[p];
  if (!canvas) return;
  if (renderTasks[p]) { try { renderTasks[p].cancel(); } catch {} delete renderTasks[p]; }
  const escalaSnap = escala.value;
  try {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: escalaSnap });
    if (canvasMap[p] !== canvas) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const task = page.render({ canvasContext: ctx, viewport });
    renderTasks[p] = task;
    await task.promise;
    if (renderTasks[p] === task) {
      delete renderTasks[p];
      renderedScale[p] = escalaSnap;
      dimensionesPagina.value = { ...dimensionesPagina.value, [p]: { width: viewport.width, height: viewport.height } };
    }
  } catch (err) {
    if (err?.name === 'RenderingCancelledException') return;
    console.error(`[PDF.js] Error renderizando página ${p}:`, err);
  }
}

async function cambiarEscala(delta) {
  escala.value = Math.max(0.5, Math.min(2.5, escala.value + delta));
  await nextTick();
  for (const p of Object.keys(canvasMap).map(Number).sort((a, b) => a - b)) await renderizarPagina(p);
}

function tagsEnPagina(p) { return tags.value.filter((t) => t.pagina === p); }
function anotacionesEnPagina(p) { return anotaciones.value.filter((a) => a.pagina === p); }

function estiloTag(t) {
  const firm = firmantes.value.find((f) => f.id === t.firmante_id);
  const color = firm?.color || '#2563eb';
  return {
    left: `${t.x * escala.value}px`,
    top: `${t.y * escala.value}px`,
    width: `${(t.ancho || 140) * escala.value}px`,
    height: `${(t.alto || 40) * escala.value}px`,
    background: `${color}DD`,
    border: `2px solid ${color}`,
    borderRadius: '4px',
  };
}

function estiloAnotacion(a) {
  return {
    left: `${a.x * escala.value}px`,
    top: `${a.y * escala.value}px`,
    width: `${(a.ancho || 200) * escala.value}px`,
    minHeight: `${(a.alto || 24) * escala.value}px`,
  };
}

function estiloTextoAnotacion(a) {
  return {
    fontSize: `${(a.font_size || 11) * escala.value}px`,
    color: a.color || '#111',
    fontWeight: a.bold ? '700' : '400',
    lineHeight: '1.25',
    outline: 'none',
    fontFamily: 'Helvetica, Arial, sans-serif',
  };
}

function seleccionarFirmante(f) {
  if (!puedeEditar.value) return;
  modoInsercion.value = 'tag';
  firmanteSeleccionado.value = firmanteSeleccionado.value === f.id ? null : f.id;
}

function seleccionarCampo(c) {
  if (!puedeEditar.value) return;
  modoInsercion.value = 'campo';
  campoSeleccionado.value = campoSeleccionado.value?.nombre === c.nombre ? null : c;
}

function onClickPagina(e, pagina) {
  if (!puedeEditar.value) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  const dim = dimensionesPagina.value[pagina];
  if (!dim) return;

  if (modoInsercion.value === 'tag') {
    if (!firmanteSeleccionado.value) return;
    const ancho = 140, alto = 40;
    const x = (cssX - (ancho * escala.value) / 2) / escala.value;
    const y = (cssY - (alto * escala.value) / 2) / escala.value;
    const maxX = dim.width / escala.value - ancho;
    const maxY = dim.height / escala.value - alto;
    tags.value.push(asignarKey({
      firmante_id: firmanteSeleccionado.value,
      tipo: tipoTagActivo.value, pagina,
      x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)),
      ancho, alto, requerido: true,
    }));
  } else if (modoInsercion.value === 'texto') {
    const ancho = 200, alto = 24;
    const x = cssX / escala.value;
    const y = cssY / escala.value;
    const maxX = dim.width / escala.value - ancho;
    const maxY = dim.height / escala.value - alto;
    anotaciones.value.push(asignarKey({
      tipo: 'texto', pagina,
      x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)),
      ancho, alto, contenido: 'Texto editable', font_size: 11, color: '#111111', bold: false,
    }));
  } else if (modoInsercion.value === 'campo') {
    if (!campoSeleccionado.value) { toast.warning('Selecciona un campo en el sidebar'); return; }
    const ancho = 160, alto = 22;
    const x = cssX / escala.value;
    const y = cssY / escala.value;
    const maxX = dim.width / escala.value - ancho;
    const maxY = dim.height / escala.value - alto;
    anotaciones.value.push(asignarKey({
      tipo: 'campo', pagina,
      x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)),
      ancho, alto, campo_nombre: campoSeleccionado.value.nombre, font_size: 11, color: '#111111', bold: false,
    }));
  }
}

function iniciarArrastre(e, item, tipoItem) {
  if (!puedeEditar.value) return;
  if (e.target.isContentEditable) return;
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  const origX = item.x, origY = item.y;
  const dim = dimensionesPagina.value[item.pagina];
  const ancho = tipoItem === 'tag' ? (item.ancho || 140) : (item.ancho || 200);
  const alto = tipoItem === 'tag' ? (item.alto || 40) : (item.alto || 24);
  const maxX = (dim?.width || 0) / escala.value - ancho;
  const maxY = (dim?.height || 0) / escala.value - alto;
  const onMove = (ev) => {
    const dx = (ev.clientX - startX) / escala.value;
    const dy = (ev.clientY - startY) / escala.value;
    item.x = Math.max(0, Math.min(origX + dx, maxX));
    item.y = Math.max(0, Math.min(origY + dy, maxY));
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function eliminarTag(t) { tags.value = tags.value.filter((x) => x !== t); }
function eliminarAnotacion(a) { anotaciones.value = anotaciones.value.filter((x) => x !== a); }
function actualizarTextoAnotacion(a, contenido) { a.contenido = contenido; }
function cambiarFontSize(a, delta) { a.font_size = Math.max(6, Math.min(48, (Number(a.font_size) || 11) + delta)); }
function toggleBold(a) { a.bold = !a.bold; }
function cambiarColor(a, c) { a.color = c; }

function abrirAgregarFirmante() {
  Object.assign(modalFirmante, { abierto: true, tipo: 'usuario', buscarUsuario: '', buscarProv: '', nombre: '', email: '' });
  cargarListadosFirmantes();
}

async function cargarListadosFirmantes() {
  if (!usuarios.value.length) {
    try { const r = await api.get('/users?activo=1'); usuarios.value = r.data; } catch (e) { console.warn(e); }
  }
  if (!proveedores.value.length) {
    try { const r = await api.get('/proveedores/admin'); proveedores.value = r.data || []; } catch (e) { console.warn(e); }
  }
}

let firmanteTmpId = -1;
function nuevoFirmanteTmp(base) {
  const orden = firmantes.value.length + 1;
  const color = COLORES[(orden - 1) % COLORES.length];
  return { id: firmanteTmpId--, orden, color, estado: 'pendiente', ...base };
}

function elegirUsuario(u) {
  if (firmantes.value.some((f) => f.tipo === 'usuario' && f.referencia_id === u.id)) { toast.warning('Ya está agregado'); return; }
  firmantes.value.push(nuevoFirmanteTmp({ tipo: 'usuario', referencia_id: u.id, nombre: u.nombre, email: u.email }));
  modalFirmante.abierto = false;
}
function elegirProveedor(p) {
  if (!p.email) { toast.error('El proveedor no tiene correo'); return; }
  if (firmantes.value.some((f) => f.tipo === 'proveedor' && f.referencia_id === p.id)) { toast.warning('Ya está agregado'); return; }
  firmantes.value.push(nuevoFirmanteTmp({ tipo: 'proveedor', referencia_id: p.id, nombre: p.razon_social || p.email, email: p.email }));
  modalFirmante.abierto = false;
}
function agregarExterno() {
  const nombre = modalFirmante.nombre.trim(), email = modalFirmante.email.trim();
  if (!nombre || !email) return;
  if (firmantes.value.some((f) => f.email.toLowerCase() === email.toLowerCase())) { toast.warning('Ya está agregado'); return; }
  firmantes.value.push(nuevoFirmanteTmp({ tipo: 'externo', referencia_id: null, nombre, email }));
  modalFirmante.abierto = false;
}
function quitarFirmante(idx) {
  const f = firmantes.value[idx];
  tags.value = tags.value.filter((t) => t.firmante_id !== f.id);
  firmantes.value.splice(idx, 1);
  firmantes.value.forEach((x, i) => { x.orden = i + 1; });
  if (firmanteSeleccionado.value === f.id) firmanteSeleccionado.value = null;
}

function abrirAgregarCampo() {
  Object.assign(modalCampo, { abierto: true, label: '', nombre: '', tipo: 'texto', requerido: true });
}
function agregarCampo() {
  if (campos.value.some((x) => x.nombre === modalCampo.nombre)) { toast.warning('Ya existe ese nombre'); return; }
  const nuevo = { id: -Date.now(), label: modalCampo.label, nombre: modalCampo.nombre, tipo: modalCampo.tipo, requerido: modalCampo.requerido, valor: null };
  campos.value.push(nuevo);
  campoSeleccionado.value = nuevo;
  modoInsercion.value = 'campo';
  modalCampo.abierto = false;
  toast.success('Campo creado', 'Ahora haz click en el PDF para colocarlo');
}
function quitarCampo(idx) {
  const c = campos.value[idx];
  anotaciones.value = anotaciones.value.filter((a) => !(a.tipo === 'campo' && a.campo_nombre === c.nombre));
  campos.value.splice(idx, 1);
  if (campoSeleccionado.value?.nombre === c.nombre) campoSeleccionado.value = null;
}

async function guardar(silencio = false) {
  guardando.value = true;
  try {
    await api.put(`/documentos/${docId.value}`, {
      nombre: doc.value.nombre,
      descripcion: doc.value.descripcion,
      asunto_correo: meta.asunto_correo || null,
      mensaje_correo: meta.mensaje_correo || null,
    });
    const payloadFirmantes = firmantes.value.map((f, i) => ({
      tipo: f.tipo,
      referencia_id: f.tipo === 'externo' ? null : f.referencia_id,
      nombre: f.nombre, email: f.email, orden: i + 1, color: f.color,
    }));
    const rf = await api.put(`/documentos/${docId.value}/firmantes`, { firmantes: payloadFirmantes });
    const mapaIds = new Map();
    firmantes.value.forEach((f, i) => mapaIds.set(f.id, rf.firmantes[i].id));
    firmantes.value = rf.firmantes.map((f, i) => ({ ...f, color: f.color || COLORES[i % COLORES.length] }));
    tags.value = tags.value.map((t) => ({ ...t, firmante_id: mapaIds.get(t.firmante_id) || t.firmante_id }));

    const payloadTags = tags.value.map((t) => ({
      firmante_id: t.firmante_id, tipo: t.tipo || 'firma', pagina: t.pagina,
      x: Number(t.x), y: Number(t.y), ancho: Number(t.ancho || 140), alto: Number(t.alto || 40), requerido: t.requerido !== false,
    }));
    await api.put(`/documentos/${docId.value}/tags`, { tags: payloadTags });

    const payloadAnot = anotaciones.value.map((a) => ({
      tipo: a.tipo, pagina: a.pagina,
      x: Number(a.x), y: Number(a.y), ancho: Number(a.ancho || 200), alto: Number(a.alto || 24),
      contenido: a.tipo === 'texto' ? (a.contenido || '') : null,
      campo_nombre: a.tipo === 'campo' ? a.campo_nombre : null,
      font_size: Number(a.font_size || 11), color: a.color || '#111111', bold: !!a.bold,
    }));
    await api.put(`/documentos/${docId.value}/anotaciones`, { anotaciones: payloadAnot });

    const payloadCampos = campos.value.map((c) => ({
      nombre: c.nombre, label: c.label, tipo: c.tipo || 'texto',
      valor: c.valor || null, requerido: c.requerido !== false,
    }));
    await api.put(`/documentos/${docId.value}/campos`, { campos: payloadCampos });

    if (!silencio) toast.success('Borrador guardado');
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
    throw e;
  } finally {
    guardando.value = false;
  }
}

async function abrirEnviar() {
  if (!puedeEnviar.value) return;
  await guardar(true);
  const camposUsados = campos.value.filter((c) => anotaciones.value.some((a) => a.tipo === 'campo' && a.campo_nombre === c.nombre));
  if (!camposUsados.length) {
    await confirmarEnviar();
    return;
  }
  const valores = {};
  for (const c of camposUsados) valores[c.nombre] = c.valor || '';
  Object.assign(modalEnviar, { abierto: true, campos: camposUsados, valores });
}

async function confirmarEnviar() {
  for (const c of modalEnviar.campos) {
    if (c.requerido && !modalEnviar.valores[c.nombre]?.trim()) {
      toast.error('Falta llenar', c.label); return;
    }
  }
  enviando.value = true;
  try {
    if (modalEnviar.campos.length) {
      await api.put(`/documentos/${docId.value}/valores`, { valores: modalEnviar.valores });
    }
    const r = await api.post(`/documentos/${docId.value}/enviar`);
    toast.success('Enviado a DocuSign', `Envelope ${r.envelopeId}`);
    modalEnviar.abierto = false;
    await cargar();
  } catch (e) {
    toast.error('No se pudo enviar', e.message);
  } finally {
    enviando.value = false;
  }
}

async function descargarFirmado() {
  try { await api.download(`/documentos/${docId.value}/archivo?firmado=1`, `${doc.value.nombre}_firmado.pdf`); }
  catch (e) { toast.error('No se pudo descargar', e.message); }
}

onMounted(cargar);
</script>
