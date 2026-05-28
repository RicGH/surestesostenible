<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/documentos" class="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
          <Icon name="arrow-left" size="w-4 h-4" /> Volver
        </NuxtLink>
        <div v-if="doc">
          <input
            v-if="puedeEditar"
            v-model="doc.nombre"
            class="text-base font-semibold text-ink-900 bg-transparent border-0 border-b border-transparent hover:border-ink-300 focus:border-brand-500 focus:outline-none px-1 -mx-1"
          />
          <h2 v-else class="text-base font-semibold text-ink-900">{{ doc.nombre }}</h2>
          <div class="flex items-center gap-2 text-xs text-ink-500">
            <EstadoBadge :estado="doc.estado" />
            <span v-if="doc.envelope_id">Envelope: {{ doc.envelope_id }}</span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button v-if="puedeEditar" class="btn-secondary" :disabled="guardando" @click="guardarBorrador">
          <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando...' : 'Guardar borrador' }}
        </button>
        <button v-if="puedeEditar" class="btn-secondary" :disabled="guardando" @click="abrirGuardarPlantilla">
          <Icon name="document" size="w-4 h-4" /> Guardar como plantilla
        </button>
        <button
          v-if="puedeEditar"
          class="btn-primary"
          :disabled="!puedeEnviar || enviando"
          @click="abrirEnviar"
        >
          <Icon name="send" size="w-4 h-4" /> {{ enviando ? 'Enviando...' : 'Enviar a DocuSign' }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="card-pad text-center text-ink-500">Cargando documento...</div>

    <div v-else-if="doc" class="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4">
      <!-- SIDEBAR IZQUIERDO: FIRMANTES + CAMPOS -->
      <div class="space-y-3">
        <div class="card-pad space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink-900 text-sm">Firmantes</h3>
            <button v-if="puedeEditar" class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="abrirAgregarFirmante">
              <Icon name="plus" size="w-3 h-3" /> Agregar
            </button>
          </div>
          <p v-if="!firmantes.length" class="text-xs text-ink-400">Agrega firmantes y luego inserta sus tags.</p>
          <div v-else class="space-y-2">
            <div
              v-for="(f, i) in firmantes"
              :key="f.id || `tmp-${i}`"
              :class="['p-2 rounded-lg border cursor-pointer transition-all', firmanteSeleccionado === f.id ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-400']"
              @click="firmanteSeleccionado = firmanteSeleccionado === f.id ? null : f.id"
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
          <div v-if="puedeEditar && firmanteSeleccionado" class="space-y-1 pt-2 border-t border-ink-100">
            <p class="text-xs text-ink-500">Insertar tag para este firmante:</p>
            <div class="flex gap-1">
              <button class="btn-secondary !py-1 !px-2 text-xs flex-1" @click="insertarTagFirmante('firma')">Firma</button>
              <button class="btn-secondary !py-1 !px-2 text-xs flex-1" @click="insertarTagFirmante('iniciales')">Inic.</button>
              <button class="btn-secondary !py-1 !px-2 text-xs flex-1" @click="insertarTagFirmante('fecha')">Fecha</button>
            </div>
          </div>
        </div>

        <div class="card-pad space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-ink-900 text-sm">Campos dinámicos</h3>
            <button v-if="puedeEditar" class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="abrirAgregarCampo">
              <Icon name="plus" size="w-3 h-3" /> Agregar
            </button>
          </div>
          <p v-if="!campos.length" class="text-xs text-ink-400">Crea campos para insertar variables en el documento que se llenarán antes de enviar.</p>
          <div v-else class="space-y-1.5">
            <div
              v-for="(c, i) in campos"
              :key="c.id || `tmp-c-${i}`"
              class="p-2 rounded-lg border border-amber-200 bg-amber-50/50 group"
            >
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-amber-900 truncate">{{ c.label }}</p>
                  <p class="text-xs text-amber-700/80 truncate">{{ c.nombre }} · {{ c.tipo }}{{ c.requerido ? ' · requerido' : '' }}</p>
                </div>
                <button v-if="puedeEditar" class="text-xs text-brand-600 hover:underline shrink-0" @click="insertarCampo(c)">Insertar</button>
                <button v-if="puedeEditar" class="text-ink-400 hover:text-red-600 shrink-0" @click="quitarCampo(i)">
                  <Icon name="x" size="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- EDITOR -->
      <div>
        <DocumentoEditorHTML
          ref="editorRef"
          v-model="contenidoHtml"
          :readonly="!puedeEditar"
          @insertar-tag="abrirInsertarTag"
          @insertar-campo="abrirAgregarCampo"
        />
      </div>

      <!-- SIDEBAR DERECHO: META -->
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
          <p class="text-xs text-ink-600">{{ campos.length }} campo(s) dinámico(s)</p>
          <p class="text-xs text-ink-600">{{ firmantes.length }} firmante(s)</p>
          <p class="text-xs text-ink-600">{{ tagsEnContenido }} tag(s) en el contenido</p>
        </div>
      </div>
    </div>

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
          <label class="block text-xs font-medium text-ink-600 mb-1">Tipo de campo</label>
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
        <button class="btn-primary" :disabled="!modalCampo.label || !modalCampo.nombre" @click="agregarCampo">Crear e insertar</button>
      </template>
    </Modal>

    <Modal v-if="modalEnviar.abierto" :title="`Llenar campos antes de enviar`" @close="modalEnviar.abierto = false">
      <div class="space-y-3">
        <p v-if="!modalEnviar.campos.length" class="text-sm text-ink-500">Este documento no tiene campos para llenar. Se enviará tal cual.</p>
        <template v-else>
          <p class="text-sm text-ink-600">Estos valores se sustituirán en el documento antes de enviar a DocuSign:</p>
          <div v-for="c in modalEnviar.campos" :key="c.nombre" class="space-y-1">
            <label class="block text-xs font-medium text-ink-700">
              {{ c.label }}
              <span v-if="c.requerido" class="text-red-500">*</span>
              <span class="text-ink-400 font-normal">· {{ c.nombre }}</span>
            </label>
            <input
              v-model="modalEnviar.valores[c.nombre]"
              :type="inputType(c.tipo)"
              :required="c.requerido"
              class="input text-sm"
            />
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

    <Modal v-if="modalPlantilla.abierto" title="Guardar como plantilla" @close="modalPlantilla.abierto = false">
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Nombre de la plantilla</label>
          <input v-model="modalPlantilla.nombre" required class="input text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Descripción</label>
          <textarea v-model="modalPlantilla.descripcion" rows="2" class="input text-sm" />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalPlantilla.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="!modalPlantilla.nombre || modalPlantilla.guardando" @click="confirmarGuardarPlantilla">
          {{ modalPlantilla.guardando ? 'Guardando...' : 'Guardar plantilla' }}
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

const docId = computed(() => Number(route.params.id));
const doc = ref(null);
const firmantes = ref([]);
const campos = ref([]);
const contenidoHtml = ref('');
const meta = reactive({ asunto_correo: '', mensaje_correo: '' });
const cargando = ref(true);
const guardando = ref(false);
const enviando = ref(false);
const firmanteSeleccionado = ref(null);
const editorRef = ref(null);

const COLORES = ['#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0891b2', '#ca8a04'];

const puedeEditar = computed(() => doc.value?.estado === 'borrador');

const tagsEnContenido = computed(() => {
  const html = contenidoHtml.value || '';
  return (html.match(/data-ds-tag=/g) || []).length;
});

const puedeEnviar = computed(() => {
  if (!puedeEditar.value || !firmantes.value.length) return false;
  const tagsTexto = contenidoHtml.value || '';
  return firmantes.value.every((f) =>
    new RegExp(`data-ds-firmante="${Number(f.id)}"`).test(tagsTexto),
  );
});

const modalFirmante = reactive({ abierto: false, tipo: 'usuario', buscarUsuario: '', buscarProv: '', nombre: '', email: '' });
const modalCampo = reactive({ abierto: false, label: '', nombre: '', tipo: 'texto', requerido: true });
const modalEnviar = reactive({ abierto: false, campos: [], valores: {} });
const modalPlantilla = reactive({ abierto: false, nombre: '', descripcion: '', guardando: false });

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
function inputType(t) { return { texto: 'text', numero: 'number', fecha: 'date', email: 'email', telefono: 'tel' }[t] || 'text'; }

async function cargar() {
  cargando.value = true;
  try {
    const d = await api.get(`/documentos/${docId.value}`);
    if (d.tipo !== 'creado') {
      router.replace(`/admin/documentos/${docId.value}/editor`);
      return;
    }
    doc.value = d;
    firmantes.value = (d.firmantes || []).map((f, i) => ({
      ...f,
      id: Number(f.id),
      color: f.color || COLORES[i % COLORES.length],
    }));
    campos.value = d.campos || [];
    contenidoHtml.value = d.contenido_html || '<p></p>';
    meta.asunto_correo = d.asunto_correo || '';
    meta.mensaje_correo = d.mensaje_correo || '';
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
    router.push('/admin/documentos');
  } finally {
    cargando.value = false;
  }
}

async function cargarListadosFirmantes() {
  if (!usuarios.value.length) {
    try { const r = await api.get('/users?activo=1'); usuarios.value = r.data; } catch (e) { console.warn(e); }
  }
  if (!proveedores.value.length) {
    try { const r = await api.get('/proveedores/admin'); proveedores.value = r.data || []; } catch (e) { console.warn(e); }
  }
}

function abrirAgregarFirmante() {
  Object.assign(modalFirmante, { abierto: true, tipo: 'usuario', buscarUsuario: '', buscarProv: '', nombre: '', email: '' });
  cargarListadosFirmantes();
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
  const nombre = modalFirmante.nombre.trim();
  const email = modalFirmante.email.trim();
  if (!nombre || !email) return;
  if (firmantes.value.some((f) => f.email.toLowerCase() === email.toLowerCase())) { toast.warning('Ya está agregado'); return; }
  firmantes.value.push(nuevoFirmanteTmp({ tipo: 'externo', referencia_id: null, nombre, email }));
  modalFirmante.abierto = false;
}
function quitarFirmante(idx) {
  const f = firmantes.value[idx];
  contenidoHtml.value = (contenidoHtml.value || '').replace(
    new RegExp(`<span[^>]*data-ds-firmante="${f.id}"[^>]*>[^<]*</span>`, 'g'), ''
  );
  firmantes.value.splice(idx, 1);
  firmantes.value.forEach((x, i) => { x.orden = i + 1; });
  if (firmanteSeleccionado.value === f.id) firmanteSeleccionado.value = null;
}

function abrirAgregarCampo() {
  Object.assign(modalCampo, { abierto: true, label: '', nombre: '', tipo: 'texto', requerido: true });
}
function agregarCampo() {
  const c = { ...modalCampo, id: -Date.now() };
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

function abrirInsertarTag() {
  if (!firmantes.value.length) { toast.warning('Primero agrega un firmante', 'En el sidebar izquierdo'); return; }
  if (!firmanteSeleccionado.value) {
    firmanteSeleccionado.value = firmantes.value[0].id;
    toast.success('Firmante seleccionado', firmantes.value[0].nombre);
  }
  insertarTagFirmante('firma');
}
function insertarTagFirmante(tipo) {
  const f = firmantes.value.find((x) => x.id === firmanteSeleccionado.value);
  if (!f) return;
  editorRef.value?.insertarTag({ tipo, firmanteId: f.id, color: f.color, nombre: f.nombre });
}

async function guardarBorrador(silencio = false) {
  guardando.value = true;
  try {
    await api.put(`/documentos/${docId.value}/html`, {
      nombre: doc.value.nombre,
      descripcion: doc.value.descripcion,
      contenido_html: contenidoHtml.value,
      asunto_correo: meta.asunto_correo || null,
      mensaje_correo: meta.mensaje_correo || null,
      campos: campos.value.map((c) => ({ nombre: c.nombre, label: c.label, tipo: c.tipo, valor: c.valor || null, requerido: c.requerido !== false })),
    });
    const payloadFirmantes = firmantes.value.map((f, i) => ({
      tipo: f.tipo,
      referencia_id: f.tipo === 'externo' ? null : f.referencia_id,
      nombre: f.nombre,
      email: f.email,
      orden: i + 1,
      color: f.color,
    }));
    const rf = await api.put(`/documentos/${docId.value}/firmantes`, { firmantes: payloadFirmantes });
    const mapaIds = new Map();
    firmantes.value.forEach((f, i) => mapaIds.set(f.id, rf.firmantes[i].id));
    let nuevoHtml = contenidoHtml.value;
    for (const [tmpId, realId] of mapaIds.entries()) {
      if (tmpId !== realId) {
        nuevoHtml = nuevoHtml.replace(new RegExp(`data-ds-firmante="${tmpId}"`, 'g'), `data-ds-firmante="${realId}"`);
      }
    }
    if (nuevoHtml !== contenidoHtml.value) {
      contenidoHtml.value = nuevoHtml;
      await api.put(`/documentos/${docId.value}/html`, {
        nombre: doc.value.nombre,
        descripcion: doc.value.descripcion,
        contenido_html: nuevoHtml,
        asunto_correo: meta.asunto_correo || null,
        mensaje_correo: meta.mensaje_correo || null,
        campos: campos.value.map((c) => ({ nombre: c.nombre, label: c.label, tipo: c.tipo, valor: c.valor || null, requerido: c.requerido !== false })),
      });
    }
    firmantes.value = rf.firmantes.map((f, i) => ({ ...f, color: f.color || COLORES[i % COLORES.length] }));
    if (!silencio) toast.success('Borrador guardado');
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
    throw e;
  } finally {
    guardando.value = false;
  }
}

async function abrirEnviar() {
  await guardarBorrador(true);
  const detalle = await api.get(`/documentos/${docId.value}`);
  campos.value = detalle.campos || [];
  const valores = {};
  for (const c of campos.value) valores[c.nombre] = c.valor || '';
  Object.assign(modalEnviar, { abierto: true, campos: campos.value, valores });
}

async function confirmarEnviar() {
  for (const c of modalEnviar.campos) {
    if (c.requerido && !modalEnviar.valores[c.nombre]?.trim()) {
      toast.error('Falta llenar', c.label);
      return;
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

function abrirGuardarPlantilla() {
  Object.assign(modalPlantilla, { abierto: true, nombre: doc.value?.nombre || '', descripcion: doc.value?.descripcion || '', guardando: false });
}

async function confirmarGuardarPlantilla() {
  modalPlantilla.guardando = true;
  try {
    await api.post('/plantillas', {
      nombre: modalPlantilla.nombre,
      descripcion: modalPlantilla.descripcion || null,
      contenido_html: contenidoHtml.value,
      campos_json: campos.value.map((c) => ({ nombre: c.nombre, label: c.label, tipo: c.tipo, requerido: c.requerido !== false })),
      asunto_correo: meta.asunto_correo || null,
      mensaje_correo: meta.mensaje_correo || null,
    });
    toast.success('Plantilla guardada', modalPlantilla.nombre);
    modalPlantilla.abierto = false;
  } catch (e) {
    toast.error('No se pudo guardar plantilla', e.message);
  } finally {
    modalPlantilla.guardando = false;
  }
}

onMounted(cargar);
</script>
