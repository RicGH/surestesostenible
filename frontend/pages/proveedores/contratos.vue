<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-ink-900">Mis contratos</h2>
      <p class="text-sm text-ink-500">Contratos asignados a tu cuenta. Puedes firmarlos en línea y descargarlos.</p>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Contrato</th>
            <th>Estado</th>
            <th>Firmas</th>
            <th>Enviado</th>
            <th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in contratos" :key="d.id">
            <td class="font-medium text-ink-800">{{ d.nombre }}</td>
            <td><EstadoBadge :estado="d.estado" /></td>
            <td class="text-sm text-ink-600">{{ d.total_firmados }} / {{ d.total_firmantes }}</td>
            <td class="text-ink-500 text-xs">{{ d.enviado_at || '—' }}</td>
            <td>
              <div class="flex gap-1 justify-center">
                <button
                  v-if="['enviado','parcial'].includes(d.estado) && d.mi_estado !== 'firmado'"
                  class="btn-primary text-sm py-1.5"
                  :disabled="firmando === d.id"
                  @click="firmar(d)"
                >
                  {{ firmando === d.id ? 'Abriendo…' : 'Firmar' }}
                </button>
                <span v-else-if="d.mi_estado === 'firmado'" class="text-xs text-emerald-600 font-medium px-2">Ya firmaste</span>
                <IconButton
                  v-if="d.estado === 'firmado'"
                  icon="download"
                  tooltip="Descargar contrato firmado"
                  variant="success"
                  @click="descargar(d, true)"
                />
                <IconButton
                  icon="download"
                  tooltip="Descargar contrato"
                  variant="primary"
                  @click="descargar(d, false)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!contratos.length">
            <td colspan="5" class="py-12 text-center text-ink-400">Aún no tienes contratos asignados.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const toast = useToast();
const contratos = ref([]);
const firmando = ref(null);

async function cargar() {
  try {
    const r = await api.get('/documentos/mis-contratos');
    contratos.value = r.data;
  } catch (e) {
    toast.error('No se pudieron cargar tus contratos', e.message);
  }
}
onMounted(cargar);

async function firmar(d) {
  firmando.value = d.id;
  try {
    const r = await api.post(`/documentos/mis-contratos/${d.id}/firmar`);
    window.open(r.url, '_blank');
  } catch (e) {
    toast.error('No se pudo abrir la firma', e.message);
  } finally {
    firmando.value = null;
  }
}

async function descargar(d, firmado) {
  try {
    await api.download(
      `/documentos/mis-contratos/${d.id}/archivo${firmado ? '?firmado=1' : ''}`,
      `${d.nombre}${firmado ? '_firmado' : ''}.pdf`
    );
  } catch (e) {
    toast.error('No se pudo descargar', e.message);
  }
}
</script>
