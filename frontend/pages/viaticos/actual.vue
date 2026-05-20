<template>
  <div v-if="loading" class="card-pad text-ink-500">Cargando tus viáticos actuales...</div>

  <div v-else-if="!actual" class="card-pad max-w-2xl">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-ink-100 text-ink-500 grid place-items-center shrink-0">
        <Icon name="briefcase" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-ink-900">No tienes viáticos activos</h3>
        <p class="text-sm text-ink-600 mt-1">Cuando tengas una solicitud en curso aparecerá aquí.</p>
        <NuxtLink to="/viaticos/nueva" class="btn-primary mt-3">
          <Icon name="plus" size="w-4 h-4" /> Solicitar viáticos
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const router = useRouter();
const loading = ref(true);
const actual = ref(null);

onMounted(async () => {
  try {
    const r = await api.get('/viaticos/puedo-crear');
    if (r.activa) {
      await router.replace(`/viaticos/${r.activa.id}`);
      return;
    }
    actual.value = null;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>
