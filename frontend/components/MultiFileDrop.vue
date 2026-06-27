<template>
  <div class="space-y-3">
    <!-- Grid de archivos (existentes del servidor + nuevos locales) -->
    <div
      v-if="existentes.length || files.length"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
    >
      <!-- Archivos ya guardados en el servidor (sólo lectura) -->
      <div
        v-for="e in existentes"
        :key="`ex-${e.id}`"
        class="group relative rounded-xl overflow-hidden border border-ink-200 bg-white shadow-sm"
      >
        <div class="aspect-[4/3] flex items-center justify-center overflow-hidden bg-ink-50">
          <img
            v-if="e.blobUrl && e.esImagen"
            :src="e.blobUrl"
            class="w-full h-full object-cover"
            :alt="e.nombre"
          />
          <div v-else class="flex flex-col items-center gap-1.5 p-2 text-center">
            <div :class="['w-10 h-10 rounded-lg grid place-items-center', e.esImagen ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500']">
              <Icon :name="e.esImagen ? 'image' : 'fileText'" size="w-6 h-6" />
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              {{ e.esImagen ? 'Imagen' : 'PDF' }}
            </span>
          </div>
        </div>
        <div class="px-2 py-1.5">
          <p class="text-[11px] font-medium text-ink-700 truncate">{{ e.nombre }}</p>
          <p class="text-[10px] text-ink-400 mt-0.5">Guardado</p>
        </div>
        <!-- Hover: ver archivo -->
        <a
          v-if="e.blobUrl"
          :href="e.blobUrl"
          target="_blank"
          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
        >
          <span class="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white text-xs font-medium">
            <Icon name="eye" size="w-3.5 h-3.5" /> Ver
          </span>
        </a>
      </div>

      <!-- Archivos nuevos seleccionados localmente -->
      <div
        v-for="(f, i) in files"
        :key="`new-${i}`"
        class="group relative rounded-xl overflow-hidden border border-emerald-200 bg-white shadow-sm"
      >
        <div class="aspect-[4/3] flex items-center justify-center overflow-hidden bg-emerald-50/40">
          <img
            v-if="previews[i] && esImagenFile(f)"
            :src="previews[i]"
            class="w-full h-full object-cover"
            :alt="f.name"
          />
          <div v-else class="flex flex-col items-center gap-1.5 p-2 text-center">
            <div class="w-10 h-10 rounded-lg grid place-items-center bg-red-50 text-red-500">
              <Icon name="fileText" size="w-6 h-6" />
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">PDF</span>
          </div>
        </div>
        <div class="px-2 py-1.5">
          <p class="text-[11px] font-medium text-ink-700 truncate">{{ f.name }}</p>
          <p class="text-[10px] text-emerald-600 mt-0.5">{{ tamano(f) }} · Nuevo</p>
        </div>
        <!-- Hover: quitar archivo -->
        <button
          type="button"
          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
          @click.prevent="quitar(i)"
        >
          <span class="bg-red-600/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white text-xs font-medium">
            <Icon name="trash" size="w-3.5 h-3.5" /> Quitar
          </span>
        </button>
      </div>
    </div>

    <!-- Zona de arrastre / selección -->
    <label
      :class="[
        'block relative rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/30',
      ]"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        :ref="(el) => (input = el)"
        type="file"
        :accept="accept"
        multiple
        class="sr-only"
        @change="onChange"
      />
      <div class="p-4 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-brand-50 text-brand-600">
          <Icon name="upload" size="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-ink-700">
            {{ files.length || existentes.length ? 'Agregar más archivos' : label }}
          </p>
          <p class="text-xs text-ink-400 mt-0.5">{{ hint || 'PDF o imagen · arrastra o haz clic' }}</p>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  existentes: { type: Array, default: () => [] },
  accept: { type: String, default: '*' },
  label: { type: String, required: true },
  hint: String,
  icon: { type: String, default: 'upload' },
});
const emit = defineEmits(['update:modelValue']);

const input = ref(null);
const dragging = ref(false);
const files = computed(() => props.modelValue);

// Previews para archivos locales
const previews = ref([]);

watch(
  files,
  (nuevos) => {
    // Revocar URLs anteriores
    previews.value.forEach((u) => u && URL.revokeObjectURL(u));
    previews.value = nuevos.map((f) =>
      esImagenFile(f) ? URL.createObjectURL(f) : null
    );
  },
  { immediate: true, deep: true }
);

onUnmounted(() => {
  previews.value.forEach((u) => u && URL.revokeObjectURL(u));
});

function esImagenFile(f) {
  return f?.type?.startsWith('image/');
}

function tamano(f) {
  const kb = f.size / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function agregar(nuevos) {
  if (!nuevos.length) return;
  const clave = (f) => `${f.name}_${f.size}`;
  const existentes = new Set(files.value.map(clave));
  const combinados = [...files.value, ...nuevos.filter((f) => !existentes.has(clave(f)))];
  emit('update:modelValue', combinados);
}

function onChange(e) {
  agregar(Array.from(e.target.files || []));
  if (input.value) input.value.value = '';
}

function onDrop(e) {
  dragging.value = false;
  agregar(Array.from(e.dataTransfer?.files || []));
}

function quitar(i) {
  const copia = files.value.slice();
  copia.splice(i, 1);
  emit('update:modelValue', copia);
}
</script>
