<template>
  <div class="firma-app">
    <!-- TOP BAR -->
    <header class="firma-header">
      <div class="firma-header-left">
        <img src="/brand/icon.png" class="firma-logo" alt="Logo" onerror="this.style.display='none'" />
        <span class="firma-header-title">Revisar y completar</span>
      </div>
      <div class="firma-header-right">
        <button
          v-if="sesion && !sesion.esperando && sesion.estado !== 'firmado' && !completado"
          class="firma-btn-primary"
          :disabled="!puedeTerminar || enviandoFirma"
          @click="finalizarFirma"
        >
          {{ enviandoFirma ? 'Procesando...' : 'Finalizar' }} →
        </button>
      </div>
    </header>

    <!-- ESTADO: CARGANDO -->
    <div v-if="cargando" class="firma-center">
      <div class="firma-spinner"></div>
      <p style="color:#64748b;margin-top:12px;">Cargando documento...</p>
    </div>

    <!-- ESTADO: ERROR -->
    <div v-else-if="error" class="firma-center">
      <div class="firma-card-state">
        <div class="firma-icon-error">✕</div>
        <h2>Enlace no válido</h2>
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- ESTADO: YA FIRMÓ -->
    <div v-else-if="sesion?.estado === 'firmado'" class="firma-center">
      <div class="firma-card-state">
        <div class="firma-icon-ok">✓</div>
        <h2>¡Ya firmaste este documento!</h2>
        <p>Tu firma fue registrada correctamente. Gracias, <strong>{{ sesion.nombre }}</strong>.</p>
      </div>
    </div>

    <!-- ESTADO: ESPERANDO TURNO -->
    <div v-else-if="sesion?.esperando" class="firma-center">
      <div class="firma-card-state">
        <div class="firma-icon-wait">⏳</div>
        <h2>Esperando firma anterior</h2>
        <p>Tu turno para firmar llegará cuando los firmantes anteriores completen el proceso. Recibirás un correo cuando sea tu momento.</p>
      </div>
    </div>

    <!-- ESTADO: COMPLETADO EXITOSAMENTE (tras firmar) -->
    <div v-else-if="completado" class="firma-center">
      <div class="firma-card-state">
        <div class="firma-icon-ok">✓</div>
        <h2>¡Documento firmado!</h2>
        <p>Tu firma fue registrada correctamente. Gracias, <strong>{{ sesion?.nombre }}</strong>.</p>
      </div>
    </div>

    <!-- VISOR PRINCIPAL -->
    <div v-else-if="sesion" class="firma-body">
      <!-- PDF VIEWER -->
      <div class="firma-pdf-area" ref="pdfAreaRef">
        <div class="firma-pdf-toolbar">
          <button class="firma-pdf-btn" :disabled="escala <= 0.6" @click="cambiarEscala(-0.2)">−</button>
          <span class="firma-pdf-zoom">{{ Math.round(escala * 100) }}%</span>
          <button class="firma-pdf-btn" :disabled="escala >= 2.5" @click="cambiarEscala(0.2)">+</button>
          <span class="firma-pdf-pages" v-if="numPaginas">{{ numPaginas }} pág.</span>
          <button class="firma-panel-toggle-btn" @click="panelMobileAbierto = !panelMobileAbierto">
            <span>☰</span> Resumen
            <span v-if="sesion?.tags?.length" class="firma-panel-toggle-badge">
              {{ Object.keys(signaturas).length }}/{{ sesion.tags.filter(t => t.tipo !== 'fecha').length }}
            </span>
          </button>
        </div>
        <div class="firma-pdf-scroll" ref="pdfScrollRef">
          <div v-for="p in paginasArr" :key="`p-${p}`" class="firma-pdf-page">
            <canvas :ref="(el) => setCanvasRef(p, el)" style="display:block;" />
            <!-- TAGS DEL FIRMANTE ACTUAL -->
            <div
              v-for="t in tagsEnPagina(p)"
              :key="`t-${t.id}`"
              :data-tag-id="t.id"
              class="firma-tag"
              :class="[signaturas[t.id] ? 'firma-tag--firmado' : 'firma-tag--pendiente', t.tipo === 'fecha' ? 'firma-tag--fecha' : '']"
              :style="estiloTag(t)"
              @click="clickTag(t)"
            >
              <img v-if="signaturas[t.id] && t.tipo !== 'fecha'" :src="signaturas[t.id]" class="firma-tag-img" />
              <span v-else-if="signaturas[t.id] && t.tipo === 'fecha'" class="firma-tag-fecha-texto">{{ fechaHoy }}</span>
              <span v-else class="firma-tag-label">
                <span class="firma-tag-icon">✍</span>
                {{ tipoLabel(t.tipo) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- BACKDROP MÓVIL -->
      <div v-if="panelMobileAbierto" class="firma-panel-backdrop" @click="panelMobileAbierto = false"></div>

      <!-- PANEL DERECHO -->
      <aside :class="['firma-panel', { 'firma-panel--open': panelMobileAbierto }]">
        <div class="firma-panel-drag-handle" @click="panelMobileAbierto = false"></div>
        <div class="firma-panel-inner">
          <div class="firma-panel-section">
            <h3 class="firma-panel-heading">Resumir este acuerdo</h3>
            <p class="firma-panel-doc">{{ sesion.doc_nombre }}</p>
          </div>
          <div class="firma-panel-section">
            <p class="firma-panel-label">Firmante</p>
            <p class="firma-panel-value">{{ sesion.nombre }}</p>
            <p class="firma-panel-email">{{ sesion.email }}</p>
          </div>
          <div class="firma-panel-section">
            <p class="firma-panel-label">Instrucciones</p>
            <ol class="firma-panel-steps">
              <li>Revisa el documento completo.</li>
              <li>Haz clic en cada área de firma <strong>✍</strong>.</li>
              <li>Selecciona un estilo o dibuja tu firma.</li>
              <li>Cuando termines, haz clic en <strong>Finalizar →</strong></li>
            </ol>
          </div>
          <div class="firma-panel-progress">
            <p class="firma-panel-label">Progreso</p>
            <div class="firma-panel-tags">
              <div
                v-for="t in sesion.tags"
                :key="`pt-${t.id}`"
                class="firma-panel-tag-item"
                :class="signaturas[t.id] ? 'firma-panel-tag-item--ok' : ''"
                @click="scrollToTag(t)"
              >
                <span class="firma-panel-tag-icon">{{ signaturas[t.id] ? '✓' : '✍' }}</span>
                <span>{{ tipoLabel(t.tipo) }} · Pág. {{ t.pagina }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- MODAL DE FIRMA -->
    <div v-if="modalFirma.abierto" class="firma-modal-overlay" @click.self="cerrarModal">
      <div class="firma-modal">
        <div class="firma-modal-header">
          <h3>Adoptar su firma</h3>
          <button class="firma-modal-close" @click="cerrarModal">✕</button>
        </div>
        <div class="firma-modal-body">
          <div class="firma-modal-fields">
            <div>
              <label class="firma-modal-label">Confirma tu nombre / Firma:</label>
              <input v-model="nombreFirma" class="firma-modal-input" maxlength="80" />
            </div>
            <div>
              <label class="firma-modal-label">Iniciales:</label>
              <input v-model="inicialesFirma" class="firma-modal-input firma-modal-input--sm" maxlength="5" />
            </div>
          </div>

          <div class="firma-modal-tabs">
            <button
              :class="['firma-modal-tab', tabActiva === 'estilo' ? 'firma-modal-tab--active' : '']"
              @click="tabActiva = 'estilo'"
            >SELECCIONAR ESTILO</button>
            <button
              :class="['firma-modal-tab', tabActiva === 'dibujar' ? 'firma-modal-tab--active' : '']"
              @click="tabActiva = 'dibujar'"
            >DIBUJAR</button>
          </div>

          <!-- ESTILOS -->
          <div v-if="tabActiva === 'estilo'" class="firma-estilos">
            <div
              v-for="(estilo, i) in estilos"
              :key="i"
              :class="['firma-estilo-opcion', estiloSeleccionado === i ? 'firma-estilo-opcion--active' : '']"
              @click="estiloSeleccionado = i"
            >
              <span :style="{ fontFamily: estilo.font, fontSize: '26px', color: '#1e293b', lineHeight: '1.2' }">
                {{ textoParaEstilo }}
              </span>
            </div>
          </div>

          <!-- DIBUJAR -->
          <div v-else class="firma-draw">
            <canvas
              ref="canvasDibujoRef"
              class="firma-draw-canvas"
              :width="canvasDrawW"
              :height="canvasDrawH"
              @mousedown="iniciarDibujo"
              @mousemove="dibujar"
              @mouseup="terminarDibujo"
              @mouseleave="terminarDibujo"
              @touchstart.prevent="iniciarDibujoTouch"
              @touchmove.prevent="dibujarTouch"
              @touchend="terminarDibujo"
            />
            <button class="firma-draw-clear" @click="limpiarDibujo">Limpiar</button>
          </div>
        </div>
        <div class="firma-modal-footer">
          <label
            v-if="tagsPendientesExtra > 0"
            class="firma-apply-all"
          >
            <input type="checkbox" v-model="aplicarATodas" class="firma-apply-all-check" />
            <span>Aplicar esta firma a todas las firmas del documento</span>
          </label>
          <div class="firma-modal-footer-actions">
            <button class="firma-btn-secondary" @click="cerrarModal">Cancelar</button>
            <button class="firma-btn-primary" :disabled="!puedeAdoptar" @click="adoptarFirma">
              Adoptar y firmar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false });

useHead({
  title: 'Firma de documento',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&family=Caveat:wght@500&display=swap' },
  ],
});

const route = useRoute();
const config = useRuntimeConfig();
const token = computed(() => route.params.token);
const API = computed(() => config.public.apiBase);

// Estado general
const cargando = ref(true);
const error = ref('');
const sesion = ref(null);
const completado = ref(false);
const enviandoFirma = ref(false);
const panelMobileAbierto = ref(false);

// PDF
const numPaginas = ref(0);
const paginasArr = computed(() => Array.from({ length: numPaginas.value }, (_, i) => i + 1));
const escala = ref(1.14);
const canvasMap = {};
const renderTasks = {};
const dimensionesPagina = ref({});
let pdfDoc = null;
const pdfScrollRef = ref(null);
const pdfAreaRef = ref(null);

// Firmas
const signaturas = ref({}); // { [tagId]: dataUrl }

// Modal
const modalFirma = reactive({ abierto: false, tag: null });
const tabActiva = ref('estilo');
const nombreFirma = ref('');
const inicialesFirma = ref('');
const estiloSeleccionado = ref(0);
const canvasDibujoRef = ref(null);
const canvasDrawW = 420;
const canvasDrawH = 120;
let dibujando = false;

const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const estilos = [
  { font: "'Dancing Script', cursive" },
  { font: "'Great Vibes', cursive" },
  { font: "'Pacifico', cursive" },
  { font: "'Caveat', cursive" },
];

const textoParaEstilo = computed(() => {
  if (!modalFirma.tag) return nombreFirma.value;
  return modalFirma.tag.tipo === 'iniciales' ? inicialesFirma.value : nombreFirma.value;
});

const aplicarATodas = ref(false);

const puedeAdoptar = computed(() => {
  if (tabActiva.value === 'estilo') return !!textoParaEstilo.value.trim();
  return true; // dibujo - validamos en adoptar
});

// Cuántos tags de firma/iniciales sin asignar hay, excluyendo el tag actual
const tagsPendientesExtra = computed(() => {
  if (!sesion.value?.tags || !modalFirma.tag) return 0;
  return sesion.value.tags.filter(
    (t) => (t.tipo === 'firma' || t.tipo === 'iniciales') && !signaturas.value[t.id] && t.id !== modalFirma.tag.id
  ).length;
});

const puedeTerminar = computed(() => {
  if (!sesion.value?.tags) return false;
  const requeridos = sesion.value.tags.filter((t) => t.requerido && (t.tipo === 'firma' || t.tipo === 'iniciales'));
  return requeridos.every((t) => signaturas.value[t.id]);
});

function tipoLabel(tipo) {
  return { firma: 'Firma', iniciales: 'Iniciales', fecha: 'Fecha' }[tipo] || 'Firma';
}

// ===================== CARGAR SESIÓN =====================
async function cargarSesion() {
  cargando.value = true;
  try {
    const res = await fetch(`${API.value}/firma-interna/sesion/${token.value}`);
    const data = await res.json();
    if (!res.ok) { error.value = data.error || 'Enlace no válido'; return; }
    sesion.value = data;
    nombreFirma.value = data.nombre || '';
    inicialesFirma.value = calcularIniciales(data.nombre || '');
    if (!data.esperando && data.estado !== 'firmado') {
      await nextTick();
      await cargarPdf();
    }
  } catch (e) {
    error.value = 'No se pudo cargar el documento.';
  } finally {
    cargando.value = false;
  }
}

function calcularIniciales(nombre) {
  return nombre.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 3);
}

// ===================== PDF =====================
async function cargarPdf() {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const res = await fetch(`${API.value}/firma-interna/sesion/${token.value}/pdf`);
    if (!res.ok) throw new Error('No se pudo descargar el PDF');
    const buf = await res.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    numPaginas.value = pdfDoc.numPages;
    // Escala inicial según dispositivo
    const w = window.innerWidth;
    escala.value = w < 768 ? 0.74 : w < 1024 ? 0.94 : 1.14;
    await nextTick();
    for (let i = 1; i <= pdfDoc.numPages; i++) await renderizarPagina(i);
  } catch (e) {
    console.error('[PDF]', e);
  }
}

function setCanvasRef(p, el) {
  if (el) {
    canvasMap[p] = el;
    if (pdfDoc) renderizarPagina(p);
  } else {
    delete canvasMap[p];
  }
}

async function renderizarPagina(p) {
  if (!pdfDoc) return;
  const canvas = canvasMap[p];
  if (!canvas) return;
  if (renderTasks[p]) { try { renderTasks[p].cancel(); } catch {} delete renderTasks[p]; }
  const snap = escala.value;
  try {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: snap });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const task = page.render({ canvasContext: ctx, viewport });
    renderTasks[p] = task;
    await task.promise;
    delete renderTasks[p];
    dimensionesPagina.value = { ...dimensionesPagina.value, [p]: { w: viewport.width, h: viewport.height } };
  } catch (e) {
    if (e?.name === 'RenderingCancelledException') return;
  }
}

async function cambiarEscala(delta) {
  escala.value = Math.max(0.6, Math.min(2.5, escala.value + delta));
  await nextTick();
  for (const p of Object.keys(canvasMap).map(Number)) await renderizarPagina(p);
}

function tagsEnPagina(p) {
  return (sesion.value?.tags || []).filter((t) => Number(t.pagina) === p);
}

function estiloTag(t) {
  return {
    left: `${Number(t.x) * escala.value}px`,
    top: `${Number(t.y) * escala.value}px`,
    width: `${Number(t.ancho || 140) * escala.value}px`,
    height: `${Number(t.alto || 40) * escala.value}px`,
  };
}

function scrollToTag(t) {
  const el = pdfScrollRef.value?.querySelector(`[data-tag-id="${t.id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===================== MODAL =====================
function clickTag(t) {
  if (t.tipo === 'fecha') {
    // Fecha se aplica automáticamente
    signaturas.value = { ...signaturas.value, [t.id]: 'fecha' };
    return;
  }
  modalFirma.tag = t;
  modalFirma.abierto = true;
  tabActiva.value = 'estilo';
  estiloSeleccionado.value = 0;
  nextTick(() => limpiarDibujo());
}

function cerrarModal() {
  modalFirma.abierto = false;
  modalFirma.tag = null;
}

async function renderizarEstiloTexto(texto) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const font = estilos[estiloSeleccionado.value]?.font || "'Dancing Script', cursive";
  ctx.font = `500 40px ${font}`;
  ctx.fillStyle = '#1e3a5f';
  ctx.textBaseline = 'middle';
  const x = Math.max(8, (canvas.width - ctx.measureText(texto).width) / 2);
  ctx.fillText(texto, x, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

async function adoptarFirma() {
  let dataUrl = '';
  if (tabActiva.value === 'estilo') {
    dataUrl = await renderizarEstilo();
  } else {
    const canvas = canvasDibujoRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const vacio = !data.some((v, i) => i % 4 === 3 && v > 0);
    if (vacio) { alert('Por favor dibuja tu firma antes de continuar.'); return; }
    dataUrl = canvas.toDataURL('image/png');
  }

  if (!dataUrl || !modalFirma.tag) return;

  const nuevas = { ...signaturas.value, [modalFirma.tag.id]: dataUrl };

  if (aplicarATodas.value && sesion.value?.tags) {
    for (const t of sesion.value.tags) {
      if (t.tipo === 'fecha') continue;
      if (nuevas[t.id]) continue; // ya tiene firma, no modificar
      if (t.id === modalFirma.tag.id) continue;

      if (tabActiva.value === 'dibujar' || t.tipo === modalFirma.tag.tipo) {
        // Dibujo o mismo tipo → misma imagen
        nuevas[t.id] = dataUrl;
      } else if (t.tipo === 'iniciales') {
        nuevas[t.id] = await renderizarEstiloTexto(inicialesFirma.value || calcularIniciales(nombreFirma.value));
      } else {
        // tipo === 'firma'
        nuevas[t.id] = await renderizarEstiloTexto(nombreFirma.value);
      }
    }
  }

  signaturas.value = nuevas;
  cerrarModal();
}

async function renderizarEstilo() {
  await document.fonts.ready;
  const texto = textoParaEstilo.value.trim() || 'Firma';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const font = estilos[estiloSeleccionado.value]?.font || "'Dancing Script', cursive";
  ctx.font = `500 40px ${font}`;
  ctx.fillStyle = '#1e3a5f';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(texto);
  const x = Math.max(8, (canvas.width - metrics.width) / 2);
  ctx.fillText(texto, x, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

// ===================== DIBUJO =====================
function limpiarDibujo() {
  const canvas = canvasDibujoRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getPosCanvas(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function iniciarDibujo(e) {
  dibujando = true;
  const canvas = canvasDibujoRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pos = getPosCanvas(e, canvas);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function dibujar(e) {
  if (!dibujando) return;
  const canvas = canvasDibujoRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pos = getPosCanvas(e, canvas);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function terminarDibujo() { dibujando = false; }

function iniciarDibujoTouch(e) {
  const touch = e.touches[0];
  iniciarDibujo({ clientX: touch.clientX, clientY: touch.clientY });
}
function dibujarTouch(e) {
  const touch = e.touches[0];
  dibujar({ clientX: touch.clientX, clientY: touch.clientY });
}

// ===================== FINALIZAR =====================
async function finalizarFirma() {
  if (!puedeTerminar.value) return;
  enviandoFirma.value = true;
  try {
    // Preparar firmas: solo los tags de firma/iniciales (fecha se procesa en backend)
    const firmasPayload = {};
    for (const t of sesion.value.tags) {
      if (t.tipo !== 'fecha' && signaturas.value[t.id]) {
        firmasPayload[String(t.id)] = signaturas.value[t.id];
      }
    }
    const res = await fetch(`${API.value}/firma-interna/sesion/${token.value}/firmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmas: firmasPayload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al procesar la firma');
    completado.value = true;
    if (sesion.value) sesion.value = { ...sesion.value, estado: 'firmado' };
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    enviandoFirma.value = false;
  }
}

onMounted(cargarSesion);
</script>

<style scoped>
/* ─── LAYOUT ─── */
.firma-app {
  height: 100vh;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  font-family: Inter, Arial, sans-serif;
  color: #1e293b;
}

/* ─── HEADER ─── */
.firma-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.firma-header-left { display: flex; align-items: center; gap: 10px; }
.firma-logo { height: 28px; width: auto; }
.firma-header-title { font-size: 14px; font-weight: 600; color: #0f172a; }
.firma-header-right { display: flex; gap: 10px; align-items: center; }

/* ─── BUTTONS ─── */
.firma-btn-primary {
  background: #057d8c;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.firma-btn-primary:hover:not(:disabled) { background: #0a6571; }
.firma-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.firma-btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.firma-btn-secondary:hover { background: #f9fafb; }

/* ─── ESTADOS ─── */
.firma-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}
.firma-card-state {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 48px 40px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
.firma-card-state h2 { margin: 16px 0 8px; font-size: 22px; }
.firma-card-state p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; }
.firma-icon-ok, .firma-icon-error, .firma-icon-wait {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; margin: 0 auto;
}
.firma-icon-ok { background: #dcfce7; color: #16a34a; }
.firma-icon-error { background: #fee2e2; color: #dc2626; }
.firma-icon-wait { background: #fef3c7; color: #d97706; }
.firma-spinner {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid #e2e8f0; border-top-color: #057d8c;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── BODY ─── */
.firma-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: calc(100vh - 52px);
}

/* ─── PDF AREA ─── */
.firma-pdf-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f1f5f9;
}
.firma-pdf-toolbar {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  flex-shrink: 0;
}
.firma-pdf-btn {
  background: none; border: 1px solid #d1d5db; border-radius: 4px;
  width: 28px; height: 28px; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.firma-pdf-btn:disabled { opacity: .4; cursor: default; }
.firma-pdf-zoom { min-width: 44px; text-align: center; font-weight: 500; }
.firma-pdf-pages { margin-left: auto; color: #94a3b8; }
.firma-pdf-scroll {
  flex: 1; overflow: auto; padding: 24px;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.firma-pdf-page {
  position: relative;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  display: inline-block;
  line-height: 0;
}

/* ─── TAGS ─── */
.firma-tag {
  position: absolute;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow .15s;
}
.firma-tag--pendiente {
  background: rgba(0, 183, 198, 0.12);
  border: 2px dashed #057d8c;
}
.firma-tag--pendiente:hover { box-shadow: 0 0 0 3px rgba(0,183,198,0.25); }
.firma-tag--firmado {
  background: rgba(22, 163, 74, 0.06);
  border: 2px solid #16a34a;
}
.firma-tag--fecha {
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid #10b981;
  cursor: default;
}
.firma-tag-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: #057d8c;
  pointer-events: none;
}
.firma-tag-icon { font-size: 14px; }
.firma-tag-img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
.firma-tag-fecha-texto { font-size: 11px; color: #047857; font-weight: 500; padding: 2px 6px; }

/* ─── PANEL DERECHO ─── */
.firma-panel {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-left: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
}
.firma-panel-inner { padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
.firma-panel-section { }
.firma-panel-heading { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
.firma-panel-doc { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; }
.firma-panel-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin: 0 0 4px; }
.firma-panel-value { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0; }
.firma-panel-email { font-size: 12px; color: #64748b; margin: 2px 0 0; }
.firma-panel-steps { padding-left: 18px; margin: 0; }
.firma-panel-steps li { font-size: 12px; color: #475569; line-height: 1.6; margin-bottom: 4px; }
.firma-panel-progress { }
.firma-panel-tags { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.firma-panel-tag-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  border: 1px solid #e2e8f0; cursor: pointer;
  font-size: 12px; color: #475569;
  transition: background .1s;
}
.firma-panel-tag-item:hover { background: #f8fafc; }
.firma-panel-tag-item--ok { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
.firma-panel-tag-icon { font-size: 14px; }

/* ─── MODAL ─── */
.firma-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.firma-modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 520px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  display: flex; flex-direction: column;
  max-height: 90vh; overflow: hidden;
}
.firma-modal-header {
  padding: 20px 24px 0;
  display: flex; align-items: center; justify-content: space-between;
}
.firma-modal-header h3 { font-size: 18px; font-weight: 700; margin: 0; }
.firma-modal-close {
  background: none; border: none; font-size: 18px;
  cursor: pointer; color: #94a3b8; padding: 4px;
}
.firma-modal-close:hover { color: #1e293b; }
.firma-modal-body { padding: 16px 24px; overflow-y: auto; flex: 1; }
.firma-modal-fields { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; margin-bottom: 16px; }
.firma-modal-label { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
.firma-modal-input {
  width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; box-sizing: border-box;
}
.firma-modal-input:focus { outline: none; border-color: #057d8c; box-shadow: 0 0 0 3px rgba(0,183,198,0.2); }
.firma-modal-input--sm { width: 80px; }
.firma-modal-tabs { display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
.firma-modal-tab {
  padding: 8px 16px; font-size: 12px; font-weight: 600;
  background: none; border: none; border-bottom: 2px solid transparent;
  margin-bottom: -2px; cursor: pointer; color: #94a3b8;
  transition: color .15s, border-color .15s;
}
.firma-modal-tab--active { color: #057d8c; border-bottom-color: #057d8c; }

/* ─── ESTILOS ─── */
.firma-estilos { display: flex; flex-direction: column; gap: 8px; }
.firma-estilo-opcion {
  padding: 12px 16px; border: 2px solid #e2e8f0;
  border-radius: 10px; cursor: pointer;
  transition: border-color .15s, background .15s;
  min-height: 56px; display: flex; align-items: center;
}
.firma-estilo-opcion:hover { border-color: #62e0ee; background: #ecfeff; }
.firma-estilo-opcion--active { border-color: #057d8c; background: #cffafe; }

/* ─── DIBUJO ─── */
.firma-draw { display: flex; flex-direction: column; gap: 8px; }
.firma-draw-canvas {
  border: 2px solid #e2e8f0; border-radius: 10px;
  cursor: crosshair; background: #fff;
  display: block; width: 100%;
}
.firma-draw-clear {
  align-self: flex-end; background: none; border: 1px solid #d1d5db;
  border-radius: 6px; padding: 4px 12px; font-size: 12px;
  cursor: pointer; color: #64748b;
}
.firma-draw-clear:hover { background: #f1f5f9; }

/* ─── MODAL FOOTER ─── */
.firma-modal-footer {
  padding: 12px 24px 20px;
  display: flex; flex-direction: column; gap: 12px;
  border-top: 1px solid #f1f5f9;
}
.firma-modal-footer-actions {
  display: flex; justify-content: flex-end; gap: 10px;
}
.firma-apply-all {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; user-select: none;
  padding: 8px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}
.firma-apply-all span {
  font-size: 13px; color: #166534; font-weight: 500; line-height: 1.3;
}
.firma-apply-all-check {
  width: 16px; height: 16px; accent-color: #16a34a;
  flex-shrink: 0; cursor: pointer;
}

/* ─── PANEL TOGGLE (solo visible en móvil) ─── */
.firma-panel-toggle-btn {
  display: none;
  margin-left: auto;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.firma-panel-toggle-badge {
  background: #0a2c33;
  color: #fff;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 11px;
}
.firma-panel-drag-handle { display: none; }
.firma-panel-backdrop { display: none; }

/* ─── RESPONSIVE ─── */
@media (max-width: 767px) {
  .firma-app {
    height: 100dvh;
  }

  .firma-body {
    height: calc(100dvh - 52px);
    position: relative;
  }

  /* PDF ocupa toda la pantalla */
  .firma-pdf-area {
    width: 100%;
    flex: 1;
  }

  /* Botón de toggle visible */
  .firma-panel-toggle-btn {
    display: flex;
  }

  /* Backdrop oscuro */
  .firma-panel-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 199;
  }

  /* Panel como bottom drawer */
  .firma-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100% !important;
    min-width: unset !important;
    max-height: 75dvh;
    border-left: none;
    border-top: 1px solid #e2e8f0;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.15);
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 200;
    overflow-y: auto;
  }

  .firma-panel--open {
    transform: translateY(0);
  }

  /* Handle visual para cerrar */
  .firma-panel-drag-handle {
    display: block;
    width: 40px;
    height: 4px;
    background: #cbd5e1;
    border-radius: 2px;
    margin: 12px auto 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* PDF scroll con menos padding en móvil */
  .firma-pdf-scroll {
    padding: 8px;
    gap: 8px;
  }

  /* Modal más ancho en móvil */
  .firma-modal {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 95dvh;
  }
  .firma-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
}
</style>
