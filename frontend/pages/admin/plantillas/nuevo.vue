<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <NuxtLink to="/admin/plantillas" class="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
      <Icon name="arrow-left" size="w-4 h-4" /> Volver a plantillas
    </NuxtLink>

    <div class="card-pad space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-ink-900">Nueva plantilla</h2>
        <p class="text-sm text-ink-500 mt-1">Define el contenido base. Después puedes editarla cuantas veces quieras.</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
        <input v-model="form.nombre" required maxlength="200" class="input" placeholder="Ej: Contrato estándar de prestación de servicios" />
      </div>
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Descripción (opcional)</label>
        <textarea v-model="form.descripcion" rows="2" class="input" />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <NuxtLink to="/admin/plantillas" class="btn-secondary">Cancelar</NuxtLink>
        <button class="btn-primary" :disabled="!puedeCrear || cargando" @click="crear">
          {{ cargando ? 'Creando...' : 'Crear y abrir editor' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();
const router = useRouter();
const form = reactive({ nombre: '', descripcion: '' });
const cargando = ref(false);
const error = ref('');
const puedeCrear = computed(() => form.nombre.trim().length >= 2);

async function crear() {
  if (!puedeCrear.value) return;
  cargando.value = true; error.value = '';
  try {
    const r = await api.post('/plantillas', {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      contenido_html: `<h1>${form.nombre.trim()}</h1><p></p>`,
      campos_json: [],
    });
    toast.success('Plantilla creada', form.nombre);
    router.push(`/admin/plantillas/${r.id}`);
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo crear', e.message);
  } finally {
    cargando.value = false;
  }
}
</script>
