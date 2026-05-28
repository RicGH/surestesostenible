<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-ink-500">{{ documentos.length }} documento(s)</p>
      <NuxtLink to="/admin/documentos/nuevo" class="btn-primary">
        <Icon name="plus" size="w-4 h-4" /> Nuevo documento
      </NuxtLink>
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
            <td class="text-sm text-ink-600">{{ d.total_firmados }} / {{ d.total_firmantes }}</td>
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
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const router = useRouter();
const documentos = ref([]);
const filtros = reactive({ q: '', estado: '' });

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
  if (!confirm(`¿Eliminar el documento "${d.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api.del(`/documentos/${d.id}`);
    toast.success('Documento eliminado', d.nombre);
    cargar();
  } catch (e) { toast.error('No se pudo eliminar', e.message); }
}

async function cancelar(d) {
  const motivo = prompt('Motivo de cancelación (opcional):');
  if (motivo === null) return;
  try {
    await api.post(`/documentos/${d.id}/cancelar`, { motivo });
    toast.success('Envío cancelado', d.nombre);
    cargar();
  } catch (e) { toast.error('No se pudo cancelar', e.message); }
}
</script>
