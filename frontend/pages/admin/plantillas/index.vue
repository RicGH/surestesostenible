<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-ink-500">{{ plantillas.length }} plantilla(s)</p>
      </div>
      <NuxtLink to="/admin/plantillas/nuevo" class="btn-primary">
        <Icon name="plus" size="w-4 h-4" /> Nueva plantilla
      </NuxtLink>
    </div>

    <div class="card-pad relative">
      <Icon name="search" size="w-4 h-4" class="absolute left-6 top-1/2 -translate-y-1/2 text-ink-400" />
      <input v-model="busqueda" placeholder="Buscar plantillas..." class="input pl-9" />
    </div>

    <div v-if="!plantillasFiltradas.length" class="card-pad text-center text-ink-400 py-12">
      <span v-if="!plantillas.length">No hay plantillas todavía. Crea la primera con "+ Nueva plantilla".</span>
      <span v-else>Sin resultados</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <NuxtLink
        v-for="p in plantillasFiltradas"
        :key="p.id"
        :to="`/admin/plantillas/${p.id}`"
        class="card p-4 hover:border-brand-300 hover:shadow-card transition-all"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg grid place-items-center shrink-0 bg-brand-50 text-brand-600">
            <Icon name="document" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-ink-900 truncate">{{ p.nombre }}</h3>
            <p v-if="p.descripcion" class="text-xs text-ink-500 mt-1 line-clamp-2">{{ p.descripcion }}</p>
            <p class="text-xs text-ink-400 mt-2">Actualizada {{ p.updated_at }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-1 mt-2">
          <IconButton icon="trash" tooltip="Eliminar" variant="danger" @click.stop.prevent="eliminar(p)" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const { abrir: confirmar } = useConfirm();
const plantillas = ref([]);
const busqueda = ref('');

const plantillasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  return plantillas.value.filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
});

async function cargar() {
  const r = await api.get('/plantillas');
  plantillas.value = r.data || [];
}

async function eliminar(p) {
  if (!await confirmar(`¿Eliminar la plantilla "${p.nombre}"? Esta acción no se puede deshacer.`, { titulo: 'Eliminar plantilla', accion: 'Eliminar' })) return;
  try {
    await api.del(`/plantillas/${p.id}`);
    toast.success('Plantilla eliminada', p.nombre);
    cargar();
  } catch (e) { toast.error('No se pudo eliminar', e.message); }
}

onMounted(cargar);
</script>
