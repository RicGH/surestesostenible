<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-ink-500">{{ documentos.length }} documento(s)</p>
      <!-- <NuxtLink to="/admin/documentos/nuevo" class="btn-primary">
        <Icon name="plus" size="w-4 h-4" /> Nuevo documento
      </NuxtLink> -->
    </div>

    <div class="card-pad grid grid-cols-2 md:grid-cols-3 gap-3">
      <div class="md:col-span-2 relative">
        <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input v-model="filtros.q" placeholder="Buscar por nombre o descripción" class="input pl-9" />
      </div>
      <select v-model="filtros.estado" class="input">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="enviado">Enviado</option>
        <option value="parcial">Firma parcial</option>
        <option value="firmado">Firmado</option>
        <option value="declinado">Declinado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Firmantes</th>
            <th>Creado por</th>
            <th>Enviado</th>
            <th>Creado</th>
            <th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in documentos" :key="d.id">
            <td class="font-medium text-ink-800 max-w-xs">
              <div class="truncate">{{ d.nombre }}</div>
              <div class="text-xs text-ink-400 font-normal">{{ d.tipo === 'creado' ? 'Creado en editor' : 'PDF importado' }}</div>
            </td>
            <td><EstadoBadge :estado="d.estado" /></td>
            <td class="text-sm">
              <button
                class="text-brand-600 hover:text-brand-700 hover:underline font-medium"
                title="Ver firmantes"
                @click="verFirmantes(d)"
              >
                {{ d.total_firmados }} / {{ d.total_firmantes }}
              </button>
            </td>
            <td class="text-sm text-ink-600">{{ d.creado_por_nombre || '—' }}</td>
            <td class="text-ink-500 text-xs">{{ d.enviado_at || '—' }}</td>
            <td class="text-ink-500 text-xs">{{ d.created_at }}</td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton
                  v-if="d.estado === 'borrador'"
                  icon="edit"
                  tooltip="Editar y colocar tags"
                  variant="primary"
                  @click="abrirEditor(d)"
                />
                <IconButton
                  v-else
                  icon="eye"
                  tooltip="Ver detalle"
                  variant="primary"
                  @click="abrirEditor(d)"
                />
                <IconButton
                  v-if="['enviado','parcial'].includes(d.estado)"
                  icon="edit"
                  tooltip="Firmar en sitio"
                  variant="success"
                  @click="abrirFirma(d)"
                />
                <IconButton
                  v-if="['enviado','parcial'].includes(d.estado)"
                  icon="refresh"
                  tooltip="Refrescar estado en DocuSign"
                  variant="warning"
                  @click="refrescar(d)"
                />
                <IconButton
                  v-if="d.estado === 'firmado'"
                  icon="download"
                  tooltip="Descargar PDF firmado"
                  variant="success"
                  @click="descargar(d, true)"
                />
                <IconButton
                  icon="download"
                  tooltip="Descargar PDF original"
                  variant="primary"
                  @click="descargar(d, false)"
                />
                <IconButton
                  v-if="['borrador','firmado','declinado','cancelado','error'].includes(d.estado)"
                  icon="trash"
                  tooltip="Eliminar"
                  variant="danger"
                  @click="eliminar(d)"
                />
                <IconButton
                  v-if="['enviado','parcial'].includes(d.estado)"
                  icon="ban"
                  tooltip="Cancelar envío"
                  variant="danger"
                  @click="cancelar(d)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!documentos.length">
            <td colspan="7" class="py-12 text-center text-ink-400">Sin documentos. Crea uno con el botón "Nuevo documento".</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="cancelarModal.doc" title="Cancelar envío" size="md" @close="cancelarModal.doc = null">
      <div class="space-y-4">
        <p class="text-sm text-ink-600">
          Vas a cancelar el envío de <span class="font-medium text-ink-800">{{ cancelarModal.doc.nombre }}</span>.
          El documento se anulará en DocuSign y los firmantes ya no podrán firmarlo.
        </p>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Motivo de cancelación <span class="text-ink-400 font-normal">(opcional)</span></label>
          <textarea
            v-model="cancelarModal.motivo"
            rows="3"
            maxlength="500"
            class="input"
            placeholder="Ej: Datos incorrectos en el contrato"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cancelarModal.doc = null">Volver</button>
        <button class="btn-danger" :disabled="cancelarModal.enviando" @click="confirmarCancelar">
          {{ cancelarModal.enviando ? 'Cancelando…' : 'Cancelar envío' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="verFirm.doc" :title="`Firmantes: ${verFirm.doc.nombre}`" size="lg" @close="verFirm.doc = null">
      <div v-if="verFirm.cargando" class="py-8 text-center text-ink-400">Cargando…</div>
      <ul v-else-if="verFirm.firmantes.length" class="space-y-2">
        <li
          v-for="f in verFirm.firmantes"
          :key="f.id"
          class="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-3"
        >
          <div class="min-w-0">
            <div class="font-medium text-ink-800 truncate">
              {{ f.nombre }}
              <span class="text-xs font-normal text-ink-400 ml-1 capitalize">· {{ f.tipo }}</span>
            </div>
            <div class="text-xs text-ink-500 truncate">{{ f.email }} · orden {{ f.orden }}</div>
          </div>
          <EstadoBadge :estado="f.estado" />
        </li>
      </ul>
      <p v-else class="py-8 text-center text-ink-400">Este documento no tiene firmantes.</p>
    </Modal>

    <Modal v-if="firma.doc" :title="`Firmar: ${firma.doc.nombre}`" size="lg" @close="firma.doc = null">
      <p class="text-sm text-ink-600 mb-4">
        Firma electrónica dentro del sistema (ceremonia oficial de DocuSign, sin correo).
        Elige el firmante para abrir su pantalla de firma.
      </p>
      <div v-if="firma.cargando" class="py-8 text-center text-ink-400">Cargando firmantes…</div>
      <ul v-else class="space-y-2">
        <li
          v-for="f in firma.firmantes"
          :key="f.id"
          class="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-3"
        >
          <div class="min-w-0">
            <div class="font-medium text-ink-800 truncate">{{ f.nombre }}</div>
            <div class="text-xs text-ink-500 truncate">{{ f.email }} · orden {{ f.orden }}</div>
          </div>
          <div class="shrink-0">
            <EstadoBadge v-if="f.estado === 'firmado'" estado="firmado" />
            <button
              v-else
              class="btn-primary text-sm py-1.5"
              :disabled="firma.abriendo === f.id"
              @click="firmarAhora(f)"
            >
              {{ firma.abriendo === f.id ? 'Abriendo…' : 'Firmar ahora' }}
            </button>
          </div>
        </li>
      </ul>
    </Modal>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const { abrir: confirmar } = useConfirm();
const router = useRouter();
const documentos = ref([]);
const filtros = reactive({ q: '', estado: '' });
const firma = reactive({ doc: null, firmantes: [], cargando: false, abriendo: null });
const verFirm = reactive({ doc: null, firmantes: [], cargando: false });
const cancelarModal = reactive({ doc: null, motivo: '', enviando: false });

async function cargar() {
  const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const r = await api.get(`/documentos${qs ? '?' + qs : ''}`);
  documentos.value = r.data;
}
watch(filtros, cargar, { deep: true });
onMounted(cargar);

function abrirEditor(d) {
  const ruta = d.tipo === 'creado' ? 'editor-html' : 'editor';
  router.push(`/admin/documentos/${d.id}/${ruta}`);
}

async function verFirmantes(d) {
  verFirm.doc = d;
  verFirm.firmantes = [];
  verFirm.cargando = true;
  try {
    const r = await api.get(`/documentos/${d.id}`);
    verFirm.firmantes = r.firmantes || [];
  } catch (e) {
    toast.error('No se pudieron cargar los firmantes', e.message);
    verFirm.doc = null;
  } finally {
    verFirm.cargando = false;
  }
}

async function abrirFirma(d) {
  firma.doc = d;
  firma.firmantes = [];
  firma.cargando = true;
  try {
    const r = await api.get(`/documentos/${d.id}`);
    firma.firmantes = r.firmantes || [];
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
    firma.doc = null;
  } finally {
    firma.cargando = false;
  }
}

async function firmarAhora(f) {
  firma.abriendo = f.id;
  try {
    const r = await api.post(`/documentos/${firma.doc.id}/firmantes/${f.id}/url-firma`);
    window.open(r.url, '_blank');
  } catch (e) {
    toast.error('No se pudo abrir la firma', e.message);
  } finally {
    firma.abriendo = null;
  }
}

async function refrescar(d) {
  try {
    const r = await api.post(`/documentos/${d.id}/refrescar`);
    toast.success('Estado actualizado', r.estado);
    cargar();
  } catch (e) { toast.error('No se pudo refrescar', e.message); }
}

async function descargar(d, firmado) {
  try {
    await api.download(`/documentos/${d.id}/archivo${firmado ? '?firmado=1' : ''}`, `${d.nombre}${firmado ? '_firmado' : ''}.pdf`);
  } catch (e) { toast.error('No se pudo descargar', e.message); }
}

async function eliminar(d) {
  if (!await confirmar(`¿Eliminar el documento "${d.nombre}"? Esta acción no se puede deshacer.`, { titulo: 'Eliminar documento', accion: 'Eliminar' })) return;
  try {
    await api.del(`/documentos/${d.id}`);
    toast.success('Documento eliminado', d.nombre);
    cargar();
  } catch (e) { toast.error('No se pudo eliminar', e.message); }
}

function cancelar(d) {
  cancelarModal.doc = d;
  cancelarModal.motivo = '';
  cancelarModal.enviando = false;
}

async function confirmarCancelar() {
  cancelarModal.enviando = true;
  try {
    await api.post(`/documentos/${cancelarModal.doc.id}/cancelar`, {
      motivo: cancelarModal.motivo.trim() || undefined,
    });
    toast.success('Envío cancelado', cancelarModal.doc.nombre);
    cancelarModal.doc = null;
    cargar();
  } catch (e) {
    toast.error('No se pudo cancelar', e.message);
  } finally {
    cancelarModal.enviando = false;
  }
}
</script>
